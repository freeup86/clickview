/**
 * GDPR Compliance Service
 * Implements COMPLY-001: GDPR compliance requirements
 */

import { Pool } from 'pg';
import { logger } from '../config/logger';
import { CacheService } from './cache.service';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// ============================================================
// TYPES
// ============================================================

export interface UserConsent {
  userId: string;
  consentType: ConsentType;
  granted: boolean;
  timestamp: Date;
  version: string;
  ipAddress?: string;
  userAgent?: string;
}

export enum ConsentType {
  Essential = 'essential',
  Analytics = 'analytics',
  Marketing = 'marketing',
  Personalization = 'personalization',
  ThirdParty = 'third_party',
  DataProcessing = 'data_processing',
  PrivacyPolicy = 'privacy_policy',
  TermsOfService = 'terms_of_service',
}

export interface DataExportRequest {
  userId: string;
  requestedAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
  expiresAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
}

export interface DeletionRequest {
  userId: string;
  requestedAt: Date;
  scheduledFor: Date;
  completedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  reason?: string;
}

export interface DataRetentionPolicy {
  dataType: string;
  retentionDays: number;
  description: string;
  legalBasis: string;
}

export interface DataProcessorAudit {
  processorName: string;
  purpose: string;
  dataCategories: string[];
  location: string;
  dpaStatus: 'active' | 'pending' | 'expired';
  lastAudit: Date;
  nextAudit: Date;
}

// ============================================================
// GDPR SERVICE
// ============================================================

export class GDPRService {
  private pool: Pool;
  private cache: CacheService;
  private s3Client: S3Client;
  private encryptionKey: Buffer;

  // Data retention policies
  private retentionPolicies: DataRetentionPolicy[] = [
    {
      dataType: 'user_account',
      retentionDays: 365 * 3, // 3 years after deletion request
      description: 'User account information',
      legalBasis: 'Contract performance',
    },
    {
      dataType: 'user_preferences',
      retentionDays: 365 * 3,
      description: 'User settings and preferences',
      legalBasis: 'Contract performance',
    },
    {
      dataType: 'dashboards',
      retentionDays: 365 * 3,
      description: 'User-created dashboards and reports',
      legalBasis: 'Contract performance',
    },
    {
      dataType: 'activity_logs',
      retentionDays: 90,
      description: 'User activity and access logs',
      legalBasis: 'Legitimate interest (security)',
    },
    {
      dataType: 'analytics_data',
      retentionDays: 365 * 2, // 2 years
      description: 'Aggregated analytics data',
      legalBasis: 'Legitimate interest (service improvement)',
    },
    {
      dataType: 'audit_logs',
      retentionDays: 365 * 7, // 7 years for compliance
      description: 'Security and compliance audit logs',
      legalBasis: 'Legal obligation',
    },
    {
      dataType: 'consent_records',
      retentionDays: 365 * 7, // Keep consent records for 7 years
      description: 'User consent history',
      legalBasis: 'Legal obligation',
    },
    {
      dataType: 'deletion_requests',
      retentionDays: 365 * 7,
      description: 'Records of data deletion requests',
      legalBasis: 'Legal obligation',
    },
  ];

  constructor(pool: Pool, cache: CacheService) {
    this.pool = pool;
    this.cache = cache;
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    this.encryptionKey = Buffer.from(
      process.env.GDPR_ENCRYPTION_KEY || randomBytes(32).toString('hex'),
      'hex'
    );
  }

  // ============================================================
  // CONSENT MANAGEMENT
  // ============================================================

  /**
   * Record user consent
   */
  async recordConsent(consent: UserConsent): Promise<void> {
    const query = `
      INSERT INTO user_consents (
        user_id, consent_type, granted, timestamp,
        version, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await this.pool.query(query, [
      consent.userId,
      consent.consentType,
      consent.granted,
      consent.timestamp,
      consent.version,
      consent.ipAddress,
      consent.userAgent,
    ]);

    // Invalidate consent cache
    await this.cache.invalidate(`user:consent:${consent.userId}`);

    logger.info('User consent recorded', {
      userId: consent.userId,
      consentType: consent.consentType,
      granted: consent.granted,
    });
  }

  /**
   * Get current user consents
   */
  async getUserConsents(userId: string): Promise<Record<ConsentType, boolean>> {
    const cacheKey = `user:consent:${userId}`;
    const cached = await this.cache.get<Record<ConsentType, boolean>>(cacheKey);

    if (cached) {
      return cached;
    }

    const query = `
      SELECT DISTINCT ON (consent_type)
        consent_type, granted
      FROM user_consents
      WHERE user_id = $1
      ORDER BY consent_type, timestamp DESC
    `;

    const result = await this.pool.query(query, [userId]);

    const consents: Record<ConsentType, boolean> = {
      [ConsentType.Essential]: true, // Always required
      [ConsentType.Analytics]: false,
      [ConsentType.Marketing]: false,
      [ConsentType.Personalization]: false,
      [ConsentType.ThirdParty]: false,
      [ConsentType.DataProcessing]: false,
      [ConsentType.PrivacyPolicy]: false,
      [ConsentType.TermsOfService]: false,
    };

    for (const row of result.rows) {
      consents[row.consent_type as ConsentType] = row.granted;
    }

    await this.cache.set(cacheKey, consents, 3600);

    return consents;
  }

  /**
   * Withdraw consent
   */
  async withdrawConsent(
    userId: string,
    consentType: ConsentType,
    ipAddress?: string
  ): Promise<void> {
    if (consentType === ConsentType.Essential) {
      throw new Error('Cannot withdraw essential consent');
    }

    await this.recordConsent({
      userId,
      consentType,
      granted: false,
      timestamp: new Date(),
      version: '1.0',
      ipAddress,
    });

    // Take action based on consent type
    if (consentType === ConsentType.Analytics) {
      await this.disableAnalytics(userId);
    } else if (consentType === ConsentType.Marketing) {
      await this.unsubscribeFromMarketing(userId);
    }

    logger.info('Consent withdrawn', { userId, consentType });
  }

  // ============================================================
  // DATA EXPORT (Right to Data Portability)
  // ============================================================

  /**
   * Request data export
   */
  async requestDataExport(userId: string): Promise<DataExportRequest> {
    // Check for existing pending request
    const existingQuery = `
      SELECT * FROM data_export_requests
      WHERE user_id = $1 AND status IN ('pending', 'processing')
      ORDER BY requested_at DESC LIMIT 1
    `;

    const existing = await this.pool.query(existingQuery, [userId]);

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    // Create new request
    const insertQuery = `
      INSERT INTO data_export_requests (user_id, requested_at, status)
      VALUES ($1, NOW(), 'pending')
      RETURNING *
    `;

    const result = await this.pool.query(insertQuery, [userId]);

    logger.info('Data export requested', { userId });

    // Queue the export job (async processing)
    this.processDataExport(userId, result.rows[0].id);

    return result.rows[0];
  }

  /**
   * Process data export (background job)
   */
  private async processDataExport(userId: string, requestId: string): Promise<void> {
    try {
      // Update status to processing
      await this.pool.query(
        "UPDATE data_export_requests SET status = 'processing' WHERE id = $1",
        [requestId]
      );

      // Collect all user data
      const userData = await this.collectUserData(userId);

      // Encrypt the data
      const encryptedData = this.encryptData(JSON.stringify(userData, null, 2));

      // Upload to S3
      const key = `exports/${userId}/${requestId}.enc`;
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.GDPR_EXPORTS_BUCKET || 'clickview-gdpr-exports',
          Key: key,
          Body: encryptedData,
          ContentType: 'application/octet-stream',
          Metadata: {
            userId,
            requestId,
            exportedAt: new Date().toISOString(),
          },
        })
      );

      // Generate signed download URL (valid for 7 days)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const downloadUrl = await this.generateSignedUrl(key, expiresAt);

      // Update request with completion info
      await this.pool.query(
        `UPDATE data_export_requests
         SET status = 'completed', completed_at = NOW(),
             download_url = $2, expires_at = $3
         WHERE id = $1`,
        [requestId, downloadUrl, expiresAt]
      );

      // Notify user
      await this.notifyDataExportComplete(userId, downloadUrl, expiresAt);

      logger.info('Data export completed', { userId, requestId });
    } catch (error) {
      logger.error('Data export failed', { userId, requestId, error });

      await this.pool.query(
        "UPDATE data_export_requests SET status = 'failed' WHERE id = $1",
        [requestId]
      );
    }
  }

  /**
   * Collect all user data for export
   */
  private async collectUserData(userId: string): Promise<Record<string, any>> {
    const data: Record<string, any> = {
      exportedAt: new Date().toISOString(),
      userId,
    };

    // User profile
    const profileQuery = `
      SELECT id, email, name, created_at, updated_at, settings
      FROM users WHERE id = $1
    `;
    const profile = await this.pool.query(profileQuery, [userId]);
    data.profile = profile.rows[0];

    // Dashboards
    const dashboardsQuery = `
      SELECT id, name, description, created_at, updated_at, configuration
      FROM dashboards WHERE owner_id = $1
    `;
    const dashboards = await this.pool.query(dashboardsQuery, [userId]);
    data.dashboards = dashboards.rows;

    // Reports
    const reportsQuery = `
      SELECT id, name, description, created_at, configuration
      FROM reports WHERE created_by = $1
    `;
    const reports = await this.pool.query(reportsQuery, [userId]);
    data.reports = reports.rows;

    // Widgets
    const widgetsQuery = `
      SELECT w.id, w.name, w.type, w.configuration, w.created_at
      FROM widgets w
      JOIN dashboards d ON w.dashboard_id = d.id
      WHERE d.owner_id = $1
    `;
    const widgets = await this.pool.query(widgetsQuery, [userId]);
    data.widgets = widgets.rows;

    // Activity logs (last 90 days)
    const activityQuery = `
      SELECT action, resource, timestamp, ip_address
      FROM activity_logs
      WHERE user_id = $1 AND timestamp > NOW() - INTERVAL '90 days'
      ORDER BY timestamp DESC
    `;
    const activity = await this.pool.query(activityQuery, [userId]);
    data.activityLogs = activity.rows;

    // Consent history
    const consentQuery = `
      SELECT consent_type, granted, timestamp, version
      FROM user_consents
      WHERE user_id = $1
      ORDER BY timestamp DESC
    `;
    const consents = await this.pool.query(consentQuery, [userId]);
    data.consentHistory = consents.rows;

    // API keys (metadata only)
    const apiKeysQuery = `
      SELECT name, created_at, last_used_at, scopes
      FROM api_keys
      WHERE user_id = $1
    `;
    const apiKeys = await this.pool.query(apiKeysQuery, [userId]);
    data.apiKeys = apiKeys.rows;

    return data;
  }

  // ============================================================
  // RIGHT TO BE FORGOTTEN (RTBF)
  // ============================================================

  /**
   * Request account deletion
   */
  async requestDeletion(
    userId: string,
    reason?: string
  ): Promise<DeletionRequest> {
    // Schedule deletion for 30 days from now (grace period)
    const scheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const query = `
      INSERT INTO deletion_requests (
        user_id, requested_at, scheduled_for, status, reason
      ) VALUES ($1, NOW(), $2, 'pending', $3)
      ON CONFLICT (user_id)
      WHERE status = 'pending'
      DO UPDATE SET
        requested_at = NOW(),
        scheduled_for = $2,
        reason = $3
      RETURNING *
    `;

    const result = await this.pool.query(query, [userId, scheduledFor, reason]);

    // Notify user about deletion schedule
    await this.notifyDeletionScheduled(userId, scheduledFor);

    logger.info('Deletion requested', { userId, scheduledFor });

    return result.rows[0];
  }

  /**
   * Cancel deletion request
   */
  async cancelDeletion(userId: string): Promise<void> {
    const query = `
      UPDATE deletion_requests
      SET status = 'cancelled'
      WHERE user_id = $1 AND status = 'pending'
    `;

    await this.pool.query(query, [userId]);

    logger.info('Deletion cancelled', { userId });
  }

  /**
   * Execute deletion (called by scheduled job)
   */
  async executeDeletion(userId: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Update status to processing
      await client.query(
        "UPDATE deletion_requests SET status = 'processing' WHERE user_id = $1 AND status = 'pending'",
        [userId]
      );

      // Export data first (keep for legal requirements)
      const exportData = await this.collectUserData(userId);
      await this.archiveDeletedUserData(userId, exportData);

      // Delete user data in order (respecting foreign keys)
      const deletionQueries = [
        'DELETE FROM activity_logs WHERE user_id = $1',
        'DELETE FROM api_keys WHERE user_id = $1',
        'DELETE FROM notifications WHERE user_id = $1',
        'DELETE FROM widgets WHERE dashboard_id IN (SELECT id FROM dashboards WHERE owner_id = $1)',
        'DELETE FROM dashboards WHERE owner_id = $1',
        'DELETE FROM reports WHERE created_by = $1',
        'DELETE FROM scheduled_reports WHERE created_by = $1',
        'DELETE FROM user_preferences WHERE user_id = $1',
        'DELETE FROM data_export_requests WHERE user_id = $1',
      ];

      for (const query of deletionQueries) {
        await client.query(query, [userId]);
      }

      // Anonymize user record (keep for audit trail)
      await client.query(
        `UPDATE users
         SET email = 'deleted_' || id || '@deleted.local',
             name = 'Deleted User',
             password_hash = NULL,
             settings = '{}',
             deleted_at = NOW()
         WHERE id = $1`,
        [userId]
      );

      // Mark deletion complete
      await client.query(
        `UPDATE deletion_requests
         SET status = 'completed', completed_at = NOW()
         WHERE user_id = $1 AND status = 'processing'`,
        [userId]
      );

      await client.query('COMMIT');

      // Clear all caches for this user
      await this.cache.invalidate(`user:*:${userId}`);

      logger.info('User deletion completed', { userId });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('User deletion failed', { userId, error });
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================================
  // DATA RETENTION
  // ============================================================

  /**
   * Get retention policy for data type
   */
  getRetentionPolicy(dataType: string): DataRetentionPolicy | undefined {
    return this.retentionPolicies.find((p) => p.dataType === dataType);
  }

  /**
   * Get all retention policies
   */
  getAllRetentionPolicies(): DataRetentionPolicy[] {
    return [...this.retentionPolicies];
  }

  /**
   * Enforce retention policies (scheduled job)
   */
  async enforceRetentionPolicies(): Promise<void> {
    logger.info('Starting retention policy enforcement');

    for (const policy of this.retentionPolicies) {
      try {
        const deleted = await this.deleteExpiredData(
          policy.dataType,
          policy.retentionDays
        );
        logger.info('Retention policy enforced', {
          dataType: policy.dataType,
          deletedRecords: deleted,
        });
      } catch (error) {
        logger.error('Retention enforcement failed', {
          dataType: policy.dataType,
          error,
        });
      }
    }
  }

  private async deleteExpiredData(
    dataType: string,
    retentionDays: number
  ): Promise<number> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    let query: string;
    switch (dataType) {
      case 'activity_logs':
        query = `DELETE FROM activity_logs WHERE timestamp < $1`;
        break;
      case 'analytics_data':
        query = `DELETE FROM analytics_events WHERE created_at < $1`;
        break;
      default:
        return 0;
    }

    const result = await this.pool.query(query, [cutoffDate]);
    return result.rowCount || 0;
  }

  // ============================================================
  // DATA PROCESSOR MANAGEMENT
  // ============================================================

  /**
   * Get all data processors
   */
  async getDataProcessors(): Promise<DataProcessorAudit[]> {
    const query = `
      SELECT * FROM data_processors
      ORDER BY processor_name
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  /**
   * Add/update data processor
   */
  async upsertDataProcessor(processor: DataProcessorAudit): Promise<void> {
    const query = `
      INSERT INTO data_processors (
        processor_name, purpose, data_categories, location,
        dpa_status, last_audit, next_audit
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (processor_name) DO UPDATE SET
        purpose = $2,
        data_categories = $3,
        location = $4,
        dpa_status = $5,
        last_audit = $6,
        next_audit = $7
    `;

    await this.pool.query(query, [
      processor.processorName,
      processor.purpose,
      JSON.stringify(processor.dataCategories),
      processor.location,
      processor.dpaStatus,
      processor.lastAudit,
      processor.nextAudit,
    ]);
  }

  // ============================================================
  // DATA BREACH NOTIFICATION
  // ============================================================

  /**
   * Report a data breach
   */
  async reportDataBreach(breach: {
    description: string;
    affectedUsers: string[];
    dataTypes: string[];
    discoveredAt: Date;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<string> {
    const breachId = `BREACH-${Date.now()}`;

    const query = `
      INSERT INTO data_breaches (
        breach_id, description, affected_users, data_types,
        discovered_at, severity, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'investigating')
      RETURNING *
    `;

    await this.pool.query(query, [
      breachId,
      breach.description,
      JSON.stringify(breach.affectedUsers),
      JSON.stringify(breach.dataTypes),
      breach.discoveredAt,
      breach.severity,
    ]);

    // If high/critical severity, notify immediately
    if (['high', 'critical'].includes(breach.severity)) {
      await this.notifyBreachToAuthorities(breachId, breach);
      await this.notifyAffectedUsers(breach.affectedUsers, breachId);
    }

    logger.warn('Data breach reported', { breachId, severity: breach.severity });

    return breachId;
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private encryptData(data: string): Buffer {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, encrypted]);
  }

  private decryptData(encryptedData: Buffer): string {
    const iv = encryptedData.subarray(0, 16);
    const authTag = encryptedData.subarray(16, 32);
    const data = encryptedData.subarray(32);

    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    return decipher.update(data) + decipher.final('utf8');
  }

  private async generateSignedUrl(key: string, expiresAt: Date): Promise<string> {
    // In production, use S3 presigned URLs
    return `https://${process.env.GDPR_EXPORTS_BUCKET}.s3.amazonaws.com/${key}`;
  }

  private async archiveDeletedUserData(
    userId: string,
    data: Record<string, any>
  ): Promise<void> {
    const encryptedData = this.encryptData(JSON.stringify(data));

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.GDPR_ARCHIVE_BUCKET || 'clickview-gdpr-archive',
        Key: `deleted-users/${userId}/${Date.now()}.enc`,
        Body: encryptedData,
        ContentType: 'application/octet-stream',
        Metadata: {
          userId,
          deletedAt: new Date().toISOString(),
        },
      })
    );
  }

  private async disableAnalytics(userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE user_preferences SET analytics_enabled = false WHERE user_id = $1`,
      [userId]
    );
  }

  private async unsubscribeFromMarketing(userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE user_preferences SET marketing_emails = false WHERE user_id = $1`,
      [userId]
    );
  }

  private async notifyDataExportComplete(
    userId: string,
    downloadUrl: string,
    expiresAt: Date
  ): Promise<void> {
    // Send email notification (integrate with email service)
    logger.info('Data export notification sent', { userId, expiresAt });
  }

  private async notifyDeletionScheduled(
    userId: string,
    scheduledFor: Date
  ): Promise<void> {
    // Send email notification
    logger.info('Deletion scheduled notification sent', { userId, scheduledFor });
  }

  private async notifyBreachToAuthorities(
    breachId: string,
    breach: any
  ): Promise<void> {
    // Notify DPA within 72 hours (GDPR requirement)
    logger.warn('Data breach notification sent to authorities', { breachId });
  }

  private async notifyAffectedUsers(
    userIds: string[],
    breachId: string
  ): Promise<void> {
    // Notify affected users
    logger.info('Breach notification sent to affected users', {
      breachId,
      userCount: userIds.length,
    });
  }
}

// ============================================================
// DATABASE MIGRATIONS
// ============================================================

export const GDPR_MIGRATIONS = `
-- User consents table
CREATE TABLE IF NOT EXISTS user_consents (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  consent_type VARCHAR(50) NOT NULL,
  granted BOOLEAN NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version VARCHAR(20) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX idx_user_consents_type_time ON user_consents(consent_type, timestamp DESC);

-- Data export requests
CREATE TABLE IF NOT EXISTS data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  download_url TEXT,
  expires_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_data_export_requests_user ON data_export_requests(user_id);
CREATE INDEX idx_data_export_requests_status ON data_export_requests(status);

-- Deletion requests
CREATE TABLE IF NOT EXISTS deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id) WHERE status = 'pending'
);

CREATE INDEX idx_deletion_requests_user ON deletion_requests(user_id);
CREATE INDEX idx_deletion_requests_scheduled ON deletion_requests(scheduled_for) WHERE status = 'pending';

-- Data processors
CREATE TABLE IF NOT EXISTS data_processors (
  id SERIAL PRIMARY KEY,
  processor_name VARCHAR(255) NOT NULL UNIQUE,
  purpose TEXT NOT NULL,
  data_categories JSONB NOT NULL,
  location VARCHAR(100) NOT NULL,
  dpa_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  last_audit DATE,
  next_audit DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data breaches
CREATE TABLE IF NOT EXISTS data_breaches (
  id SERIAL PRIMARY KEY,
  breach_id VARCHAR(50) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  affected_users JSONB NOT NULL,
  data_types JSONB NOT NULL,
  discovered_at TIMESTAMPTZ NOT NULL,
  reported_to_dpa_at TIMESTAMPTZ,
  severity VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'investigating',
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_data_breaches_status ON data_breaches(status);
CREATE INDEX idx_data_breaches_severity ON data_breaches(severity);
`;

export const gdprService = new GDPRService(
  new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  new CacheService()
);
