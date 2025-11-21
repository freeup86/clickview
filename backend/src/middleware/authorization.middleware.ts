/**
 * Authorization Middleware - Advanced Access Control
 *
 * Extends authentication with:
 * - Resource-level permission checks
 * - ABAC policy enforcement
 * - Sensitivity-based access control
 * - Column filtering and data masking
 */

import { Request, Response, NextFunction } from 'express';
import { AuthorizationService, AuthorizationContext, PermissionCheck } from '../services/authorization.service';

// Extend Express Request to include authorization context
declare global {
  namespace Express {
    interface Request {
      authContext?: AuthorizationContext;
      maskData?: (data: any) => Promise<any>;
    }
  }
}

/**
 * Middleware to build authorization context from authenticated user
 * Should be used after authentication middleware
 */
export const buildAuthContext = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Build authorization context
    req.authContext = {
      userId: req.user.id,
      sessionId: req.session?.id || '',
      organizationId: req.user.organizationId,
      roles: req.user.roles || [],
      permissions: req.user.permissions || [],
      attributes: {
        department: req.user.department,
        level: req.user.level,
        location: req.user.location,
        mfa_verified: req.user.mfaVerified || false
      },
      environment: {
        ipAddress: (req.ip || req.socket.remoteAddress || '').replace('::ffff:', ''),
        userAgent: req.headers['user-agent'] || '',
        timestamp: new Date(),
        deviceType: req.headers['x-device-type'] as string
      }
    };

    // Add data masking helper
    req.maskData = async (data: any) => {
      return await maskResponseData(data, req.authContext!);
    };

    next();
  } catch (error) {
    console.error('Error building auth context:', error);
    res.status(500).json({ error: 'Authorization error' });
  }
};

/**
 * Require resource permission
 * Usage: requireResourcePermission('dashboard', 'read')
 */
export const requireResourcePermission = (
  resourceType: string,
  action: string
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.authContext) {
        res.status(401).json({ error: 'Authorization context not found' });
        return;
      }

      // Get resource ID from params
      const resourceId = req.params.id || req.params.resourceId;

      if (!resourceId) {
        res.status(400).json({ error: 'Resource ID required' });
        return;
      }

      const check: PermissionCheck = {
        resourceType,
        resourceId,
        action
      };

      const hasPermission = await AuthorizationService.checkPermission(
        req.authContext,
        check
      );

      if (!hasPermission) {
        res.status(403).json({
          error: 'Insufficient permissions',
          required: `${resourceType}:${action}`,
          resource: resourceId
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Authorization error' });
    }
  };
};

/**
 * Require any of the specified resource permissions
 */
export const requireAnyResourcePermission = (
  resourceType: string,
  actions: string[]
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.authContext) {
        res.status(401).json({ error: 'Authorization context not found' });
        return;
      }

      const resourceId = req.params.id || req.params.resourceId;

      if (!resourceId) {
        res.status(400).json({ error: 'Resource ID required' });
        return;
      }

      // Check if user has any of the required permissions
      for (const action of actions) {
        const check: PermissionCheck = {
          resourceType,
          resourceId,
          action
        };

        const hasPermission = await AuthorizationService.checkPermission(
          req.authContext,
          check
        );

        if (hasPermission) {
          next();
          return;
        }
      }

      res.status(403).json({
        error: 'Insufficient permissions',
        required: `${resourceType}:[${actions.join('|')}]`,
        resource: resourceId
      });
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Authorization error' });
    }
  };
};

/**
 * Check sensitivity-based access control
 */
export const checkSensitivityAccess = (resourceType: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.authContext) {
        res.status(401).json({ error: 'Authorization context not found' });
        return;
      }

      const resourceId = req.params.id || req.params.resourceId;

      if (!resourceId) {
        res.status(400).json({ error: 'Resource ID required' });
        return;
      }

      const result = await AuthorizationService.checkSensitivityAccess(
        req.authContext,
        resourceType,
        resourceId
      );

      if (!result.allowed) {
        res.status(403).json({
          error: 'Access denied',
          reason: result.reason
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Sensitivity check error:', error);
      res.status(500).json({ error: 'Authorization error' });
    }
  };
};

/**
 * Apply column-level security to response data
 */
export const applyColumnSecurity = (tableName: string, schemaName: string = 'public') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.authContext) {
        res.status(401).json({ error: 'Authorization context not found' });
        return;
      }

      // Get column permissions
      const columnPermissions = await AuthorizationService.getColumnPermissions(
        req.authContext,
        tableName,
        schemaName
      );

      // Get masking rules
      const maskingRules = await AuthorizationService.getColumnMaskingRules(
        tableName,
        schemaName
      );

      // Store for use in response
      (req as any).columnPermissions = columnPermissions;
      (req as any).maskingRules = maskingRules;

      // Intercept res.json to apply column filtering
      const originalJson = res.json.bind(res);
      res.json = function(data: any) {
        const filtered = applyColumnFiltering(
          data,
          columnPermissions,
          maskingRules,
          req.authContext!
        );
        return originalJson(filtered);
      };

      next();
    } catch (error) {
      console.error('Column security error:', error);
      res.status(500).json({ error: 'Authorization error' });
    }
  };
};

/**
 * Apply column filtering to data
 */
function applyColumnFiltering(
  data: any,
  permissions: Map<string, string>,
  maskingRules: Map<string, any>,
  context: AuthorizationContext
): any {
  if (Array.isArray(data)) {
    return data.map(item => applyColumnFiltering(item, permissions, maskingRules, context));
  }

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const filtered: any = {};

    for (const [column, value] of Object.entries(data)) {
      const permission = permissions.get(column);

      // No explicit permission = allow by default
      if (!permission || permission === 'read' || permission === 'write') {
        // Check if masking is required
        if (maskingRules.has(column)) {
          const rule = maskingRules.get(column);
          // Apply masking synchronously (would need to be async in production)
          filtered[column] = value; // Masking would be applied here
        } else {
          filtered[column] = value;
        }
      } else if (permission === 'masked') {
        // Always mask
        if (maskingRules.has(column)) {
          const rule = maskingRules.get(column);
          filtered[column] = value; // Masking would be applied here
        } else {
          filtered[column] = '***';
        }
      }
      // permission === 'none' = exclude column
    }

    return filtered;
  }

  return data;
}

/**
 * Apply data masking to response
 */
async function maskResponseData(
  data: any,
  context: AuthorizationContext
): Promise<any> {
  // This would implement full data masking logic
  // For now, return data as-is
  return data;
}

/**
 * Enforce ownership - user can only access their own resources
 */
export const enforceOwnership = (ownerField: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.authContext) {
      res.status(401).json({ error: 'Authorization context not found' });
      return;
    }

    // Add ownership filter to query
    if (!req.query.filters) {
      req.query.filters = {};
    }

    (req.query.filters as any)[ownerField] = req.authContext.userId;

    next();
  };
};

/**
 * Log authorization decisions for audit
 */
export const logAuthorizationDecision = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.authContext) {
      next();
      return;
    }

    // Store original end function
    const originalEnd = res.end.bind(res);

    // Override end to log decision
    res.end = function(chunk?: any, encoding?: any, callback?: any): any {
      // Log authorization decision
      const decision = {
        userId: req.authContext!.userId,
        resource: req.path,
        method: req.method,
        statusCode: res.statusCode,
        timestamp: new Date(),
        ipAddress: req.authContext!.environment.ipAddress
      };

      // Async logging (don't wait)
      logAuthDecision(decision).catch(console.error);

      // Call original end
      return originalEnd(chunk, encoding, callback);
    };

    next();
  } catch (error) {
    console.error('Error in auth logging middleware:', error);
    next();
  }
};

/**
 * Log authorization decision to database
 */
async function logAuthDecision(decision: any): Promise<void> {
  // Would log to audit_logs table
  // Implementation would be added here
}

/**
 * Rate limiting based on user permissions
 */
export const permissionBasedRateLimit = (
  defaultLimit: number = 100,
  premiumLimit: number = 1000
) => {
  const requestCounts = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.authContext) {
      res.status(401).json({ error: 'Authorization context not found' });
      return;
    }

    const userId = req.authContext.userId;
    const now = Date.now();

    // Determine rate limit based on permissions/roles
    const isPremium = req.authContext.roles.some(role =>
      ['admin', 'premium', 'enterprise'].includes(role)
    );
    const limit = isPremium ? premiumLimit : defaultLimit;

    // Get or create user's request count
    let userCount = requestCounts.get(userId);

    if (!userCount || userCount.resetAt < now) {
      // Reset window (1 minute)
      userCount = {
        count: 0,
        resetAt: now + 60000
      };
      requestCounts.set(userId, userCount);
    }

    // Increment count
    userCount.count++;

    // Check limit
    if (userCount.count > limit) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        limit,
        resetAt: new Date(userCount.resetAt).toISOString()
      });
      return;
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', (limit - userCount.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(userCount.resetAt).toISOString());

    next();
  };
};

/**
 * Combine multiple authorization checks
 */
export const requireAll = (...middlewares: any[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    for (const middleware of middlewares) {
      await new Promise((resolve, reject) => {
        middleware(req, res, (err: any) => {
          if (err) reject(err);
          else resolve(true);
        });
      });
    }
    next();
  };
};
