/**
 * Authentication Service Unit Tests
 * Tests for AUTH-001 implementation
 */

import { AuthService } from '../../services/auth.service';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../config/database');

describe('AuthService', () => {
  let authService: AuthService;
  let mockDb: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock database
    mockDb = {
      query: jest.fn(),
      pool: {
        query: jest.fn(),
      },
    };

    authService = new AuthService(mockDb);
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
      };

      const hashedPassword = 'hashed_password';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      }); // Check existing user
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 'user-123', ...userData, password: hashedPassword }],
      }); // Insert user

      const result = await authService.register(userData);

      expect(result).toBeDefined();
      expect(result.id).toBe('user-123');
      expect(bcrypt.hash).toHaveBeenCalledWith('SecurePass123!', 12);
      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });

    it('should throw error if user already exists', async () => {
      const userData = {
        email: 'existing@example.com',
        username: 'existing',
        password: 'password',
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 'existing-user' }],
      });

      await expect(authService.register(userData)).rejects.toThrow('User already exists');
    });

    it('should validate email format', async () => {
      const userData = {
        email: 'invalid-email',
        username: 'testuser',
        password: 'password',
      };

      await expect(authService.register(userData)).rejects.toThrow('Invalid email format');
    });

    it('should validate password strength', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: '123', // Too weak
      };

      await expect(authService.register(userData)).rejects.toThrow('Password too weak');
    });
  });

  describe('login', () => {
    it('should successfully login with correct credentials', async () => {
      const email = 'test@example.com';
      const password = 'correctPassword';
      const user = {
        id: 'user-123',
        email,
        password: 'hashed_password',
        mfaEnabled: false,
      };

      mockDb.query.mockResolvedValueOnce({ rows: [user] });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');

      const result = await authService.login(email, password);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(bcrypt.compare).toHaveBeenCalledWith(password, user.password);
      expect(jwt.sign).toHaveBeenCalled();
    });

    it('should fail login with incorrect password', async () => {
      const email = 'test@example.com';
      const password = 'wrongPassword';

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 'user-123', email, password: 'hashed_password' }],
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(email, password)).rejects.toThrow('Invalid credentials');
    });

    it('should fail login with non-existent user', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(authService.login('nonexistent@example.com', 'password')).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('should require MFA when enabled', async () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed_password',
        mfaEnabled: true,
      };

      mockDb.query.mockResolvedValueOnce({ rows: [user] });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.login('test@example.com', 'password');

      expect(result).toHaveProperty('requiresMFA', true);
      expect(result).not.toHaveProperty('token');
    });

    it('should lock account after 5 failed attempts', async () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed_password',
        failedLoginAttempts: 4,
      };

      mockDb.query.mockResolvedValueOnce({ rows: [user] });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      mockDb.query.mockResolvedValueOnce({ rows: [] }); // Update failed attempts

      await expect(authService.login('test@example.com', 'wrongpassword')).rejects.toThrow(
        'Account locked'
      );
    });
  });

  describe('verifyToken', () => {
    it('should verify valid JWT token', async () => {
      const token = 'valid-jwt-token';
      const decoded = { userId: 'user-123', email: 'test@example.com' };

      (jwt.verify as jest.Mock).mockReturnValue(decoded);
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 'user-123', email: 'test@example.com' }],
      });

      const result = await authService.verifyToken(token);

      expect(result).toHaveProperty('userId', 'user-123');
      expect(jwt.verify).toHaveBeenCalledWith(token, expect.any(String));
    });

    it('should reject invalid token', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.verifyToken('invalid-token')).rejects.toThrow('Invalid token');
    });

    it('should reject expired token', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date());
      });

      await expect(authService.verifyToken('expired-token')).rejects.toThrow('Token expired');
    });
  });

  describe('enableMFA', () => {
    it('should generate MFA secret and QR code', async () => {
      const userId = 'user-123';
      const mockSecret = {
        base32: 'MOCK_SECRET_BASE32',
        qr_code_ascii: 'QR CODE ASCII',
        qr_code_hex: 'QR CODE HEX',
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: userId, email: 'test@example.com' }],
      });

      const result = await authService.enableMFA(userId);

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCode');
    });

    it('should fail if user not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(authService.enableMFA('nonexistent')).rejects.toThrow('User not found');
    });
  });

  describe('verifyMFA', () => {
    it('should verify correct MFA code', async () => {
      const userId = 'user-123';
      const code = '123456';
      const secret = 'MOCK_SECRET';

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: userId, mfaSecret: secret }],
      });

      // Mock speakeasy verification
      const speakeasy = require('speakeasy');
      speakeasy.totp.verify = jest.fn().mockReturnValue(true);

      const result = await authService.verifyMFA(userId, code);

      expect(result).toBe(true);
    });

    it('should reject incorrect MFA code', async () => {
      const userId = 'user-123';
      const code = '000000';

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: userId, mfaSecret: 'secret' }],
      });

      const speakeasy = require('speakeasy');
      speakeasy.totp.verify = jest.fn().mockReturnValue(false);

      const result = await authService.verifyMFA(userId, code);

      expect(result).toBe(false);
    });
  });

  describe('refreshToken', () => {
    it('should generate new access token from valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const decoded = { userId: 'user-123' };

      (jwt.verify as jest.Mock).mockReturnValue(decoded);
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 'session-123', userId: 'user-123', isValid: true }],
      });
      (jwt.sign as jest.Mock).mockReturnValue('new-access-token');

      const result = await authService.refreshToken(refreshToken);

      expect(result).toHaveProperty('accessToken', 'new-access-token');
    });

    it('should reject invalid refresh token', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.refreshToken('invalid')).rejects.toThrow();
    });
  });

  describe('resetPassword', () => {
    it('should generate password reset token', async () => {
      const email = 'test@example.com';

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 'user-123', email }],
      });
      mockDb.query.mockResolvedValueOnce({ rows: [] }); // Insert reset token

      const result = await authService.requestPasswordReset(email);

      expect(result).toHaveProperty('resetToken');
      expect(result).toHaveProperty('expiresAt');
    });

    it('should successfully reset password with valid token', async () => {
      const token = 'valid-reset-token';
      const newPassword = 'NewSecurePass123!';

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            userId: 'user-123',
            expiresAt: new Date(Date.now() + 3600000),
          },
        ],
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
      mockDb.query.mockResolvedValueOnce({ rows: [] }); // Update password
      mockDb.query.mockResolvedValueOnce({ rows: [] }); // Invalidate token

      await expect(authService.resetPassword(token, newPassword)).resolves.not.toThrow();
    });

    it('should reject expired reset token', async () => {
      const token = 'expired-token';

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            userId: 'user-123',
            expiresAt: new Date(Date.now() - 1000), // Expired
          },
        ],
      });

      await expect(authService.resetPassword(token, 'newpass')).rejects.toThrow('Token expired');
    });
  });

  describe('logout', () => {
    it('should invalidate session on logout', async () => {
      const userId = 'user-123';
      const sessionId = 'session-123';

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await authService.logout(userId, sessionId);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_sessions'),
        expect.any(Array)
      );
    });
  });
});
