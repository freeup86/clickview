/**
 * Web Application Firewall Middleware
 * Implements INFRA-005: WAF security, OWASP protection, and threat detection
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { alertingService, AlertSeverity, AlertType } from '../monitoring/alerting';

// ============================================================
// WAF CONFIGURATION
// ============================================================

export interface WAFConfig {
  enabled: boolean;
  blockMode: boolean; // true = block, false = monitor only
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  ipBlacklist: string[];
  ipWhitelist: string[];
  geoBlocking: {
    enabled: boolean;
    blockedCountries: string[];
  };
  botProtection: {
    enabled: boolean;
    blockKnownBots: boolean;
    allowedBots: string[];
  };
  owaspRules: {
    sqlInjection: boolean;
    xss: boolean;
    pathTraversal: boolean;
    commandInjection: boolean;
    headerInjection: boolean;
  };
}

const defaultConfig: WAFConfig = {
  enabled: true,
  blockMode: true,
  rateLimit: {
    windowMs: 60000,
    maxRequests: 100,
  },
  ipBlacklist: [],
  ipWhitelist: [],
  geoBlocking: {
    enabled: false,
    blockedCountries: [],
  },
  botProtection: {
    enabled: true,
    blockKnownBots: false,
    allowedBots: ['googlebot', 'bingbot', 'slackbot'],
  },
  owaspRules: {
    sqlInjection: true,
    xss: true,
    pathTraversal: true,
    commandInjection: true,
    headerInjection: true,
  },
};

// ============================================================
// THREAT PATTERNS
// ============================================================

const SQL_INJECTION_PATTERNS = [
  /(\b(union|select|insert|update|delete|drop|truncate|alter|exec|execute)\b.*\b(from|into|table|database)\b)/i,
  /(\b(or|and)\b\s+\d+\s*=\s*\d+)/i,
  /(--|#|\/\*|\*\/)/,
  /(\bwaitfor\b.*\bdelay\b)/i,
  /(\bsleep\s*\(\s*\d+\s*\))/i,
  /('.*(\b(or|and)\b).*')/i,
];

const XSS_PATTERNS = [
  /<script[^>]*>[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<\s*img[^>]*\s+onerror/gi,
  /<\s*svg[^>]*\s+onload/gi,
  /data:text\/html/gi,
  /expression\s*\(/gi,
];

const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//g,
  /\.\.\\/g,
  /%2e%2e%2f/gi,
  /%2e%2e%5c/gi,
  /%252e%252e%252f/gi,
];

const COMMAND_INJECTION_PATTERNS = [
  /[;&|`$(){}]/,
  /\b(cat|ls|dir|type|wget|curl|nc|netcat|bash|sh|cmd|powershell)\b/i,
];

const HEADER_INJECTION_PATTERNS = [
  /\r\n/,
  /%0d%0a/gi,
  /%0a/gi,
  /%0d/gi,
];

// Known malicious user agents
const MALICIOUS_USER_AGENTS = [
  /sqlmap/i,
  /nikto/i,
  /nessus/i,
  /acunetix/i,
  /grabber/i,
  /w3af/i,
  /havij/i,
  /pangolin/i,
];

// ============================================================
// REQUEST TRACKING
// ============================================================

interface RequestTracker {
  count: number;
  firstRequest: number;
  blocked: boolean;
}

const requestTrackers = new Map<string, RequestTracker>();
const blockedIPs = new Set<string>();

// ============================================================
// WAF MIDDLEWARE
// ============================================================

export function createWAFMiddleware(config: Partial<WAFConfig> = {}) {
  const wafConfig: WAFConfig = { ...defaultConfig, ...config };

  return async (req: Request, res: Response, next: NextFunction) => {
    if (!wafConfig.enabled) {
      return next();
    }

    const clientIP = getClientIP(req);
    const requestPath = req.path;
    const userAgent = req.get('user-agent') || '';

    try {
      // 1. Check IP blocklist
      if (isIPBlocked(clientIP, wafConfig)) {
        return blockRequest(req, res, 'IP_BLOCKED', 'Your IP address has been blocked');
      }

      // 2. Check IP whitelist (skip other checks if whitelisted)
      if (isIPWhitelisted(clientIP, wafConfig)) {
        return next();
      }

      // 3. Rate limiting
      if (isRateLimited(clientIP, wafConfig)) {
        await logSecurityEvent(req, 'RATE_LIMIT_EXCEEDED', { ip: clientIP });
        return blockRequest(req, res, 'RATE_LIMITED', 'Too many requests');
      }

      // 4. Bot protection
      if (wafConfig.botProtection.enabled) {
        const botResult = checkBotProtection(userAgent, wafConfig);
        if (botResult.isBot && !botResult.allowed) {
          await logSecurityEvent(req, 'BOT_BLOCKED', { userAgent });
          return blockRequest(req, res, 'BOT_BLOCKED', 'Automated requests blocked');
        }
      }

      // 5. Malicious user agent check
      if (isMaliciousUserAgent(userAgent)) {
        await logSecurityEvent(req, 'MALICIOUS_USER_AGENT', { userAgent });
        return blockRequest(req, res, 'SECURITY_TOOL_DETECTED', 'Request blocked');
      }

      // 6. OWASP rule checks
      const owaspResult = checkOWASPRules(req, wafConfig);
      if (owaspResult.blocked) {
        await logSecurityEvent(req, owaspResult.rule, {
          pattern: owaspResult.pattern,
          input: owaspResult.input?.substring(0, 100),
        });

        if (wafConfig.blockMode) {
          return blockRequest(req, res, owaspResult.rule, 'Malicious request blocked');
        }
      }

      // 7. Request size validation
      const contentLength = parseInt(req.get('content-length') || '0');
      if (contentLength > 10 * 1024 * 1024) { // 10MB limit
        await logSecurityEvent(req, 'PAYLOAD_TOO_LARGE', { size: contentLength });
        return blockRequest(req, res, 'PAYLOAD_TOO_LARGE', 'Request too large');
      }

      // Request passed all checks
      next();

    } catch (error) {
      logger.error('WAF middleware error', { error, path: requestPath, ip: clientIP });
      // Fail open - don't block legitimate requests due to WAF errors
      next();
    }
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getClientIP(req: Request): string {
  const xForwardedFor = req.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  return req.ip || req.connection.remoteAddress || 'unknown';
}

function isIPBlocked(ip: string, config: WAFConfig): boolean {
  return blockedIPs.has(ip) || config.ipBlacklist.includes(ip);
}

function isIPWhitelisted(ip: string, config: WAFConfig): boolean {
  return config.ipWhitelist.includes(ip);
}

function isRateLimited(ip: string, config: WAFConfig): boolean {
  const now = Date.now();
  let tracker = requestTrackers.get(ip);

  if (!tracker) {
    tracker = { count: 1, firstRequest: now, blocked: false };
    requestTrackers.set(ip, tracker);
    return false;
  }

  // Reset if window expired
  if (now - tracker.firstRequest > config.rateLimit.windowMs) {
    tracker.count = 1;
    tracker.firstRequest = now;
    tracker.blocked = false;
    return false;
  }

  tracker.count++;

  if (tracker.count > config.rateLimit.maxRequests) {
    tracker.blocked = true;
    return true;
  }

  return false;
}

function checkBotProtection(
  userAgent: string,
  config: WAFConfig
): { isBot: boolean; allowed: boolean } {
  const userAgentLower = userAgent.toLowerCase();

  // Check if it's a known bot
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /headless/i,
    /phantom/i,
    /selenium/i,
    /puppeteer/i,
  ];

  const isBot = botPatterns.some((pattern) => pattern.test(userAgent));

  if (!isBot) {
    return { isBot: false, allowed: true };
  }

  // Check if it's an allowed bot
  const isAllowed = config.botProtection.allowedBots.some((bot) =>
    userAgentLower.includes(bot.toLowerCase())
  );

  return { isBot: true, allowed: isAllowed };
}

function isMaliciousUserAgent(userAgent: string): boolean {
  return MALICIOUS_USER_AGENTS.some((pattern) => pattern.test(userAgent));
}

function checkOWASPRules(
  req: Request,
  config: WAFConfig
): { blocked: boolean; rule?: string; pattern?: string; input?: string } {
  const checkInputs = [
    req.path,
    JSON.stringify(req.query),
    JSON.stringify(req.body),
    ...Object.values(req.headers).filter((h) => typeof h === 'string') as string[],
  ];

  for (const input of checkInputs) {
    if (!input || typeof input !== 'string') continue;

    // SQL Injection
    if (config.owaspRules.sqlInjection) {
      for (const pattern of SQL_INJECTION_PATTERNS) {
        if (pattern.test(input)) {
          return { blocked: true, rule: 'SQL_INJECTION', pattern: pattern.toString(), input };
        }
      }
    }

    // XSS
    if (config.owaspRules.xss) {
      for (const pattern of XSS_PATTERNS) {
        if (pattern.test(input)) {
          return { blocked: true, rule: 'XSS_ATTACK', pattern: pattern.toString(), input };
        }
      }
    }

    // Path Traversal
    if (config.owaspRules.pathTraversal) {
      for (const pattern of PATH_TRAVERSAL_PATTERNS) {
        if (pattern.test(input)) {
          return { blocked: true, rule: 'PATH_TRAVERSAL', pattern: pattern.toString(), input };
        }
      }
    }

    // Command Injection
    if (config.owaspRules.commandInjection) {
      for (const pattern of COMMAND_INJECTION_PATTERNS) {
        if (pattern.test(input)) {
          return { blocked: true, rule: 'COMMAND_INJECTION', pattern: pattern.toString(), input };
        }
      }
    }

    // Header Injection
    if (config.owaspRules.headerInjection) {
      for (const pattern of HEADER_INJECTION_PATTERNS) {
        if (pattern.test(input)) {
          return { blocked: true, rule: 'HEADER_INJECTION', pattern: pattern.toString(), input };
        }
      }
    }
  }

  return { blocked: false };
}

function blockRequest(
  req: Request,
  res: Response,
  reason: string,
  message: string
): void {
  logger.warn('WAF blocked request', {
    ip: getClientIP(req),
    path: req.path,
    method: req.method,
    reason,
    userAgent: req.get('user-agent'),
  });

  res.status(403).json({
    error: 'Forbidden',
    message,
    requestId: req.headers['x-request-id'] || 'unknown',
  });
}

async function logSecurityEvent(
  req: Request,
  eventType: string,
  details: Record<string, any>
): Promise<void> {
  const event = {
    type: eventType,
    ip: getClientIP(req),
    path: req.path,
    method: req.method,
    userAgent: req.get('user-agent'),
    timestamp: new Date(),
    ...details,
  };

  logger.warn('Security event', event);

  // Create alert for critical security events
  if (['SQL_INJECTION', 'XSS_ATTACK', 'COMMAND_INJECTION'].includes(eventType)) {
    await alertingService.createAlert(
      AlertType.Security,
      AlertSeverity.Warning,
      `Security threat detected: ${eventType}`,
      `Blocked ${eventType} attempt from ${event.ip}`,
      'waf-middleware',
      event
    );
  }
}

// ============================================================
// IP MANAGEMENT FUNCTIONS
// ============================================================

export function blockIP(ip: string, duration?: number): void {
  blockedIPs.add(ip);
  logger.info('IP blocked', { ip, duration });

  if (duration) {
    setTimeout(() => {
      blockedIPs.delete(ip);
      logger.info('IP unblocked', { ip });
    }, duration);
  }
}

export function unblockIP(ip: string): void {
  blockedIPs.delete(ip);
  logger.info('IP manually unblocked', { ip });
}

export function getBlockedIPs(): string[] {
  return Array.from(blockedIPs);
}

// ============================================================
// CLEANUP
// ============================================================

// Clean up old rate limit trackers every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, tracker] of requestTrackers) {
    if (now - tracker.firstRequest > 300000) { // 5 minutes
      requestTrackers.delete(ip);
    }
  }
}, 300000);

// ============================================================
// SECURITY HEADERS MIDDLEWARE
// ============================================================

export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Strict Transport Security
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Content Security Policy
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' wss: https:",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '));

  // Other security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Remove server header
  res.removeHeader('X-Powered-By');

  next();
}
