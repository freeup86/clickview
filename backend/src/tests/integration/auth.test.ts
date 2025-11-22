import request from 'supertest';
import express from 'express';
import {
  clearDatabase,
  createTestUser,
  createTestRole,
  assignRoleToUser,
  testPool,
  testRedis,
  generateTestToken,
} from '../setup';
import authRoutes from '../../routes/auth.routes';
import { Pool } from 'pg';

// Mock Express app for testing
const app = express();
app.use(express.json());
app.locals.pool = testPool;
app.use('/api/auth', authRoutes);

describe('Authentication Integration Tests', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          username: 'newuser',
          password: 'SecurePassword123!',
          firstName: 'New',
          lastName: 'User',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('newuser@example.com');
      expect(response.body.user).not.toHaveProperty('password_hash');

      // Verify user exists in database
      const result = await testPool.query(
        'SELECT * FROM users WHERE email = $1',
        ['newuser@example.com']
      );
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].email_verified).toBe(false);
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          username: 'newuser',
          password: 'weak',
          firstName: 'New',
          lastName: 'User',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject registration with duplicate email', async () => {
      await createTestUser({ email: 'existing@example.com' });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          username: 'newuser',
          password: 'SecurePassword123!',
          firstName: 'New',
          lastName: 'User',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already exists');
    });

    it('should reject registration with duplicate username', async () => {
      await createTestUser({ username: 'existinguser' });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          username: 'existinguser',
          password: 'SecurePassword123!',
          firstName: 'New',
          lastName: 'User',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already exists');
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          username: 'newuser',
          password: 'SecurePassword123!',
          firstName: 'New',
          lastName: 'User',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('email');
    });

    it('should reject registration with missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          // Missing username, password, firstName, lastName
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await createTestUser({
        email: 'test@example.com',
        username: 'testuser',
        // password is "password123" (see setup.ts)
      });
    });

    it('should login successfully with email and password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user).not.toHaveProperty('password_hash');

      // Verify session created in Redis
      const sessions = await testRedis.keys(`session:${testUser.id}:*`);
      expect(sessions.length).toBeGreaterThan(0);
    });

    it('should login successfully with username and password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    it('should reject login with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should reject login for inactive user', async () => {
      await testPool.query('UPDATE users SET is_active = false WHERE id = $1', [testUser.id]);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('inactive');
    });

    it('should lock account after multiple failed login attempts', async () => {
      // Attempt failed logins (5 times by default)
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword',
          });
      }

      // Next login should be locked
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123', // Correct password
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('locked');

      // Verify user is locked in database
      const result = await testPool.query('SELECT is_locked FROM users WHERE id = $1', [testUser.id]);
      expect(result.rows[0].is_locked).toBe(true);
    });

    it('should return MFA required for user with MFA enabled', async () => {
      await testPool.query('UPDATE users SET mfa_enabled = true WHERE id = $1', [testUser.id]);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.mfaRequired).toBe(true);
      expect(response.body).toHaveProperty('mfaToken');
      expect(response.body).not.toHaveProperty('token'); // No access token yet
    });
  });

  describe('POST /api/auth/refresh', () => {
    let testUser: any;
    let refreshToken: string;

    beforeEach(async () => {
      testUser = await createTestUser();

      // Login to get refresh token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'password123',
        });

      refreshToken = loginResponse.body.refreshToken;
    });

    it('should refresh access token successfully', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.refreshToken).not.toBe(refreshToken); // Should rotate
    });

    it('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid');
    });

    it('should reject refresh with expired token', async () => {
      // Create expired token
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: testUser.id, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET || 'test-refresh-secret',
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: expiredToken,
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('expired');
    });
  });

  describe('POST /api/auth/logout', () => {
    let testUser: any;
    let accessToken: string;

    beforeEach(async () => {
      testUser = await createTestUser();

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'password123',
        });

      accessToken = loginResponse.body.token;
    });

    it('should logout successfully and revoke session', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('successfully');

      // Verify session removed from Redis
      const sessions = await testRedis.keys(`session:${testUser.id}:*`);
      expect(sessions.length).toBe(0);
    });

    it('should reject logout without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/password-reset/request', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should send password reset email for valid email', async () => {
      const response = await request(app)
        .post('/api/auth/password-reset/request')
        .send({
          email: testUser.email,
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('sent');

      // Verify reset token stored in Redis
      const resetTokens = await testRedis.keys(`password_reset:${testUser.id}:*`);
      expect(resetTokens.length).toBeGreaterThan(0);
    });

    it('should return success even for non-existent email (security)', async () => {
      const response = await request(app)
        .post('/api/auth/password-reset/request')
        .send({
          email: 'nonexistent@example.com',
        });

      // Should not reveal whether email exists
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('sent');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/password-reset/request')
        .send({
          email: 'invalid-email',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('email');
    });
  });

  describe('POST /api/auth/password-reset/confirm', () => {
    let testUser: any;
    let resetToken: string;

    beforeEach(async () => {
      testUser = await createTestUser();

      // Request password reset
      const response = await request(app)
        .post('/api/auth/password-reset/request')
        .send({
          email: testUser.email,
        });

      // Get reset token from Redis (in real app, this comes from email)
      const resetKeys = await testRedis.keys(`password_reset:${testUser.id}:*`);
      resetToken = resetKeys[0].split(':')[2];
    });

    it('should reset password successfully with valid token', async () => {
      const newPassword = 'NewSecurePassword123!';

      const response = await request(app)
        .post('/api/auth/password-reset/confirm')
        .send({
          token: resetToken,
          password: newPassword,
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('reset');

      // Verify can login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: newPassword,
        });

      expect(loginResponse.status).toBe(200);

      // Verify reset token removed from Redis
      const resetTokens = await testRedis.keys(`password_reset:${testUser.id}:*`);
      expect(resetTokens.length).toBe(0);
    });

    it('should reject reset with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/password-reset/confirm')
        .send({
          token: 'invalid-token',
          password: 'NewPassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid');
    });

    it('should reject reset with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/password-reset/confirm')
        .send({
          token: resetToken,
          password: 'weak',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('password');
    });
  });

  describe('GET /api/auth/me', () => {
    let testUser: any;
    let accessToken: string;

    beforeEach(async () => {
      testUser = await createTestUser();

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'password123',
        });

      accessToken = loginResponse.body.token;
    });

    it('should return current user profile', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.id).toBe(testUser.id);
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user).not.toHaveProperty('password_hash');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should include user roles and permissions', async () => {
      // Create role and assign to user
      const role = await createTestRole({ name: 'Test Role' });
      await assignRoleToUser(testUser.id, role.id);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toHaveProperty('roles');
      expect(response.body.user.roles).toHaveLength(1);
      expect(response.body.user.roles[0].name).toBe('Test Role');
    });
  });

  describe('PATCH /api/auth/me', () => {
    let testUser: any;
    let accessToken: string;

    beforeEach(async () => {
      testUser = await createTestUser();

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'password123',
        });

      accessToken = loginResponse.body.token;
    });

    it('should update user profile', async () => {
      const response = await request(app)
        .patch('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name',
        });

      expect(response.status).toBe(200);
      expect(response.body.user.first_name).toBe('Updated');
      expect(response.body.user.last_name).toBe('Name');

      // Verify in database
      const result = await testPool.query(
        'SELECT first_name, last_name FROM users WHERE id = $1',
        [testUser.id]
      );
      expect(result.rows[0].first_name).toBe('Updated');
      expect(result.rows[0].last_name).toBe('Name');
    });

    it('should not allow updating email to existing email', async () => {
      await createTestUser({ email: 'existing@example.com' });

      const response = await request(app)
        .patch('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'existing@example.com',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already exists');
    });

    it('should not allow updating password without current password', async () => {
      const response = await request(app)
        .patch('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          password: 'NewPassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('current password');
    });
  });

  describe('POST /api/auth/change-password', () => {
    let testUser: any;
    let accessToken: string;

    beforeEach(async () => {
      testUser = await createTestUser();

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'password123',
        });

      accessToken = loginResponse.body.token;
    });

    it('should change password successfully', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'NewSecurePassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('changed');

      // Verify can login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'NewSecurePassword123!',
        });

      expect(loginResponse.status).toBe(200);
    });

    it('should reject with incorrect current password', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'NewSecurePassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('current password');
    });

    it('should reject with weak new password', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'weak',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('password');
    });
  });
});
