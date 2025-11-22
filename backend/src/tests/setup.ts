import { Pool } from 'pg';
import Redis from 'ioredis';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Test database pool
export let testPool: Pool;
export let testRedis: Redis;

// Setup before all tests
beforeAll(async () => {
  // Create test database connection
  testPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME_TEST || 'clickview_test',
    user: process.env.DB_USER || 'clickview_user',
    password: process.env.DB_PASSWORD || 'password',
  });

  // Create test Redis connection
  testRedis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    db: parseInt(process.env.REDIS_TEST_DB || '1'), // Use different DB for tests
  });

  // Run migrations on test database
  // await runMigrations(testPool);
});

// Cleanup after all tests
afterAll(async () => {
  await testPool.end();
  await testRedis.quit();
});

// Clear database between tests
export async function clearDatabase() {
  await testPool.query('TRUNCATE TABLE users, sessions, audit_logs, organizations, roles, permissions CASCADE');
  await testRedis.flushdb();
}

// Create test user helper
export async function createTestUser(overrides = {}) {
  const defaultUser = {
    email: 'test@example.com',
    username: 'testuser',
    password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqKe.Y9VxK', // "password123"
    first_name: 'Test',
    last_name: 'User',
    is_active: true,
    email_verified: true,
    ...overrides,
  };

  const result = await testPool.query(
    `INSERT INTO users (email, username, password_hash, first_name, last_name, is_active, email_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, email, username, first_name, last_name, is_active, email_verified, created_at`,
    [
      defaultUser.email,
      defaultUser.username,
      defaultUser.password_hash,
      defaultUser.first_name,
      defaultUser.last_name,
      defaultUser.is_active,
      defaultUser.email_verified,
    ]
  );

  return result.rows[0];
}

// Create test organization helper
export async function createTestOrganization(overrides = {}) {
  const defaultOrg = {
    name: 'Test Organization',
    slug: 'test-org',
    ...overrides,
  };

  const result = await testPool.query(
    `INSERT INTO organizations (name, slug)
     VALUES ($1, $2)
     RETURNING id, name, slug, created_at`,
    [defaultOrg.name, defaultOrg.slug]
  );

  return result.rows[0];
}

// Create test role helper
export async function createTestRole(overrides = {}) {
  const defaultRole = {
    name: 'Test Role',
    description: 'Test role description',
    is_system: false,
    ...overrides,
  };

  const result = await testPool.query(
    `INSERT INTO roles (name, description, is_system)
     VALUES ($1, $2, $3)
     RETURNING id, name, description, is_system, created_at`,
    [defaultRole.name, defaultRole.description, defaultRole.is_system]
  );

  return result.rows[0];
}

// Assign role to user helper
export async function assignRoleToUser(userId: number, roleId: number) {
  await testPool.query(
    `INSERT INTO user_roles (user_id, role_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, role_id) DO NOTHING`,
    [userId, roleId]
  );
}

// Create permission helper
export async function createTestPermission(overrides = {}) {
  const defaultPermission = {
    name: 'test:read',
    resource: 'test',
    action: 'read',
    description: 'Test permission',
    ...overrides,
  };

  const result = await testPool.query(
    `INSERT INTO permissions (name, resource, action, description)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, resource, action, description`,
    [
      defaultPermission.name,
      defaultPermission.resource,
      defaultPermission.action,
      defaultPermission.description,
    ]
  );

  return result.rows[0];
}

// Assign permission to role helper
export async function assignPermissionToRole(roleId: number, permissionId: number) {
  await testPool.query(
    `INSERT INTO role_permissions (role_id, permission_id)
     VALUES ($1, $2)
     ON CONFLICT (role_id, permission_id) DO NOTHING`,
    [roleId, permissionId]
  );
}

// Generate JWT token for testing
export function generateTestToken(userId: number) {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { userId, type: 'access' },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
}

// Wait helper for async operations
export function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
