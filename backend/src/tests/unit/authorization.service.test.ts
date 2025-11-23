/**
 * Authorization Service Unit Tests
 * Tests for AUTH-002 RBAC/ABAC implementation
 */

import { AuthorizationService } from '../../services/authorization.service';

jest.mock('../../config/database');

describe('AuthorizationService', () => {
  let authService: AuthorizationService;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = {
      query: jest.fn(),
    };
    authService = new AuthorizationService(mockDb);
  });

  describe('checkPermission', () => {
    it('should grant permission for user with direct permission', async () => {
      const context = {
        userId: 'user-123',
        roles: ['user'],
        permissions: ['dashboard:read'],
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [{ permission: 'dashboard:read' }],
      });

      const result = await authService.checkPermission(context, {
        resource: 'dashboard',
        action: 'read',
      });

      expect(result).toBe(true);
    });

    it('should deny permission for user without permission', async () => {
      const context = {
        userId: 'user-123',
        roles: ['user'],
        permissions: [],
      };

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await authService.checkPermission(context, {
        resource: 'admin',
        action: 'write',
      });

      expect(result).toBe(false);
    });

    it('should grant permission based on role', async () => {
      const context = {
        userId: 'user-123',
        roles: ['admin'],
        permissions: [],
      };

      mockDb.query.mockResolvedValueOnce({ rows: [] }); // Direct perms
      mockDb.query.mockResolvedValueOnce({
        rows: [{ permission: 'dashboard:delete' }],
      }); // Role perms

      const result = await authService.checkPermission(context, {
        resource: 'dashboard',
        action: 'delete',
      });

      expect(result).toBe(true);
    });

    it('should evaluate ABAC policies', async () => {
      const context = {
        userId: 'user-123',
        roles: ['analyst'],
        attributes: {
          department: 'finance',
        },
      };

      mockDb.query.mockResolvedValueOnce({ rows: [] }); // Direct perms
      mockDb.query.mockResolvedValueOnce({ rows: [] }); // Role perms
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            conditions: {
              all: [{ attribute: 'user.department', operator: 'equals', value: 'finance' }],
            },
            effect: 'allow',
          },
        ],
      }); // ABAC policies

      const result = await authService.checkPermission(context, {
        resource: 'financial-report',
        action: 'read',
      });

      expect(result).toBe(true);
    });
  });

  describe('maskField', () => {
    it('should fully mask sensitive data', () => {
      const value = 'sensitive-data';
      const rule = { maskingType: 'full', maskChar: '*' };

      const result = authService.maskField(value, rule, {});

      expect(result).toBe('**************');
    });

    it('should partially mask data', () => {
      const value = 'john.doe@example.com';
      const rule = { maskingType: 'partial', showFirst: 1, showLast: 11 };

      const result = authService.maskField(value, rule, {});

      expect(result).toMatch(/^j.*example\.com$/);
    });

    it('should mask email addresses', () => {
      const value = 'user@example.com';
      const rule = { maskingType: 'email' };

      const result = authService.maskField(value, rule, {});

      expect(result).toMatch(/^u\*+@e\*+\.com$/);
    });

    it('should mask credit card numbers', () => {
      const value = '4532-1234-5678-9010';
      const rule = { maskingType: 'credit_card' };

      const result = authService.maskField(value, rule, {});

      expect(result).toBe('****-****-****-9010');
    });

    it('should mask SSN', () => {
      const value = '123-45-6789';
      const rule = { maskingType: 'ssn' };

      const result = authService.maskField(value, rule, {});

      expect(result).toBe('***-**-6789');
    });

    it('should hash sensitive data', () => {
      const value = 'password123';
      const rule = { maskingType: 'hash', algorithm: 'sha256' };

      const result = authService.maskField(value, rule, {});

      expect(result).toHaveLength(64); // SHA256 hash length
      expect(result).not.toBe(value);
    });

    it('should bypass masking for authorized users', () => {
      const value = 'sensitive-data';
      const rule = { maskingType: 'full', bypassRoles: ['admin'] };
      const context = { roles: ['admin'] };

      const result = authService.maskField(value, rule, context);

      expect(result).toBe('sensitive-data');
    });
  });

  describe('applyRLS', () => {
    it('should filter rows based on RLS policy', async () => {
      const userId = 'user-123';
      const orgId = 'org-456';

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            usingExpression: `organization_id = '${orgId}'`,
            policyType: 'permissive',
          },
        ],
      });

      const rows = [
        { id: 1, organizationId: orgId, data: 'visible' },
        { id: 2, organizationId: 'other-org', data: 'hidden' },
      ];

      const result = await authService.applyRLS(rows, 'dashboards', { userId, organizationId: orgId });

      expect(result).toHaveLength(1);
      expect(result[0].data).toBe('visible');
    });

    it('should apply restrictive policies', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            usingExpression: `created_by = 'user-123'`,
            policyType: 'restrictive',
          },
        ],
      });

      const rows = [
        { id: 1, createdBy: 'user-123', data: 'own-data' },
        { id: 2, createdBy: 'other-user', data: 'restricted' },
      ];

      const result = await authService.applyRLS(rows, 'dashboards', { userId: 'user-123' });

      expect(result).toHaveLength(1);
      expect(result[0].data).toBe('own-data');
    });
  });

  describe('checkSensitivityAccess', () => {
    it('should allow access to non-sensitive resources', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ sensitivityLevel: 'public' }],
      });

      const result = await authService.checkSensitivityAccess(
        { userId: 'user-123' },
        'dashboard',
        'dash-123'
      );

      expect(result).toBe(true);
    });

    it('should require MFA for critical resources', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ sensitivityLevel: 'critical', requiresMFA: true }],
      });

      const resultWithoutMFA = await authService.checkSensitivityAccess(
        { userId: 'user-123', mfaVerified: false },
        'report',
        'report-123'
      );

      expect(resultWithoutMFA).toBe(false);

      const resultWithMFA = await authService.checkSensitivityAccess(
        { userId: 'user-123', mfaVerified: true },
        'report',
        'report-123'
      );

      expect(resultWithMFA).toBe(true);
    });

    it('should enforce IP restrictions', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            sensitivityLevel: 'restricted',
            allowedIpRanges: ['192.168.1.0/24'],
          },
        ],
      });

      const resultDenied = await authService.checkSensitivityAccess(
        { userId: 'user-123', ipAddress: '10.0.0.1' },
        'resource',
        'res-123'
      );

      expect(resultDenied).toBe(false);

      const resultAllowed = await authService.checkSensitivityAccess(
        { userId: 'user-123', ipAddress: '192.168.1.100' },
        'resource',
        'res-123'
      );

      expect(resultAllowed).toBe(true);
    });
  });

  describe('delegatePermission', () => {
    it('should create temporary permission delegation', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 'delegation-123' }],
      });

      const result = await authService.delegatePermission({
        fromUserId: 'user-123',
        toUserId: 'user-456',
        permission: 'dashboard:edit',
        expiresAt: new Date(Date.now() + 86400000), // 24 hours
        maxUses: 10,
      });

      expect(result).toHaveProperty('id', 'delegation-123');
    });

    it('should prevent re-delegation beyond max depth', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ delegationDepth: 3 }],
      });

      await expect(
        authService.delegatePermission({
          fromUserId: 'user-789',
          toUserId: 'user-999',
          permission: 'dashboard:edit',
          allowRedelegate: true,
          parentDelegationId: 'delegation-parent',
        })
      ).rejects.toThrow('Max delegation depth exceeded');
    });
  });

  describe('permission inheritance', () => {
    it('should inherit permissions from parent resources', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            parentResourceId: 'workspace-123',
            inheritanceType: 'full',
          },
        ],
      });
      mockDb.query.mockResolvedValueOnce({
        rows: [{ permission: 'dashboard:read' }],
      });

      const result = await authService.checkInheritedPermissions({
        userId: 'user-123',
        resourceType: 'dashboard',
        resourceId: 'dash-456',
        action: 'read',
      });

      expect(result).toBe(true);
    });

    it('should handle additive inheritance', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            parentResourceId: 'workspace-123',
            inheritanceType: 'additive',
          },
        ],
      });
      mockDb.query.mockResolvedValueOnce({
        rows: [{ permission: 'dashboard:read' }],
      }); // Parent permissions
      mockDb.query.mockResolvedValueOnce({
        rows: [{ permission: 'dashboard:edit' }],
      }); // Own permissions

      const permissions = await authService.getEffectivePermissions('user-123', 'dashboard', 'dash-456');

      expect(permissions).toContain('dashboard:read');
      expect(permissions).toContain('dashboard:edit');
    });
  });
});
