import request from 'supertest';
import express from 'express';
import {
  clearDatabase,
  createTestUser,
  createTestRole,
  createTestPermission,
  assignRoleToUser,
  assignPermissionToRole,
  testPool,
  generateTestToken,
} from '../setup';
import authorizationRoutes from '../../routes/authorization.routes';

// Mock Express app for testing
const app = express();
app.use(express.json());
app.locals.pool = testPool;
app.use('/api/authorization', authorizationRoutes);

describe('Authorization Integration Tests (RBAC/ABAC)', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('Role-Based Access Control (RBAC)', () => {
    let adminUser: any;
    let regularUser: any;
    let adminRole: any;
    let userRole: any;
    let adminToken: string;
    let userToken: string;

    beforeEach(async () => {
      // Create roles
      adminRole = await createTestRole({
        name: 'Admin',
        description: 'Administrator role',
        is_system: true,
      });

      userRole = await createTestRole({
        name: 'User',
        description: 'Regular user role',
        is_system: false,
      });

      // Create permissions
      const readPermission = await createTestPermission({
        name: 'dashboards:read',
        resource: 'dashboards',
        action: 'read',
      });

      const writePermission = await createTestPermission({
        name: 'dashboards:write',
        resource: 'dashboards',
        action: 'write',
      });

      const deletePermission = await createTestPermission({
        name: 'dashboards:delete',
        resource: 'dashboards',
        action: 'delete',
      });

      const adminPermission = await createTestPermission({
        name: 'admin:access',
        resource: 'admin',
        action: 'access',
      });

      // Assign permissions to roles
      await assignPermissionToRole(userRole.id, readPermission.id);
      await assignPermissionToRole(userRole.id, writePermission.id);

      await assignPermissionToRole(adminRole.id, readPermission.id);
      await assignPermissionToRole(adminRole.id, writePermission.id);
      await assignPermissionToRole(adminRole.id, deletePermission.id);
      await assignPermissionToRole(adminRole.id, adminPermission.id);

      // Create users
      adminUser = await createTestUser({
        email: 'admin@example.com',
        username: 'admin',
      });

      regularUser = await createTestUser({
        email: 'user@example.com',
        username: 'user',
      });

      // Assign roles
      await assignRoleToUser(adminUser.id, adminRole.id);
      await assignRoleToUser(regularUser.id, userRole.id);

      // Generate tokens
      adminToken = generateTestToken(adminUser.id);
      userToken = generateTestToken(regularUser.id);
    });

    it('should allow admin to access admin resources', async () => {
      const response = await request(app)
        .post('/api/authorization/check')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resource: 'admin',
          action: 'access',
        });

      expect(response.status).toBe(200);
      expect(response.body.allowed).toBe(true);
    });

    it('should deny regular user from accessing admin resources', async () => {
      const response = await request(app)
        .post('/api/authorization/check')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          resource: 'admin',
          action: 'access',
        });

      expect(response.status).toBe(200);
      expect(response.body.allowed).toBe(false);
    });

    it('should allow both admin and user to read dashboards', async () => {
      // Admin can read
      const adminResponse = await request(app)
        .post('/api/authorization/check')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resource: 'dashboards',
          action: 'read',
        });

      expect(adminResponse.status).toBe(200);
      expect(adminResponse.body.allowed).toBe(true);

      // User can read
      const userResponse = await request(app)
        .post('/api/authorization/check')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          resource: 'dashboards',
          action: 'read',
        });

      expect(userResponse.status).toBe(200);
      expect(userResponse.body.allowed).toBe(true);
    });

    it('should only allow admin to delete dashboards', async () => {
      // Admin can delete
      const adminResponse = await request(app)
        .post('/api/authorization/check')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resource: 'dashboards',
          action: 'delete',
        });

      expect(adminResponse.status).toBe(200);
      expect(adminResponse.body.allowed).toBe(true);

      // User cannot delete
      const userResponse = await request(app)
        .post('/api/authorization/check')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          resource: 'dashboards',
          action: 'delete',
        });

      expect(userResponse.status).toBe(200);
      expect(userResponse.body.allowed).toBe(false);
    });

    it('should get all user permissions', async () => {
      const response = await request(app)
        .get('/api/authorization/my-permissions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('permissions');
      expect(response.body.permissions.length).toBeGreaterThan(0);

      const permissionNames = response.body.permissions.map((p: any) => p.name);
      expect(permissionNames).toContain('admin:access');
      expect(permissionNames).toContain('dashboards:read');
      expect(permissionNames).toContain('dashboards:write');
      expect(permissionNames).toContain('dashboards:delete');
    });

    it('should check multiple permissions at once', async () => {
      const response = await request(app)
        .post('/api/authorization/check-multiple')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          checks: [
            { resource: 'dashboards', action: 'read' },
            { resource: 'dashboards', action: 'write' },
            { resource: 'dashboards', action: 'delete' },
            { resource: 'admin', action: 'access' },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.results).toHaveLength(4);
      expect(response.body.results[0].allowed).toBe(true);  // read: allowed
      expect(response.body.results[1].allowed).toBe(true);  // write: allowed
      expect(response.body.results[2].allowed).toBe(false); // delete: denied
      expect(response.body.results[3].allowed).toBe(false); // admin: denied
    });
  });

  describe('Attribute-Based Access Control (ABAC)', () => {
    let user1: any;
    let user2: any;
    let org1: any;
    let org2: any;
    let token1: string;
    let token2: string;

    beforeEach(async () => {
      // Create organizations
      org1 = await testPool.query(
        `INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id, name, slug`,
        ['Org 1', 'org-1']
      ).then(r => r.rows[0]);

      org2 = await testPool.query(
        `INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id, name, slug`,
        ['Org 2', 'org-2']
      ).then(r => r.rows[0]);

      // Create users in different orgs
      user1 = await createTestUser({
        email: 'user1@org1.com',
        username: 'user1',
      });

      user2 = await createTestUser({
        email: 'user2@org2.com',
        username: 'user2',
      });

      // Assign users to organizations
      await testPool.query(
        `INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, $3)`,
        [org1.id, user1.id, 'member']
      );

      await testPool.query(
        `INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, $3)`,
        [org2.id, user2.id, 'member']
      );

      // Create dashboards in organizations
      await testPool.query(
        `INSERT INTO dashboards (name, organization_id, created_by) VALUES ($1, $2, $3)`,
        ['Dashboard Org 1', org1.id, user1.id]
      );

      await testPool.query(
        `INSERT INTO dashboards (name, organization_id, created_by) VALUES ($1, $2, $3)`,
        ['Dashboard Org 2', org2.id, user2.id]
      );

      token1 = generateTestToken(user1.id);
      token2 = generateTestToken(user2.id);
    });

    it('should allow user to access resources in their organization', async () => {
      const dashboard = await testPool.query(
        `SELECT id FROM dashboards WHERE organization_id = $1`,
        [org1.id]
      ).then(r => r.rows[0]);

      const response = await request(app)
        .post('/api/authorization/check')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          resource: 'dashboards',
          action: 'read',
          context: {
            dashboardId: dashboard.id,
            organizationId: org1.id,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.allowed).toBe(true);
    });

    it('should deny user from accessing resources in other organization', async () => {
      const dashboard = await testPool.query(
        `SELECT id FROM dashboards WHERE organization_id = $1`,
        [org2.id]
      ).then(r => r.rows[0]);

      const response = await request(app)
        .post('/api/authorization/check')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          resource: 'dashboards',
          action: 'read',
          context: {
            dashboardId: dashboard.id,
            organizationId: org2.id,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.allowed).toBe(false);
      expect(response.body.reason).toContain('organization');
    });

    it('should allow user to modify their own resources', async () => {
      const dashboard = await testPool.query(
        `SELECT id, created_by FROM dashboards WHERE created_by = $1`,
        [user1.id]
      ).then(r => r.rows[0]);

      const response = await request(app)
        .post('/api/authorization/check')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          resource: 'dashboards',
          action: 'write',
          context: {
            dashboardId: dashboard.id,
            ownerId: dashboard.created_by,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.allowed).toBe(true);
    });

    it('should deny user from modifying resources they do not own', async () => {
      const dashboard = await testPool.query(
        `SELECT id, created_by FROM dashboards WHERE created_by = $1`,
        [user2.id]
      ).then(r => r.rows[0]);

      const response = await request(app)
        .post('/api/authorization/check')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          resource: 'dashboards',
          action: 'write',
          context: {
            dashboardId: dashboard.id,
            ownerId: dashboard.created_by,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.allowed).toBe(false);
      expect(response.body.reason).toContain('owner');
    });

    it('should allow organization admin to access all org resources', async () => {
      // Make user1 an admin of org1
      await testPool.query(
        `UPDATE organization_members SET role = $1 WHERE user_id = $2 AND organization_id = $3`,
        ['admin', user1.id, org1.id]
      );

      const dashboard = await testPool.query(
        `SELECT id FROM dashboards WHERE organization_id = $1`,
        [org1.id]
      ).then(r => r.rows[0]);

      const response = await request(app)
        .post('/api/authorization/check')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          resource: 'dashboards',
          action: 'delete',
          context: {
            dashboardId: dashboard.id,
            organizationId: org1.id,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.allowed).toBe(true);
    });
  });

  describe('Policy Evaluation', () => {
    let user: any;
    let token: string;

    beforeEach(async () => {
      user = await createTestUser();
      token = generateTestToken(user.id);

      // Create custom policy
      await testPool.query(
        `INSERT INTO access_policies (name, description, conditions, effect, priority)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'Business Hours Only',
          'Only allow access during business hours (9 AM - 5 PM)',
          JSON.stringify({
            type: 'time_range',
            start: '09:00',
            end: '17:00',
            timezone: 'UTC',
          }),
          'allow',
          100,
        ]
      );
    });

    it('should evaluate policies based on context', async () => {
      const response = await request(app)
        .post('/api/authorization/evaluate-policy')
        .set('Authorization', `Bearer ${token}`)
        .send({
          policyName: 'Business Hours Only',
          context: {
            currentTime: '14:00', // 2 PM
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.result).toBe('allow');
    });

    it('should deny access outside policy conditions', async () => {
      const response = await request(app)
        .post('/api/authorization/evaluate-policy')
        .set('Authorization', `Bearer ${token}`)
        .send({
          policyName: 'Business Hours Only',
          context: {
            currentTime: '20:00', // 8 PM
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.result).toBe('deny');
    });
  });

  describe('GET /api/authorization/roles/:userId', () => {
    let admin: any;
    let user: any;
    let adminToken: string;

    beforeEach(async () => {
      // Create admin with permission to view roles
      admin = await createTestUser({ email: 'admin@example.com' });
      const adminRole = await createTestRole({ name: 'Admin', is_system: true });
      const viewRolesPermission = await createTestPermission({
        name: 'roles:read',
        resource: 'roles',
        action: 'read',
      });
      await assignPermissionToRole(adminRole.id, viewRolesPermission.id);
      await assignRoleToUser(admin.id, adminRole.id);
      adminToken = generateTestToken(admin.id);

      // Create user with roles
      user = await createTestUser({ email: 'user@example.com' });
      const userRole = await createTestRole({ name: 'User' });
      await assignRoleToUser(user.id, userRole.id);
    });

    it('should get user roles for authorized admin', async () => {
      const response = await request(app)
        .get(`/api/authorization/roles/${user.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('roles');
      expect(response.body.roles.length).toBeGreaterThan(0);
      expect(response.body.roles[0]).toHaveProperty('name');
    });

    it('should deny access without proper permissions', async () => {
      const userToken = generateTestToken(user.id);

      const response = await request(app)
        .get(`/api/authorization/roles/${admin.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('permission');
    });
  });

  describe('POST /api/authorization/roles/:userId', () => {
    let admin: any;
    let user: any;
    let role: any;
    let adminToken: string;

    beforeEach(async () => {
      // Create admin with permission to assign roles
      admin = await createTestUser({ email: 'admin@example.com' });
      const adminRole = await createTestRole({ name: 'Admin', is_system: true });
      const assignRolesPermission = await createTestPermission({
        name: 'roles:assign',
        resource: 'roles',
        action: 'assign',
      });
      await assignPermissionToRole(adminRole.id, assignRolesPermission.id);
      await assignRoleToUser(admin.id, adminRole.id);
      adminToken = generateTestToken(admin.id);

      // Create user and role
      user = await createTestUser({ email: 'user@example.com' });
      role = await createTestRole({ name: 'Editor' });
    });

    it('should assign role to user for authorized admin', async () => {
      const response = await request(app)
        .post(`/api/authorization/roles/${user.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          roleId: role.id,
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('assigned');

      // Verify role assigned in database
      const result = await testPool.query(
        `SELECT * FROM user_roles WHERE user_id = $1 AND role_id = $2`,
        [user.id, role.id]
      );
      expect(result.rows.length).toBe(1);
    });

    it('should prevent assigning system roles', async () => {
      const systemRole = await createTestRole({
        name: 'SuperAdmin',
        is_system: true
      });

      const response = await request(app)
        .post(`/api/authorization/roles/${user.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          roleId: systemRole.id,
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('system role');
    });
  });

  describe('DELETE /api/authorization/roles/:userId/:roleId', () => {
    let admin: any;
    let user: any;
    let role: any;
    let adminToken: string;

    beforeEach(async () => {
      // Create admin with permission to revoke roles
      admin = await createTestUser({ email: 'admin@example.com' });
      const adminRole = await createTestRole({ name: 'Admin', is_system: true });
      const revokeRolesPermission = await createTestPermission({
        name: 'roles:revoke',
        resource: 'roles',
        action: 'revoke',
      });
      await assignPermissionToRole(adminRole.id, revokeRolesPermission.id);
      await assignRoleToUser(admin.id, adminRole.id);
      adminToken = generateTestToken(admin.id);

      // Create user with role
      user = await createTestUser({ email: 'user@example.com' });
      role = await createTestRole({ name: 'Editor' });
      await assignRoleToUser(user.id, role.id);
    });

    it('should revoke role from user for authorized admin', async () => {
      const response = await request(app)
        .delete(`/api/authorization/roles/${user.id}/${role.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('revoked');

      // Verify role removed from database
      const result = await testPool.query(
        `SELECT * FROM user_roles WHERE user_id = $1 AND role_id = $2`,
        [user.id, role.id]
      );
      expect(result.rows.length).toBe(0);
    });

    it('should prevent revoking last admin role', async () => {
      // Make user an admin (only admin)
      const adminRole = await createTestRole({ name: 'Admin', is_system: true });
      await assignRoleToUser(user.id, adminRole.id);

      const response = await request(app)
        .delete(`/api/authorization/roles/${user.id}/${adminRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('last admin');
    });
  });
});
