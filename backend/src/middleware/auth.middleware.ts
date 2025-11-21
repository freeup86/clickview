/**
 * ClickView Enterprise - Authentication Middleware
 *
 * Provides request authentication and authorization middleware
 */

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { query } from '../config/database';
import { logger } from '../config/logger';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
        first_name?: string;
        last_name?: string;
        is_active: boolean;
        mfa_enabled: boolean;
        email_verified: boolean;
      };
      sessionId?: string;
      organizationId?: string;
      permissions?: string[];
    }
  }
}

/**
 * Authenticate request using Bearer token
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No authentication token provided' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Validate session
      const { user, sessionId } = await AuthService.validateSession(token);

      // Attach user to request
      req.user = user;
      req.sessionId = sessionId;

      // Get user's permissions
      const permissionsResult = await query(
        'SELECT get_user_permissions($1) as permissions',
        [user.id]
      );
      req.permissions = permissionsResult.rows[0]?.permissions || [];

      next();
    } catch (error: any) {
      logger.warn('Authentication failed', { error: error.message });
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
  } catch (error) {
    logger.error('Authentication middleware error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticate(req, res, next);
  }

  next();
};

/**
 * Require specific permission
 */
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!req.permissions) {
      res.status(403).json({ error: 'No permissions found' });
      return;
    }

    // Check for exact permission or wildcard
    const hasPermission = req.permissions.some(p => {
      if (p === permission) return true;
      if (p === 'system:*') return true;

      // Check for resource wildcard (e.g., 'dashboard:*' matches 'dashboard:read')
      const [resource, action] = permission.split(':');
      return p === `${resource}:*`;
    });

    if (!hasPermission) {
      logger.warn('Permission denied', {
        userId: req.user.id,
        requiredPermission: permission,
        userPermissions: req.permissions
      });
      res.status(403).json({
        error: 'Insufficient permissions',
        required: permission
      });
      return;
    }

    next();
  };
};

/**
 * Require multiple permissions (AND logic)
 */
export const requireAllPermissions = (...permissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!req.permissions) {
      res.status(403).json({ error: 'No permissions found' });
      return;
    }

    const missingPermissions = permissions.filter(permission => {
      return !req.permissions!.some(p => {
        if (p === permission) return true;
        if (p === 'system:*') return true;
        const [resource, action] = permission.split(':');
        return p === `${resource}:*`;
      });
    });

    if (missingPermissions.length > 0) {
      logger.warn('Multiple permissions denied', {
        userId: req.user.id,
        missingPermissions
      });
      res.status(403).json({
        error: 'Insufficient permissions',
        missing: missingPermissions
      });
      return;
    }

    next();
  };
};

/**
 * Require any of the permissions (OR logic)
 */
export const requireAnyPermission = (...permissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!req.permissions) {
      res.status(403).json({ error: 'No permissions found' });
      return;
    }

    const hasAnyPermission = permissions.some(permission => {
      return req.permissions!.some(p => {
        if (p === permission) return true;
        if (p === 'system:*') return true;
        const [resource, action] = permission.split(':');
        return p === `${resource}:*`;
      });
    });

    if (!hasAnyPermission) {
      logger.warn('No matching permissions found', {
        userId: req.user.id,
        requiredPermissions: permissions
      });
      res.status(403).json({
        error: 'Insufficient permissions',
        requiresAnyOf: permissions
      });
      return;
    }

    next();
  };
};

/**
 * Require specific role
 */
export const requireRole = (roleName: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Check if user has role
    const roleResult = await query(
      `SELECT EXISTS(
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1
          AND r.name = $2
          AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
      ) as has_role`,
      [req.user.id, roleName]
    );

    if (!roleResult.rows[0]?.has_role) {
      logger.warn('Role check failed', {
        userId: req.user.id,
        requiredRole: roleName
      });
      res.status(403).json({
        error: 'Insufficient permissions',
        requiredRole: roleName
      });
      return;
    }

    next();
  };
};

/**
 * Require email verification
 */
export const requireVerifiedEmail = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (!req.user.email_verified) {
    res.status(403).json({
      error: 'Email verification required',
      message: 'Please verify your email address before accessing this resource'
    });
    return;
  }

  next();
};

/**
 * Require organization membership
 */
export const requireOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const organizationId = req.params.organizationId || req.body.organizationId || req.query.organizationId;

  if (!organizationId) {
    res.status(400).json({ error: 'Organization ID required' });
    return;
  }

  // Check if user is member of organization
  const memberResult = await query(
    `SELECT role FROM organization_members
     WHERE organization_id = $1 AND user_id = $2 AND status = 'active'`,
    [organizationId, req.user.id]
  );

  if (memberResult.rows.length === 0) {
    logger.warn('Organization access denied', {
      userId: req.user.id,
      organizationId
    });
    res.status(403).json({ error: 'Access denied to this organization' });
    return;
  }

  req.organizationId = organizationId;
  next();
};

/**
 * Rate limiting specifically for authentication endpoints
 */
export const authRateLimit = (maxAttempts: number = 5, windowMinutes: number = 15) => {
  const attempts = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || 'unknown';
    const now = Date.now();

    const record = attempts.get(key);

    if (record) {
      if (now > record.resetAt) {
        // Reset window
        attempts.set(key, { count: 1, resetAt: now + windowMinutes * 60 * 1000 });
      } else if (record.count >= maxAttempts) {
        const remainingTime = Math.ceil((record.resetAt - now) / 60000);
        res.status(429).json({
          error: 'Too many attempts',
          message: `Please try again in ${remainingTime} minutes`,
          retryAfter: remainingTime * 60
        });
        return;
      } else {
        record.count++;
      }
    } else {
      attempts.set(key, { count: 1, resetAt: now + windowMinutes * 60 * 1000 });
    }

    next();
  };
};

/**
 * Extract device information from request
 */
export const extractDeviceInfo = (req: Request) => {
  const userAgent = req.headers['user-agent'] || '';

  let deviceType = 'desktop';
  if (/mobile/i.test(userAgent)) deviceType = 'mobile';
  else if (/tablet|ipad/i.test(userAgent)) deviceType = 'tablet';

  let deviceName = 'Unknown Device';
  if (/iPhone/i.test(userAgent)) deviceName = 'iPhone';
  else if (/iPad/i.test(userAgent)) deviceName = 'iPad';
  else if (/Android/i.test(userAgent)) deviceName = 'Android Device';
  else if (/Macintosh/i.test(userAgent)) deviceName = 'Mac';
  else if (/Windows/i.test(userAgent)) deviceName = 'Windows PC';
  else if (/Linux/i.test(userAgent)) deviceName = 'Linux Device';

  return {
    ip_address: req.ip,
    user_agent: userAgent,
    device_type: deviceType,
    device_name: deviceName
  };
};
