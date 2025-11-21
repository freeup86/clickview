/**
 * Authorization Service - Advanced RBAC/ABAC Implementation
 *
 * Features:
 * - Row-Level Security (RLS)
 * - Column-Level Security (CLS)
 * - Dynamic Data Masking
 * - Attribute-Based Access Control (ABAC)
 * - Permission Inheritance
 * - Resource Sensitivity Classification
 * - Temporary Delegations
 */

import { Pool, PoolClient } from 'pg';
import { pool } from '../config/database';

// ===================================================================
// TYPES & INTERFACES
// ===================================================================

export interface AuthorizationContext {
  userId: string;
  sessionId: string;
  organizationId?: string;
  roles: string[];
  permissions: string[];
  attributes: Record<string, any>;
  environment: {
    ipAddress: string;
    userAgent: string;
    timestamp: Date;
    deviceType?: string;
  };
}

export interface PermissionCheck {
  resourceType: string;
  resourceId: string;
  action: string;
}

export interface ABACCondition {
  attribute: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'greaterThan' | 'lessThan' | 'between' | 'in' | 'notIn';
  value: any;
}

export interface ABACPolicy {
  id: string;
  name: string;
  resourceType: string;
  action: string;
  effect: 'allow' | 'deny';
  conditions: {
    all?: ABACCondition[];
    any?: ABACCondition[];
  };
  priority: number;
}

export interface DataMaskingRule {
  id: string;
  name: string;
  maskingType: 'full' | 'partial' | 'email' | 'phone' | 'credit_card' | 'ssn' | 'custom' | 'hash' | 'null';
  config: Record<string, any>;
  customFunction?: string;
  bypassRoles: string[];
  bypassUsers: string[];
}

export interface SensitivityLevel {
  level: 'public' | 'internal' | 'confidential' | 'restricted' | 'critical';
  complianceTags: string[];
  requiresMfa: boolean;
  allowedIpRanges?: string[];
}

// ===================================================================
// AUTHORIZATION SERVICE
// ===================================================================

export class AuthorizationService {

  /**
   * Check if user has permission to perform action on resource
   */
  static async checkPermission(
    context: AuthorizationContext,
    check: PermissionCheck
  ): Promise<boolean> {
    const client = await pool.connect();

    try {
      // 1. Check direct permissions (fastest)
      const directPermission = await this.checkDirectPermission(
        client,
        context.userId,
        check.resourceType,
        check.resourceId,
        check.action
      );

      if (directPermission) return true;

      // 2. Check role-based permissions
      const rolePermission = await this.checkRolePermissions(
        client,
        context.roles,
        check.resourceType,
        check.action
      );

      if (rolePermission) return true;

      // 3. Check inherited permissions
      const inheritedPermission = await this.checkInheritedPermissions(
        client,
        context.userId,
        check.resourceType,
        check.resourceId,
        check.action
      );

      if (inheritedPermission) return true;

      // 4. Check ABAC policies
      const abacDecision = await this.evaluateABACPolicies(
        client,
        context,
        check
      );

      return abacDecision === 'allow';
    } finally {
      client.release();
    }
  }

  /**
   * Check direct user permission (from materialized_permissions table)
   */
  private static async checkDirectPermission(
    client: PoolClient,
    userId: string,
    resourceType: string,
    resourceId: string,
    permission: string
  ): Promise<boolean> {
    const result = await client.query(
      `SELECT EXISTS(
        SELECT 1 FROM materialized_permissions
        WHERE user_id = $1
          AND resource_type = $2
          AND resource_id = $3
          AND permission = $4
          AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      ) as has_permission`,
      [userId, resourceType, resourceId, permission]
    );

    return result.rows[0].has_permission;
  }

  /**
   * Check role-based permissions
   */
  private static async checkRolePermissions(
    client: PoolClient,
    roleIds: string[],
    resourceType: string,
    action: string
  ): Promise<boolean> {
    if (roleIds.length === 0) return false;

    const permissionName = `${resourceType}:${action}`;

    const result = await client.query(
      `SELECT EXISTS(
        SELECT 1 FROM roles
        WHERE id = ANY($1::uuid[])
          AND $2 = ANY(permissions)
      ) as has_permission`,
      [roleIds, permissionName]
    );

    return result.rows[0].has_permission;
  }

  /**
   * Check inherited permissions
   */
  private static async checkInheritedPermissions(
    client: PoolClient,
    userId: string,
    resourceType: string,
    resourceId: string,
    permission: string
  ): Promise<boolean> {
    // Find parent resources through inheritance chain
    const result = await client.query(
      `WITH RECURSIVE permission_tree AS (
        -- Base case: direct permission
        SELECT resource_type, resource_id, 1 as depth
        FROM materialized_permissions
        WHERE user_id = $1
          AND permission = $4
          AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)

        UNION ALL

        -- Recursive case: inherited permissions
        SELECT
          pi.child_resource_type,
          pi.child_resource_id,
          pt.depth + 1
        FROM permission_tree pt
        JOIN permission_inheritance pi ON
          pt.resource_type = pi.parent_resource_type AND
          pt.resource_id = pi.parent_resource_id
        WHERE pi.is_enabled = true
          AND (pi.max_depth = -1 OR pt.depth < pi.max_depth)
      )
      SELECT EXISTS(
        SELECT 1 FROM permission_tree
        WHERE resource_type = $2
          AND resource_id = $3
      ) as has_inherited_permission`,
      [userId, resourceType, resourceId, permission]
    );

    return result.rows[0].has_inherited_permission;
  }

  /**
   * Evaluate ABAC policies for a permission check
   */
  private static async evaluateABACPolicies(
    client: PoolClient,
    context: AuthorizationContext,
    check: PermissionCheck
  ): Promise<'allow' | 'deny'> {
    // Check cache first
    const cached = await this.getABACCacheDecision(
      client,
      context.userId,
      check.resourceType,
      check.resourceId,
      check.action
    );

    if (cached) return cached;

    // Fetch applicable policies (ordered by priority DESC)
    const result = await client.query(
      `SELECT id, name, effect, conditions, priority
       FROM abac_policies
       WHERE is_enabled = true
         AND resource_type = $1
         AND action = $2
         AND (organization_id IS NULL OR organization_id = $3)
       ORDER BY priority DESC, created_at ASC`,
      [check.resourceType, check.action, context.organizationId || null]
    );

    let decision: 'allow' | 'deny' = 'deny'; // Default deny
    const matchedPolicies: string[] = [];

    // Evaluate policies in priority order
    for (const row of result.rows) {
      const policy: ABACPolicy = {
        id: row.id,
        name: row.name,
        resourceType: check.resourceType,
        action: check.action,
        effect: row.effect,
        conditions: row.conditions,
        priority: row.priority
      };

      const matches = await this.evaluatePolicyConditions(
        client,
        policy.conditions,
        context,
        check.resourceId
      );

      if (matches) {
        matchedPolicies.push(policy.id);

        // Deny takes precedence over allow
        if (policy.effect === 'deny') {
          decision = 'deny';
          break; // Stop on first deny
        } else if (policy.effect === 'allow') {
          decision = 'allow';
          // Continue checking for deny policies with higher priority
        }
      }
    }

    // Cache the decision
    await this.cacheABACDecision(
      client,
      context.userId,
      check.resourceType,
      check.resourceId,
      check.action,
      decision,
      matchedPolicies,
      context
    );

    return decision;
  }

  /**
   * Evaluate ABAC policy conditions
   */
  private static async evaluatePolicyConditions(
    client: PoolClient,
    conditions: { all?: ABACCondition[]; any?: ABACCondition[] },
    context: AuthorizationContext,
    resourceId: string
  ): Promise<boolean> {
    // Build attribute map
    const attributes = await this.buildAttributeMap(client, context, resourceId);

    // Evaluate 'all' conditions (AND logic)
    if (conditions.all && conditions.all.length > 0) {
      const allMatch = conditions.all.every(condition =>
        this.evaluateCondition(condition, attributes)
      );
      if (!allMatch) return false;
    }

    // Evaluate 'any' conditions (OR logic)
    if (conditions.any && conditions.any.length > 0) {
      const anyMatch = conditions.any.some(condition =>
        this.evaluateCondition(condition, attributes)
      );
      if (!anyMatch) return false;
    }

    return true;
  }

  /**
   * Evaluate a single ABAC condition
   */
  private static evaluateCondition(
    condition: ABACCondition,
    attributes: Record<string, any>
  ): boolean {
    const actualValue = this.getNestedAttribute(attributes, condition.attribute);
    const expectedValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return actualValue === expectedValue;

      case 'notEquals':
        return actualValue !== expectedValue;

      case 'contains':
        return String(actualValue).includes(String(expectedValue));

      case 'notContains':
        return !String(actualValue).includes(String(expectedValue));

      case 'greaterThan':
        return actualValue > expectedValue;

      case 'lessThan':
        return actualValue < expectedValue;

      case 'between':
        return Array.isArray(expectedValue) &&
               actualValue >= expectedValue[0] &&
               actualValue <= expectedValue[1];

      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(actualValue);

      case 'notIn':
        return Array.isArray(expectedValue) && !expectedValue.includes(actualValue);

      default:
        return false;
    }
  }

  /**
   * Get nested attribute from object using dot notation
   */
  private static getNestedAttribute(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Build complete attribute map for ABAC evaluation
   */
  private static async buildAttributeMap(
    client: PoolClient,
    context: AuthorizationContext,
    resourceId: string
  ): Promise<Record<string, any>> {
    // Get resource attributes
    const resourceResult = await client.query(
      `SELECT data_classification FROM resource_sensitivity
       WHERE resource_id = $1`,
      [resourceId]
    );

    const resourceAttributes = resourceResult.rows[0]?.data_classification || {};

    return {
      user: {
        id: context.userId,
        roles: context.roles,
        permissions: context.permissions,
        organizationId: context.organizationId,
        ...context.attributes
      },
      environment: {
        ipAddress: context.environment.ipAddress,
        userAgent: context.environment.userAgent,
        timestamp: context.environment.timestamp,
        deviceType: context.environment.deviceType,
        time: context.environment.timestamp.getHours() + ':' + context.environment.timestamp.getMinutes(),
        day: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][context.environment.timestamp.getDay()]
      },
      resource: resourceAttributes
    };
  }

  /**
   * Get cached ABAC decision
   */
  private static async getABACCacheDecision(
    client: PoolClient,
    userId: string,
    resourceType: string,
    resourceId: string,
    action: string
  ): Promise<'allow' | 'deny' | null> {
    const result = await client.query(
      `SELECT decision FROM abac_policy_cache
       WHERE user_id = $1
         AND resource_type = $2
         AND resource_id = $3
         AND action = $4
         AND expires_at > CURRENT_TIMESTAMP`,
      [userId, resourceType, resourceId, action]
    );

    return result.rows[0]?.decision || null;
  }

  /**
   * Cache ABAC decision
   */
  private static async cacheABACDecision(
    client: PoolClient,
    userId: string,
    resourceType: string,
    resourceId: string,
    action: string,
    decision: 'allow' | 'deny',
    matchedPolicies: string[],
    context: AuthorizationContext
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5); // Cache for 5 minutes

    await client.query(
      `INSERT INTO abac_policy_cache
       (user_id, resource_type, resource_id, action, decision, matched_policies, expires_at, context_snapshot)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id, resource_type, resource_id, action)
       DO UPDATE SET
         decision = $5,
         matched_policies = $6,
         evaluated_at = CURRENT_TIMESTAMP,
         expires_at = $7,
         context_snapshot = $8`,
      [
        userId,
        resourceType,
        resourceId,
        action,
        decision,
        matchedPolicies,
        expiresAt,
        JSON.stringify(context)
      ]
    );
  }

  /**
   * Apply data masking to field value
   */
  static async maskField(
    value: any,
    maskingRule: DataMaskingRule,
    context: AuthorizationContext
  ): Promise<any> {
    // Check if user bypasses masking
    if (maskingRule.bypassUsers.includes(context.userId) ||
        context.roles.some(role => maskingRule.bypassRoles.includes(role))) {
      return value;
    }

    if (value === null || value === undefined) return value;

    const strValue = String(value);

    switch (maskingRule.maskingType) {
      case 'full':
        const maskChar = maskingRule.config.mask_char || '*';
        return maskChar.repeat(strValue.length);

      case 'partial':
        return this.maskPartial(
          strValue,
          maskingRule.config.show_first || 0,
          maskingRule.config.show_last || 0,
          maskingRule.config.mask_char || '*'
        );

      case 'email':
        return this.maskEmail(strValue);

      case 'phone':
        return this.maskPhone(strValue, maskingRule.config.show_last || 4);

      case 'credit_card':
        return this.maskCreditCard(strValue, maskingRule.config.show_last || 4);

      case 'ssn':
        return this.maskSSN(strValue, maskingRule.config.show_last || 4);

      case 'hash':
        const crypto = await import('crypto');
        const algorithm = maskingRule.config.algorithm || 'sha256';
        return crypto.createHash(algorithm).update(strValue).digest('hex');

      case 'null':
        return null;

      case 'custom':
        // Custom masking function would be implemented here
        // For security, this would need to be carefully controlled
        return strValue;

      default:
        return value;
    }
  }

  /**
   * Mask partial string
   */
  private static maskPartial(
    value: string,
    showFirst: number,
    showLast: number,
    maskChar: string
  ): string {
    if (value.length <= showFirst + showLast) {
      return maskChar.repeat(value.length);
    }

    const first = value.substring(0, showFirst);
    const last = value.substring(value.length - showLast);
    const middle = maskChar.repeat(value.length - showFirst - showLast);

    return first + middle + last;
  }

  /**
   * Mask email address
   */
  private static maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return email;

    const [domainName, tld] = domain.split('.');

    const maskedLocal = this.maskPartial(local, 1, 0, '*');
    const maskedDomain = this.maskPartial(domainName, 1, 0, '*');

    return `${maskedLocal}@${maskedDomain}.${tld}`;
  }

  /**
   * Mask phone number
   */
  private static maskPhone(phone: string, showLast: number): string {
    const digits = phone.replace(/\D/g, '');
    const maskedDigits = '*'.repeat(Math.max(0, digits.length - showLast)) +
                         digits.substring(digits.length - showLast);

    // Preserve formatting
    let result = phone;
    let digitIndex = 0;
    for (let i = 0; i < result.length; i++) {
      if (/\d/.test(result[i])) {
        result = result.substring(0, i) + maskedDigits[digitIndex] + result.substring(i + 1);
        digitIndex++;
      }
    }

    return result;
  }

  /**
   * Mask credit card number
   */
  private static maskCreditCard(cc: string, showLast: number): string {
    const digits = cc.replace(/\D/g, '');
    return '*'.repeat(Math.max(0, digits.length - showLast)) +
           digits.substring(digits.length - showLast);
  }

  /**
   * Mask SSN
   */
  private static maskSSN(ssn: string, showLast: number): string {
    const cleaned = ssn.replace(/\D/g, '');
    const masked = '*'.repeat(Math.max(0, cleaned.length - showLast)) +
                   cleaned.substring(cleaned.length - showLast);

    // Format as XXX-XX-1234
    if (masked.length === 9) {
      return `${masked.substring(0, 3)}-${masked.substring(3, 5)}-${masked.substring(5)}`;
    }

    return masked;
  }

  /**
   * Get column-level permissions for a table
   */
  static async getColumnPermissions(
    context: AuthorizationContext,
    tableName: string,
    schemaName: string = 'public'
  ): Promise<Map<string, string>> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        `SELECT column_name, permission_level
         FROM column_permissions
         WHERE schema_name = $1
           AND table_name = $2
           AND is_enabled = true
           AND (user_id = $3 OR role_id = ANY($4::uuid[]))
         ORDER BY
           CASE permission_level
             WHEN 'write' THEN 1
             WHEN 'read' THEN 2
             WHEN 'masked' THEN 3
             WHEN 'none' THEN 4
           END`,
        [schemaName, tableName, context.userId, context.roles]
      );

      const permissions = new Map<string, string>();

      for (const row of result.rows) {
        // Take the most permissive level for each column
        if (!permissions.has(row.column_name)) {
          permissions.set(row.column_name, row.permission_level);
        }
      }

      return permissions;
    } finally {
      client.release();
    }
  }

  /**
   * Get data masking rules for columns
   */
  static async getColumnMaskingRules(
    tableName: string,
    schemaName: string = 'public'
  ): Promise<Map<string, DataMaskingRule>> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        `SELECT
           cm.column_name,
           dmr.id,
           dmr.name,
           dmr.masking_type,
           dmr.config,
           dmr.custom_function,
           dmr.bypass_roles,
           dmr.bypass_users
         FROM column_masking cm
         JOIN data_masking_rules dmr ON cm.masking_rule_id = dmr.id
         WHERE cm.schema_name = $1
           AND cm.table_name = $2
           AND cm.is_enabled = true
           AND dmr.is_enabled = true`,
        [schemaName, tableName]
      );

      const rules = new Map<string, DataMaskingRule>();

      for (const row of result.rows) {
        rules.set(row.column_name, {
          id: row.id,
          name: row.name,
          maskingType: row.masking_type,
          config: row.config,
          customFunction: row.custom_function,
          bypassRoles: row.bypass_roles || [],
          bypassUsers: row.bypass_users || []
        });
      }

      return rules;
    } finally {
      client.release();
    }
  }

  /**
   * Check resource sensitivity and access requirements
   */
  static async checkSensitivityAccess(
    context: AuthorizationContext,
    resourceType: string,
    resourceId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        `SELECT
           sensitivity_level,
           compliance_tags,
           requires_mfa,
           allowed_ip_ranges,
           allowed_time_windows
         FROM resource_sensitivity
         WHERE resource_type = $1 AND resource_id = $2`,
        [resourceType, resourceId]
      );

      if (result.rows.length === 0) {
        // No sensitivity classification = public access
        return { allowed: true };
      }

      const sensitivity = result.rows[0];

      // Check MFA requirement
      if (sensitivity.requires_mfa && !context.attributes.mfa_verified) {
        return { allowed: false, reason: 'MFA required for this resource' };
      }

      // Check IP restrictions
      if (sensitivity.allowed_ip_ranges && sensitivity.allowed_ip_ranges.length > 0) {
        const ipAllowed = this.checkIpInRanges(
          context.environment.ipAddress,
          sensitivity.allowed_ip_ranges
        );

        if (!ipAllowed) {
          return { allowed: false, reason: 'IP address not in allowed range' };
        }
      }

      // Check time window restrictions
      if (sensitivity.allowed_time_windows) {
        const timeAllowed = this.checkTimeWindows(
          context.environment.timestamp,
          sensitivity.allowed_time_windows
        );

        if (!timeAllowed) {
          return { allowed: false, reason: 'Access not allowed at this time' };
        }
      }

      return { allowed: true };
    } finally {
      client.release();
    }
  }

  /**
   * Check if IP is in allowed ranges
   */
  private static checkIpInRanges(ip: string, ranges: string[]): boolean {
    // Simplified IP check - production would use proper CIDR matching
    return ranges.some(range => {
      if (range.includes('/')) {
        // CIDR notation - would need proper library
        return ip.startsWith(range.split('/')[0].split('.').slice(0, 3).join('.'));
      }
      return ip === range;
    });
  }

  /**
   * Check if current time is within allowed windows
   */
  private static checkTimeWindows(timestamp: Date, windows: any): boolean {
    const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][timestamp.getDay()];
    const currentTime = timestamp.getHours() * 60 + timestamp.getMinutes();

    for (const window of windows) {
      if (window.days && !window.days.includes(currentDay)) {
        continue;
      }

      const [startHour, startMin] = window.start.split(':').map(Number);
      const [endHour, endMin] = window.end.split(':').map(Number);

      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;

      if (currentTime >= startTime && currentTime <= endTime) {
        return true;
      }
    }

    return false;
  }

  /**
   * Refresh materialized permissions for user
   */
  static async refreshUserPermissions(userId: string): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query('SELECT refresh_user_permissions($1)', [userId]);
    } finally {
      client.release();
    }
  }

  /**
   * Clear ABAC policy cache
   */
  static async clearPolicyCache(userId?: string): Promise<void> {
    const client = await pool.connect();

    try {
      if (userId) {
        await client.query('DELETE FROM abac_policy_cache WHERE user_id = $1', [userId]);
      } else {
        await client.query('DELETE FROM abac_policy_cache WHERE expires_at < CURRENT_TIMESTAMP');
      }
    } finally {
      client.release();
    }
  }
}
