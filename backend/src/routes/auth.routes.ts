/**
 * ClickView Enterprise - Authentication Routes
 *
 * Handles all authentication operations:
 * - Registration & Login
 * - Multi-factor authentication (MFA)
 * - Password reset
 * - Session management
 * - Email verification
 */

import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { AuthService } from '../services/auth.service';
import {
  authenticate,
  authRateLimit,
  requireVerifiedEmail,
  extractDeviceInfo
} from '../middleware/auth.middleware';
import { logger } from '../config/logger';

const router = Router();

// ===================================================================
// VALIDATION SCHEMAS
// ===================================================================

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().max(100).optional(),
  lastName: Joi.string().max(100).optional()
});

const loginSchema = Joi.object({
  emailOrUsername: Joi.string().required(),
  password: Joi.string().required()
});

const mfaVerifySchema = Joi.object({
  mfaToken: Joi.string().required(),
  code: Joi.string().length(6).required()
});

const passwordResetRequestSchema = Joi.object({
  email: Joi.string().email().required()
});

const passwordResetSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(8).required()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required()
});

// ===================================================================
// PUBLIC ROUTES (No authentication required)
// ===================================================================

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/register', authRateLimit(10, 60), async (req: Request, res: Response) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, username, password, firstName, lastName } = value;

    try {
      const result = await AuthService.register(email, username, password, firstName, lastName);

      logger.info('User registered successfully', { userId: result.user.id, email });

      res.status(201).json({
        success: true,
        message: 'Account created successfully. Please check your email to verify your account.',
        user: {
          id: result.user.id,
          email: result.user.email,
          username: result.user.username,
          firstName: result.user.first_name,
          lastName: result.user.last_name,
          emailVerified: result.user.email_verified
        },
        token: result.sessionToken,
        refreshToken: result.refreshToken
      });
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
      throw error;
    }
  } catch (error: any) {
    logger.error('Registration error', { error: error.message });
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user with email/username and password
 */
router.post('/login', authRateLimit(5, 15), async (req: Request, res: Response) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { emailOrUsername, password } = value;
    const deviceInfo = extractDeviceInfo(req);

    try {
      const result = await AuthService.login(emailOrUsername, password, deviceInfo);

      // If MFA is required, return mfaToken
      if (result.requiresMfa) {
        logger.info('MFA required for user', { email: result.user.email });
        return res.json({
          success: true,
          requiresMfa: true,
          mfaToken: result.mfaToken,
          message: 'Please enter your MFA code'
        });
      }

      logger.info('User logged in successfully', {
        userId: result.user.id,
        email: result.user.email
      });

      res.json({
        success: true,
        user: {
          id: result.user.id,
          email: result.user.email,
          username: result.user.username,
          firstName: result.user.first_name,
          lastName: result.user.last_name,
          mfaEnabled: result.user.mfa_enabled,
          emailVerified: result.user.email_verified
        },
        token: result.sessionToken,
        refreshToken: result.refreshToken
      });
    } catch (error: any) {
      logger.warn('Login failed', { emailOrUsername, error: error.message });
      res.status(401).json({ error: error.message });
    }
  } catch (error: any) {
    logger.error('Login error', { error: error.message });
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

/**
 * POST /api/auth/mfa/verify
 * Verify MFA code and complete login
 */
router.post('/mfa/verify', authRateLimit(5, 15), async (req: Request, res: Response) => {
  try {
    const { error, value } = mfaVerifySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { mfaToken, code } = value;
    const deviceInfo = extractDeviceInfo(req);

    try {
      const result = await AuthService.verifyMfaAndLogin(mfaToken, code, deviceInfo);

      logger.info('User completed MFA login', { userId: result.user.id });

      res.json({
        success: true,
        user: {
          id: result.user.id,
          email: result.user.email,
          username: result.user.username,
          firstName: result.user.first_name,
          lastName: result.user.last_name,
          mfaEnabled: result.user.mfa_enabled,
          emailVerified: result.user.email_verified
        },
        token: result.sessionToken,
        refreshToken: result.refreshToken
      });
    } catch (error: any) {
      logger.warn('MFA verification failed', { error: error.message });
      res.status(401).json({ error: error.message });
    }
  } catch (error: any) {
    logger.error('MFA verification error', { error: error.message });
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    try {
      const result = await AuthService.refreshToken(refreshToken);

      res.json({
        success: true,
        token: result.accessToken
      });
    } catch (error: any) {
      logger.warn('Token refresh failed', { error: error.message });
      res.status(401).json({ error: error.message });
    }
  } catch (error: any) {
    logger.error('Token refresh error', { error: error.message });
    res.status(500).json({ error: 'Token refresh failed. Please try again.' });
  }
});

/**
 * POST /api/auth/password/reset-request
 * Request password reset email
 */
router.post(
  '/password/reset-request',
  authRateLimit(3, 60),
  async (req: Request, res: Response) => {
    try {
      const { error, value } = passwordResetRequestSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const { email } = value;

      await AuthService.requestPasswordReset(email);

      // Always return success to prevent email enumeration
      res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    } catch (error: any) {
      logger.error('Password reset request error', { error: error.message });
      res.status(500).json({ error: 'Request failed. Please try again.' });
    }
  }
);

/**
 * POST /api/auth/password/reset
 * Reset password with token
 */
router.post('/password/reset', authRateLimit(5, 15), async (req: Request, res: Response) => {
  try {
    const { error, value } = passwordResetSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { token, newPassword } = value;

    try {
      await AuthService.resetPassword(token, newPassword);

      logger.info('Password reset completed');

      res.json({
        success: true,
        message: 'Password reset successfully. Please login with your new password.'
      });
    } catch (error: any) {
      logger.warn('Password reset failed', { error: error.message });
      res.status(400).json({ error: error.message });
    }
  } catch (error: any) {
    logger.error('Password reset error', { error: error.message });
    res.status(500).json({ error: 'Password reset failed. Please try again.' });
  }
});

// ===================================================================
// PROTECTED ROUTES (Authentication required)
// ===================================================================

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  res.json({
    success: true,
    user: {
      id: req.user!.id,
      email: req.user!.email,
      username: req.user!.username,
      firstName: req.user!.first_name,
      lastName: req.user!.last_name,
      mfaEnabled: req.user!.mfa_enabled,
      emailVerified: req.user!.email_verified,
      isActive: req.user!.is_active
    },
    permissions: req.permissions
  });
});

/**
 * POST /api/auth/logout
 * Logout current session
 */
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization!.substring(7);
    await AuthService.logout(token);

    logger.info('User logged out', { userId: req.user!.id });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error: any) {
    logger.error('Logout error', { error: error.message, userId: req.user?.id });
    res.status(500).json({ error: 'Logout failed. Please try again.' });
  }
});

/**
 * POST /api/auth/password/change
 * Change password (requires current password)
 */
router.post('/password/change', authenticate, async (req: Request, res: Response) => {
  try {
    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { currentPassword, newPassword } = value;

    // Verify current password and update to new one
    // This would need to be implemented in AuthService
    // For now, return not implemented

    res.status(501).json({
      error: 'Not implemented yet',
      message: 'Password change feature coming soon'
    });
  } catch (error: any) {
    logger.error('Password change error', { error: error.message, userId: req.user?.id });
    res.status(500).json({ error: 'Password change failed. Please try again.' });
  }
});

// ===================================================================
// MFA MANAGEMENT ROUTES
// ===================================================================

/**
 * POST /api/auth/mfa/enable
 * Enable MFA for current user
 */
router.post('/mfa/enable', authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user!.mfa_enabled) {
      return res.status(400).json({ error: 'MFA is already enabled' });
    }

    const result = await AuthService.enableMfa(req.user!.id);

    logger.info('MFA setup initiated', { userId: req.user!.id });

    res.json({
      success: true,
      message: 'Scan the QR code with your authenticator app',
      secret: result.secret,
      qrCode: result.qrCodeUrl,
      backupCodes: result.backupCodes
    });
  } catch (error: any) {
    logger.error('MFA enable error', { error: error.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to enable MFA. Please try again.' });
  }
});

/**
 * POST /api/auth/mfa/confirm
 * Confirm MFA setup with verification code
 */
router.post('/mfa/confirm', authenticate, async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Verification code required' });
    }

    try {
      await AuthService.confirmMfa(req.user!.id, code);

      logger.info('MFA enabled successfully', { userId: req.user!.id });

      res.json({
        success: true,
        message: 'MFA enabled successfully'
      });
    } catch (error: any) {
      logger.warn('MFA confirmation failed', { error: error.message, userId: req.user!.id });
      res.status(400).json({ error: error.message });
    }
  } catch (error: any) {
    logger.error('MFA confirm error', { error: error.message, userId: req.user?.id });
    res.status(500).json({ error: 'MFA confirmation failed. Please try again.' });
  }
});

/**
 * POST /api/auth/mfa/disable
 * Disable MFA (requires password confirmation)
 */
router.post('/mfa/disable', authenticate, async (req: Request, res: Response) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password required to disable MFA' });
    }

    if (!req.user!.mfa_enabled) {
      return res.status(400).json({ error: 'MFA is not enabled' });
    }

    try {
      await AuthService.disableMfa(req.user!.id, password);

      logger.info('MFA disabled', { userId: req.user!.id });

      res.json({
        success: true,
        message: 'MFA disabled successfully'
      });
    } catch (error: any) {
      logger.warn('MFA disable failed', { error: error.message, userId: req.user!.id });
      res.status(400).json({ error: error.message });
    }
  } catch (error: any) {
    logger.error('MFA disable error', { error: error.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to disable MFA. Please try again.' });
  }
});

// ===================================================================
// SESSION MANAGEMENT ROUTES
// ===================================================================

/**
 * GET /api/auth/sessions
 * Get all active sessions for current user
 */
router.get('/sessions', authenticate, async (req: Request, res: Response) => {
  try {
    // This would query user_sessions table
    // For now, return placeholder

    res.json({
      success: true,
      sessions: [],
      message: 'Session management feature coming soon'
    });
  } catch (error: any) {
    logger.error('Get sessions error', { error: error.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to retrieve sessions' });
  }
});

/**
 * DELETE /api/auth/sessions/:sessionId
 * Revoke a specific session
 */
router.delete('/sessions/:sessionId', authenticate, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // This would revoke the specified session
    // For now, return placeholder

    res.json({
      success: true,
      message: 'Session management feature coming soon'
    });
  } catch (error: any) {
    logger.error('Revoke session error', { error: error.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

/**
 * DELETE /api/auth/sessions
 * Revoke all sessions except current
 */
router.delete('/sessions', authenticate, async (req: Request, res: Response) => {
  try {
    // This would revoke all sessions except the current one
    // For now, return placeholder

    res.json({
      success: true,
      message: 'Session management feature coming soon'
    });
  } catch (error: any) {
    logger.error('Revoke all sessions error', { error: error.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to revoke sessions' });
  }
});

export default router;
