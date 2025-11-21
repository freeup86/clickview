/**
 * ClickView Enterprise - Authentication Service
 *
 * Comprehensive authentication service with:
 * - Password-based authentication
 * - Multi-factor authentication (TOTP)
 * - Session management
 * - Password reset & email verification
 * - Account lockout protection
 * - Security event logging
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { query, transaction } from '../config/database';
import { logger } from '../config/logger';

const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

interface User {
  id: string;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  password_hash?: string;
  is_active: boolean;
  is_locked: boolean;
  locked_until?: Date;
  login_attempts: number;
  mfa_enabled: boolean;
  mfa_secret?: string;
  email_verified: boolean;
}

interface SessionData {
  user_id: string;
  ip_address?: string;
  user_agent?: string;
  device_type?: string;
  device_name?: string;
}

export class AuthService {
  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12; // Enterprise-grade strength
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify a password against a hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT access token
   */
  static generateAccessToken(userId: string, sessionId: string): string {
    return jwt.sign(
      {
        userId,
        sessionId,
        type: 'access'
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  /**
   * Generate JWT refresh token
   */
  static generateRefreshToken(userId: string, sessionId: string): string {
    return jwt.sign(
      {
        userId,
        sessionId,
        type: 'refresh'
      },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );
  }

  /**
   * Verify and decode JWT token
   */
  static verifyToken(token: string): { userId: string; sessionId: string; type: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return {
        userId: decoded.userId,
        sessionId: decoded.sessionId,
        type: decoded.type
      };
    } catch (error) {
      logger.error('Token verification failed', error);
      return null;
    }
  }

  /**
   * Register a new user
   */
  static async register(
    email: string,
    username: string,
    password: string,
    firstName?: string,
    lastName?: string
  ): Promise<{ user: User; sessionToken: string; refreshToken: string }> {
    return transaction(async (client) => {
      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [email.toLowerCase(), username.toLowerCase()]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('User with this email or username already exists');
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Create user
      const userResult = await client.query(
        `INSERT INTO users (email, username, password_hash, first_name, last_name, email_verified)
         VALUES ($1, $2, $3, $4, $5, false)
         RETURNING id, email, username, first_name, last_name, is_active, is_locked,
                   login_attempts, mfa_enabled, email_verified`,
        [email.toLowerCase(), username.toLowerCase(), passwordHash, firstName, lastName]
      );

      const user = userResult.rows[0];

      // Generate email verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await client.query(
        'UPDATE users SET password_reset_token = $1, password_reset_expires_at = $2 WHERE id = $3',
        [verificationToken, verificationExpires, user.id]
      );

      // Create session
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const refreshToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const sessionResult = await client.query(
        `INSERT INTO user_sessions (user_id, session_token, refresh_token, expires_at)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [user.id, sessionToken, refreshToken, expiresAt]
      );

      // Generate JWT tokens
      const accessToken = this.generateAccessToken(user.id, sessionResult.rows[0].id);

      // Log audit event
      await this.logAuditEvent(client, {
        userId: user.id,
        action: 'user_registered',
        resourceType: 'user',
        resourceId: user.id,
        description: 'New user registered'
      });

      logger.info('User registered', { userId: user.id, email, username });

      return {
        user,
        sessionToken: accessToken,
        refreshToken
      };
    });
  }

  /**
   * Authenticate user with email/username and password
   */
  static async login(
    emailOrUsername: string,
    password: string,
    sessionData: Partial<SessionData> = {}
  ): Promise<{
    user: User;
    sessionToken: string;
    refreshToken: string;
    requiresMfa: boolean;
    mfaToken?: string;
  }> {
    return transaction(async (client) => {
      // Find user
      const userResult = await client.query(
        `SELECT id, email, username, first_name, last_name, password_hash,
                is_active, is_locked, locked_until, login_attempts,
                mfa_enabled, mfa_secret, email_verified
         FROM users
         WHERE (email = $1 OR username = $1) AND deleted_at IS NULL`,
        [emailOrUsername.toLowerCase()]
      );

      if (userResult.rows.length === 0) {
        // Log failed login attempt
        await this.logSecurityEvent(client, {
          eventType: 'failed_login',
          details: { reason: 'user_not_found', emailOrUsername },
          ipAddress: sessionData.ip_address
        });
        throw new Error('Invalid credentials');
      }

      const user: User = userResult.rows[0];

      // Check if account is locked
      if (user.is_locked && user.locked_until && new Date(user.locked_until) > new Date()) {
        const minutesRemaining = Math.ceil(
          (new Date(user.locked_until).getTime() - Date.now()) / 60000
        );
        throw new Error(
          `Account is locked due to too many failed login attempts. Try again in ${minutesRemaining} minutes.`
        );
      }

      // Check if account is active
      if (!user.is_active) {
        throw new Error('Account is inactive. Please contact support.');
      }

      // Verify password
      if (!user.password_hash) {
        throw new Error('This account uses SSO. Please login with your SSO provider.');
      }

      const isValidPassword = await this.verifyPassword(password, user.password_hash);

      if (!isValidPassword) {
        // Increment login attempts
        const newAttempts = user.login_attempts + 1;
        const shouldLock = newAttempts >= MAX_LOGIN_ATTEMPTS;

        await client.query(
          `UPDATE users
           SET login_attempts = $1,
               is_locked = $2,
               locked_until = $3
           WHERE id = $4`,
          [
            newAttempts,
            shouldLock,
            shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60000) : null,
            user.id
          ]
        );

        // Log security event
        await this.logSecurityEvent(client, {
          eventType: 'failed_login',
          userId: user.id,
          details: {
            reason: 'invalid_password',
            attempts: newAttempts,
            locked: shouldLock
          },
          ipAddress: sessionData.ip_address,
          riskScore: shouldLock ? 80 : 50
        });

        if (shouldLock) {
          throw new Error(
            `Too many failed login attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes.`
          );
        }

        throw new Error('Invalid credentials');
      }

      // Reset login attempts on successful password verification
      await client.query(
        'UPDATE users SET login_attempts = 0, is_locked = false, locked_until = NULL WHERE id = $1',
        [user.id]
      );

      // Check if MFA is enabled
      if (user.mfa_enabled) {
        // Generate temporary MFA token
        const mfaToken = crypto.randomBytes(32).toString('hex');
        const mfaExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Store MFA token temporarily (you might want a separate table for this)
        await client.query(
          'UPDATE users SET password_reset_token = $1, password_reset_expires_at = $2 WHERE id = $3',
          [mfaToken, mfaExpires, user.id]
        );

        return {
          user,
          sessionToken: '',
          refreshToken: '',
          requiresMfa: true,
          mfaToken
        };
      }

      // Create session
      const session = await this.createSession(client, user.id, sessionData);

      // Update last login
      await client.query(
        'UPDATE users SET last_login_at = CURRENT_TIMESTAMP, last_login_ip = $1 WHERE id = $2',
        [sessionData.ip_address || null, user.id]
      );

      // Log successful login
      await this.logAuditEvent(client, {
        userId: user.id,
        sessionId: session.sessionId,
        action: 'user_login',
        resourceType: 'user',
        resourceId: user.id,
        description: 'User logged in successfully',
        ipAddress: sessionData.ip_address
      });

      logger.info('User logged in', { userId: user.id, email: user.email });

      return {
        user,
        sessionToken: session.accessToken,
        refreshToken: session.refreshToken,
        requiresMfa: false
      };
    });
  }

  /**
   * Verify MFA code and complete login
   */
  static async verifyMfaAndLogin(
    mfaToken: string,
    mfaCode: string,
    sessionData: Partial<SessionData> = {}
  ): Promise<{ user: User; sessionToken: string; refreshToken: string }> {
    return transaction(async (client) => {
      // Find user with MFA token
      const userResult = await client.query(
        `SELECT id, email, username, first_name, last_name, mfa_secret,
                password_reset_token, password_reset_expires_at
         FROM users
         WHERE password_reset_token = $1
           AND password_reset_expires_at > CURRENT_TIMESTAMP
           AND deleted_at IS NULL`,
        [mfaToken]
      );

      if (userResult.rows.length === 0) {
        throw new Error('Invalid or expired MFA token');
      }

      const user = userResult.rows[0];

      // Verify TOTP code
      const isValid = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: 'base32',
        token: mfaCode,
        window: 2 // Allow 2 time steps before/after (60 seconds)
      });

      if (!isValid) {
        await this.logSecurityEvent(client, {
          eventType: 'failed_mfa',
          userId: user.id,
          details: { reason: 'invalid_code' },
          ipAddress: sessionData.ip_address,
          riskScore: 60
        });
        throw new Error('Invalid MFA code');
      }

      // Clear MFA token
      await client.query(
        'UPDATE users SET password_reset_token = NULL, password_reset_expires_at = NULL WHERE id = $1',
        [user.id]
      );

      // Create session
      const session = await this.createSession(client, user.id, sessionData);

      // Update last login
      await client.query(
        'UPDATE users SET last_login_at = CURRENT_TIMESTAMP, last_login_ip = $1 WHERE id = $2',
        [sessionData.ip_address || null, user.id]
      );

      // Log successful MFA login
      await this.logAuditEvent(client, {
        userId: user.id,
        sessionId: session.sessionId,
        action: 'user_login_mfa',
        resourceType: 'user',
        resourceId: user.id,
        description: 'User completed MFA and logged in',
        ipAddress: sessionData.ip_address
      });

      logger.info('User completed MFA login', { userId: user.id });

      return {
        user,
        sessionToken: session.accessToken,
        refreshToken: session.refreshToken
      };
    });
  }

  /**
   * Create a new session
   */
  private static async createSession(
    client: any,
    userId: string,
    sessionData: Partial<SessionData> = {}
  ): Promise<{ sessionId: string; accessToken: string; refreshToken: string }> {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const sessionResult = await client.query(
      `INSERT INTO user_sessions (
        user_id, session_token, refresh_token, expires_at,
        ip_address, user_agent, device_type, device_name
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id`,
      [
        userId,
        sessionToken,
        refreshToken,
        expiresAt,
        sessionData.ip_address || null,
        sessionData.user_agent || null,
        sessionData.device_type || null,
        sessionData.device_name || null
      ]
    );

    const sessionId = sessionResult.rows[0].id;
    const accessToken = this.generateAccessToken(userId, sessionId);

    return { sessionId, accessToken, refreshToken };
  }

  /**
   * Logout user and revoke session
   */
  static async logout(sessionToken: string): Promise<void> {
    const decoded = this.verifyToken(sessionToken);
    if (!decoded) {
      throw new Error('Invalid session token');
    }

    await query(
      `UPDATE user_sessions
       SET is_active = false, revoked_at = CURRENT_TIMESTAMP, revoked_reason = 'user_logout'
       WHERE id = $1`,
      [decoded.sessionId]
    );

    // Log audit event
    await this.logAuditEvent(null, {
      userId: decoded.userId,
      sessionId: decoded.sessionId,
      action: 'user_logout',
      resourceType: 'user',
      resourceId: decoded.userId,
      description: 'User logged out'
    });

    logger.info('User logged out', { userId: decoded.userId, sessionId: decoded.sessionId });
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    const sessionResult = await query(
      `SELECT id, user_id, expires_at, is_active
       FROM user_sessions
       WHERE refresh_token = $1`,
      [refreshToken]
    );

    if (sessionResult.rows.length === 0) {
      throw new Error('Invalid refresh token');
    }

    const session = sessionResult.rows[0];

    if (!session.is_active) {
      throw new Error('Session has been revoked');
    }

    if (new Date(session.expires_at) < new Date()) {
      throw new Error('Refresh token has expired');
    }

    // Update last activity
    await query(
      'UPDATE user_sessions SET last_activity_at = CURRENT_TIMESTAMP WHERE id = $1',
      [session.id]
    );

    const accessToken = this.generateAccessToken(session.user_id, session.id);

    return { accessToken };
  }

  /**
   * Enable MFA for a user
   */
  static async enableMfa(
    userId: string
  ): Promise<{ secret: string; qrCodeUrl: string; backupCodes: string[] }> {
    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: 'ClickView Enterprise',
      length: 32
    });

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // Hash backup codes before storing
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => this.hashPassword(code))
    );

    // Store encrypted secret and backup codes
    await query(
      'UPDATE users SET mfa_secret = $1, mfa_backup_codes = $2 WHERE id = $3',
      [secret.base32, hashedBackupCodes, userId]
    );

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    logger.info('MFA enabled for user', { userId });

    return {
      secret: secret.base32,
      qrCodeUrl,
      backupCodes
    };
  }

  /**
   * Confirm MFA setup
   */
  static async confirmMfa(userId: string, code: string): Promise<void> {
    const userResult = await query(
      'SELECT mfa_secret FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const { mfa_secret } = userResult.rows[0];

    const isValid = speakeasy.totp.verify({
      secret: mfa_secret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (!isValid) {
      throw new Error('Invalid MFA code');
    }

    // Enable MFA
    await query('UPDATE users SET mfa_enabled = true WHERE id = $1', [userId]);

    await this.logAuditEvent(null, {
      userId,
      action: 'mfa_enabled',
      resourceType: 'user',
      resourceId: userId,
      description: 'User enabled MFA'
    });

    logger.info('MFA confirmed for user', { userId });
  }

  /**
   * Disable MFA
   */
  static async disableMfa(userId: string, password: string): Promise<void> {
    const userResult = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const { password_hash } = userResult.rows[0];

    // Verify password before disabling MFA
    const isValid = await this.verifyPassword(password, password_hash);
    if (!isValid) {
      throw new Error('Invalid password');
    }

    await query(
      'UPDATE users SET mfa_enabled = false, mfa_secret = NULL, mfa_backup_codes = NULL WHERE id = $1',
      [userId]
    );

    await this.logAuditEvent(null, {
      userId,
      action: 'mfa_disabled',
      resourceType: 'user',
      resourceId: userId,
      description: 'User disabled MFA'
    });

    logger.info('MFA disabled for user', { userId });
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(email: string): Promise<void> {
    const userResult = await query(
      'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      // Don't reveal if user exists
      logger.info('Password reset requested for non-existent email', { email });
      return;
    }

    const userId = userResult.rows[0].id;

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires_at = $2 WHERE id = $3',
      [resetToken, resetExpires, userId]
    );

    await this.logAuditEvent(null, {
      userId,
      action: 'password_reset_requested',
      resourceType: 'user',
      resourceId: userId,
      description: 'Password reset requested'
    });

    logger.info('Password reset token generated', { userId, email });

    // TODO: Send email with reset link
    // await EmailService.sendPasswordResetEmail(email, resetToken);
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    const userResult = await query(
      `SELECT id FROM users
       WHERE password_reset_token = $1
         AND password_reset_expires_at > CURRENT_TIMESTAMP
         AND deleted_at IS NULL`,
      [token]
    );

    if (userResult.rows.length === 0) {
      throw new Error('Invalid or expired reset token');
    }

    const userId = userResult.rows[0].id;

    // Hash new password
    const passwordHash = await this.hashPassword(newPassword);

    // Update password and clear reset token
    await query(
      `UPDATE users
       SET password_hash = $1,
           password_reset_token = NULL,
           password_reset_expires_at = NULL,
           password_changed_at = CURRENT_TIMESTAMP,
           login_attempts = 0,
           is_locked = false,
           locked_until = NULL
       WHERE id = $2`,
      [passwordHash, userId]
    );

    // Revoke all existing sessions for security
    await query(
      `UPDATE user_sessions
       SET is_active = false, revoked_at = CURRENT_TIMESTAMP, revoked_reason = 'password_reset'
       WHERE user_id = $1 AND is_active = true`,
      [userId]
    );

    await this.logAuditEvent(null, {
      userId,
      action: 'password_reset',
      resourceType: 'user',
      resourceId: userId,
      description: 'Password reset completed'
    });

    logger.info('Password reset completed', { userId });
  }

  /**
   * Validate session
   */
  static async validateSession(sessionToken: string): Promise<{ user: User; sessionId: string }> {
    const decoded = this.verifyToken(sessionToken);
    if (!decoded) {
      throw new Error('Invalid session token');
    }

    const sessionResult = await query(
      `SELECT us.id, us.user_id, us.expires_at, us.is_active,
              u.id, u.email, u.username, u.first_name, u.last_name,
              u.is_active, u.is_locked, u.mfa_enabled, u.email_verified
       FROM user_sessions us
       JOIN users u ON us.user_id = u.id
       WHERE us.id = $1 AND us.is_active = true AND u.deleted_at IS NULL`,
      [decoded.sessionId]
    );

    if (sessionResult.rows.length === 0) {
      throw new Error('Session not found or inactive');
    }

    const row = sessionResult.rows[0];

    if (new Date(row.expires_at) < new Date()) {
      throw new Error('Session has expired');
    }

    if (!row.is_active || row.is_locked) {
      throw new Error('User account is inactive or locked');
    }

    // Update last activity
    await query(
      'UPDATE user_sessions SET last_activity_at = CURRENT_TIMESTAMP WHERE id = $1',
      [decoded.sessionId]
    );

    return {
      user: {
        id: row.user_id,
        email: row.email,
        username: row.username,
        first_name: row.first_name,
        last_name: row.last_name,
        is_active: row.is_active,
        is_locked: row.is_locked,
        locked_until: null,
        login_attempts: 0,
        mfa_enabled: row.mfa_enabled,
        email_verified: row.email_verified,
        password_hash: undefined
      },
      sessionId: decoded.sessionId
    };
  }

  /**
   * Log audit event
   */
  private static async logAuditEvent(
    client: any,
    event: {
      userId?: string;
      organizationId?: string;
      sessionId?: string;
      action: string;
      resourceType?: string;
      resourceId?: string;
      description?: string;
      ipAddress?: string;
      userAgent?: string;
      oldValues?: any;
      newValues?: any;
      metadata?: any;
      severity?: string;
    }
  ): Promise<void> {
    const queryFn = client ? client.query.bind(client) : query;

    await queryFn(
      `INSERT INTO audit_logs (
        user_id, organization_id, session_id, action, resource_type, resource_id,
        description, ip_address, user_agent, old_values, new_values, metadata, severity
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        event.userId || null,
        event.organizationId || null,
        event.sessionId || null,
        event.action,
        event.resourceType || null,
        event.resourceId || null,
        event.description || null,
        event.ipAddress || null,
        event.userAgent || null,
        event.oldValues ? JSON.stringify(event.oldValues) : null,
        event.newValues ? JSON.stringify(event.newValues) : null,
        event.metadata ? JSON.stringify(event.metadata) : null,
        event.severity || 'info'
      ]
    );
  }

  /**
   * Log security event
   */
  private static async logSecurityEvent(
    client: any,
    event: {
      eventType: string;
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      location?: any;
      details?: any;
      riskScore?: number;
    }
  ): Promise<void> {
    const queryFn = client ? client.query.bind(client) : query;

    await queryFn(
      `INSERT INTO security_events (
        event_type, user_id, ip_address, user_agent, location, details, risk_score
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        event.eventType,
        event.userId || null,
        event.ipAddress || null,
        event.userAgent || null,
        event.location ? JSON.stringify(event.location) : null,
        event.details ? JSON.stringify(event.details) : null,
        event.riskScore || 0
      ]
    );
  }
}
