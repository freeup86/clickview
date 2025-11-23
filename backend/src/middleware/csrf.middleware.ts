/**
 * CSRF Protection Middleware
 *
 * Implements Cross-Site Request Forgery protection using the Double Submit Cookie pattern
 * and SameSite cookie attributes for defense in depth.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// CSRF token configuration
const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'X-XSRF-TOKEN';
const CSRF_FORM_FIELD = '_csrf';

// Methods that don't require CSRF protection (safe methods)
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

// Paths that should be exempt from CSRF (e.g., webhooks, API keys)
const EXEMPT_PATHS = [
  '/api/webhooks',
  '/api/health',
  '/api/metrics',
];

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('base64url');
}

/**
 * Set CSRF token cookie
 */
export function setCsrfCookie(res: Response, token: string): void {
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by client-side JS
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict', // Strict SameSite for additional protection
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/',
  });
}

/**
 * CSRF Protection Middleware
 *
 * Validates CSRF tokens on state-changing requests
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip CSRF check for safe methods
  if (SAFE_METHODS.includes(req.method)) {
    // Generate and set token for safe methods so clients can use it
    const token = generateCsrfToken();
    setCsrfCookie(res, token);
    (req as any).csrfToken = () => token;
    return next();
  }

  // Skip CSRF check for exempt paths
  if (EXEMPT_PATHS.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Skip CSRF check for API key authentication (no cookies)
  if (req.headers['x-api-key']) {
    return next();
  }

  // Get token from cookie
  const cookieToken = req.cookies[CSRF_COOKIE_NAME];

  // Get token from header or form field
  const headerToken = req.headers[CSRF_HEADER_NAME.toLowerCase()] as string;
  const bodyToken = req.body?.[CSRF_FORM_FIELD];
  const requestToken = headerToken || bodyToken;

  // Validate tokens exist
  if (!cookieToken) {
    return res.status(403).json({
      success: false,
      error: 'CSRF cookie not found',
      code: 'CSRF_COOKIE_MISSING',
    });
  }

  if (!requestToken) {
    return res.status(403).json({
      success: false,
      error: 'CSRF token not found in request',
      code: 'CSRF_TOKEN_MISSING',
      hint: `Include token in ${CSRF_HEADER_NAME} header or ${CSRF_FORM_FIELD} field`,
    });
  }

  // Validate tokens match (constant-time comparison)
  if (!crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(requestToken))) {
    return res.status(403).json({
      success: false,
      error: 'Invalid CSRF token',
      code: 'CSRF_TOKEN_INVALID',
    });
  }

  // Token is valid, generate new token for next request (token rotation)
  const newToken = generateCsrfToken();
  setCsrfCookie(res, newToken);
  (req as any).csrfToken = () => newToken;

  next();
}

/**
 * Middleware to provide CSRF token to views/responses
 */
export function csrfTokenProvider(req: Request, res: Response, next: NextFunction): void {
  // Make csrfToken function available
  if (!(req as any).csrfToken) {
    const token = generateCsrfToken();
    setCsrfCookie(res, token);
    (req as any).csrfToken = () => token;
  }

  // Add to response locals for template rendering
  res.locals.csrfToken = (req as any).csrfToken();

  next();
}

/**
 * Get CSRF token from request
 */
export function getCsrfToken(req: Request): string {
  return (req as any).csrfToken ? (req as any).csrfToken() : '';
}

/**
 * Conditional CSRF protection - only for web routes
 */
export function csrfProtectionWeb(req: Request, res: Response, next: NextFunction): void {
  // Only apply to web routes (not API routes using tokens)
  const isWebRoute = req.path.startsWith('/web') || req.path === '/';
  const hasSessionCookie = !!req.cookies['connect.sid'];

  if (isWebRoute || hasSessionCookie) {
    return csrfProtection(req, res, next);
  }

  next();
}

export default {
  csrfProtection,
  csrfTokenProvider,
  csrfProtectionWeb,
  generateCsrfToken,
  setCsrfCookie,
  getCsrfToken,
};
