/**
 * GDPR API Routes
 * Implements COMPLY-001: GDPR compliance API endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { gdprService, ConsentType } from '../services/gdpr.service';
import { logger } from '../config/logger';

const router = Router();

// ============================================================
// CONSENT MANAGEMENT
// ============================================================

/**
 * Get user's current consents
 */
router.get('/consents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const consents = await gdprService.getUserConsents(userId);

    res.json({
      userId,
      consents,
      consentTypes: Object.values(ConsentType).map((type) => ({
        type,
        name: formatConsentType(type),
        required: type === ConsentType.Essential,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update user consent
 */
router.post('/consents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { consentType, granted } = req.body;

    if (!consentType || !Object.values(ConsentType).includes(consentType)) {
      return res.status(400).json({ error: 'Invalid consent type' });
    }

    if (consentType === ConsentType.Essential && !granted) {
      return res.status(400).json({ error: 'Essential consent cannot be withdrawn' });
    }

    await gdprService.recordConsent({
      userId,
      consentType,
      granted,
      timestamp: new Date(),
      version: '1.0',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    logger.info('Consent updated', { userId, consentType, granted });

    res.json({ success: true, message: 'Consent updated' });
  } catch (error) {
    next(error);
  }
});

/**
 * Bulk update consents
 */
router.put('/consents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { consents } = req.body;

    if (!consents || typeof consents !== 'object') {
      return res.status(400).json({ error: 'Invalid consents object' });
    }

    for (const [consentType, granted] of Object.entries(consents)) {
      if (!Object.values(ConsentType).includes(consentType as ConsentType)) {
        continue;
      }

      if (consentType === ConsentType.Essential && !granted) {
        continue; // Skip essential consent withdrawal attempts
      }

      await gdprService.recordConsent({
        userId,
        consentType: consentType as ConsentType,
        granted: granted as boolean,
        timestamp: new Date(),
        version: '1.0',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
    }

    res.json({ success: true, message: 'Consents updated' });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// DATA EXPORT (Right to Data Portability)
// ============================================================

/**
 * Request data export
 */
router.post('/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const exportRequest = await gdprService.requestDataExport(userId);

    res.json({
      success: true,
      message: 'Data export request submitted',
      request: {
        id: exportRequest.id,
        status: exportRequest.status,
        requestedAt: exportRequest.requestedAt,
        estimatedCompletion: '24 hours',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get export request status
 */
router.get('/export/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get latest export request
    const request = await gdprService.requestDataExport(userId);

    res.json({
      request: {
        id: request.id,
        status: request.status,
        requestedAt: request.requestedAt,
        completedAt: request.completedAt,
        downloadUrl: request.status === 'completed' ? request.downloadUrl : null,
        expiresAt: request.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// RIGHT TO BE FORGOTTEN
// ============================================================

/**
 * Request account deletion
 */
router.post('/delete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { reason, confirmDelete } = req.body;

    if (!confirmDelete) {
      return res.status(400).json({
        error: 'Please confirm deletion by setting confirmDelete to true',
      });
    }

    const deletionRequest = await gdprService.requestDeletion(userId, reason);

    res.json({
      success: true,
      message: 'Account deletion scheduled',
      request: {
        scheduledFor: deletionRequest.scheduledFor,
        gracePeriodDays: 30,
        cancellationInfo: 'You can cancel this request within 30 days by logging in',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Cancel deletion request
 */
router.delete('/delete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await gdprService.cancelDeletion(userId);

    res.json({
      success: true,
      message: 'Deletion request cancelled',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get deletion request status
 */
router.get('/delete/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Query for pending deletion
    const result = await gdprService.requestDeletion(userId);

    res.json({
      hasPendingDeletion: result.status === 'pending',
      scheduledFor: result.scheduledFor,
      requestedAt: result.requestedAt,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// DATA RETENTION POLICIES
// ============================================================

/**
 * Get data retention policies
 */
router.get('/retention-policies', async (req: Request, res: Response) => {
  const policies = gdprService.getAllRetentionPolicies();

  res.json({
    policies: policies.map((p) => ({
      dataType: p.dataType,
      retentionPeriod: formatRetentionPeriod(p.retentionDays),
      description: p.description,
      legalBasis: p.legalBasis,
    })),
  });
});

// ============================================================
// PRIVACY INFORMATION
// ============================================================

/**
 * Get privacy information
 */
router.get('/privacy-info', async (req: Request, res: Response) => {
  res.json({
    dataController: {
      name: 'ClickView Inc.',
      address: '123 Main Street, San Francisco, CA 94102',
      email: 'privacy@clickview.app',
      dpo: 'dpo@clickview.app',
    },
    rights: [
      {
        name: 'Right to Access',
        description: 'You can request a copy of all your personal data',
        endpoint: 'POST /api/gdpr/export',
      },
      {
        name: 'Right to Rectification',
        description: 'You can update your personal information in your profile settings',
        endpoint: 'PUT /api/users/profile',
      },
      {
        name: 'Right to Erasure',
        description: 'You can request deletion of your account and all associated data',
        endpoint: 'POST /api/gdpr/delete',
      },
      {
        name: 'Right to Data Portability',
        description: 'You can export your data in a machine-readable format',
        endpoint: 'POST /api/gdpr/export',
      },
      {
        name: 'Right to Withdraw Consent',
        description: 'You can withdraw any optional consents at any time',
        endpoint: 'PUT /api/gdpr/consents',
      },
    ],
    processingActivities: [
      {
        purpose: 'Account Management',
        legalBasis: 'Contract performance',
        dataCategories: ['Account information', 'Contact details'],
      },
      {
        purpose: 'Dashboard Analytics',
        legalBasis: 'Contract performance',
        dataCategories: ['Usage data', 'Dashboard configurations'],
      },
      {
        purpose: 'Service Improvement',
        legalBasis: 'Legitimate interest',
        dataCategories: ['Aggregated usage statistics'],
      },
      {
        purpose: 'Marketing Communications',
        legalBasis: 'Consent',
        dataCategories: ['Email address', 'Communication preferences'],
      },
    ],
    thirdPartyProcessors: [
      {
        name: 'Amazon Web Services',
        purpose: 'Cloud infrastructure',
        location: 'United States (EU data processed in EU)',
      },
      {
        name: 'OpenAI',
        purpose: 'AI-powered features',
        location: 'United States',
      },
      {
        name: 'ClickUp',
        purpose: 'Data integration',
        location: 'United States',
      },
    ],
  });
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function formatConsentType(type: ConsentType): string {
  const names: Record<ConsentType, string> = {
    [ConsentType.Essential]: 'Essential Cookies',
    [ConsentType.Analytics]: 'Analytics Cookies',
    [ConsentType.Marketing]: 'Marketing Communications',
    [ConsentType.Personalization]: 'Personalization',
    [ConsentType.ThirdParty]: 'Third-Party Services',
    [ConsentType.DataProcessing]: 'Data Processing Agreement',
    [ConsentType.PrivacyPolicy]: 'Privacy Policy',
    [ConsentType.TermsOfService]: 'Terms of Service',
  };
  return names[type] || type;
}

function formatRetentionPeriod(days: number): string {
  if (days >= 365) {
    const years = Math.floor(days / 365);
    return years === 1 ? '1 year' : `${years} years`;
  } else if (days >= 30) {
    const months = Math.floor(days / 30);
    return months === 1 ? '1 month' : `${months} months`;
  } else {
    return `${days} days`;
  }
}

export default router;
