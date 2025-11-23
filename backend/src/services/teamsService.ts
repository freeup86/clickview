/**
 * Microsoft Teams Service
 *
 * Handles Microsoft Teams distribution for reports
 * Supports incoming webhooks and adaptive cards
 */

// ===================================================================
// TEAMS SERVICE
// ===================================================================

export interface TeamsMessageOptions {
  webhookUrl: string;
  title: string;
  text: string;
  themeColor?: string;
  sections?: TeamsSection[];
  potentialAction?: TeamsPotentialAction[];
}

export interface TeamsSection {
  activityTitle?: string;
  activitySubtitle?: string;
  activityImage?: string;
  facts?: Array<{
    name: string;
    value: string;
  }>;
  text?: string;
}

export interface TeamsPotentialAction {
  '@type': string;
  name: string;
  targets?: Array<{
    os: string;
    uri: string;
  }>;
}

export class TeamsService {
  constructor() {
    console.log('TeamsService initialized');
  }

  /**
   * Send a message to Microsoft Teams
   */
  async sendMessage(options: TeamsMessageOptions): Promise<void> {
    try {
      console.log(`[TeamsService] Sending message to Microsoft Teams`);

      if (!options.webhookUrl) {
        throw new Error('Webhook URL is required');
      }

      const payload: any = {
        '@type': 'MessageCard',
        '@context': 'https://schema.org/extensions',
        themeColor: options.themeColor || '0078D7',
        title: options.title,
        text: options.text,
      };

      if (options.sections && options.sections.length > 0) {
        payload.sections = options.sections;
      }

      if (options.potentialAction && options.potentialAction.length > 0) {
        payload.potentialAction = options.potentialAction;
      }

      const response = await fetch(options.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Teams API error: ${response.status} - ${errorText}`);
      }

      console.log('[TeamsService] Message sent successfully');
    } catch (error: any) {
      console.error('[TeamsService] Failed to send message:', error);
      throw new Error(`Teams message sending failed: ${error.message}`);
    }
  }

  /**
   * Send a report notification to Microsoft Teams
   */
  async sendReportNotification(
    webhookUrl: string,
    reportName: string,
    reportUrl?: string
  ): Promise<void> {
    const sections: TeamsSection[] = [
      {
        activityTitle: 'Report Generated',
        activitySubtitle: new Date().toLocaleString(),
        facts: [
          {
            name: 'Report Name',
            value: reportName,
          },
          {
            name: 'Status',
            value: 'Success',
          },
        ],
      },
    ];

    const potentialAction: TeamsPotentialAction[] | undefined = reportUrl
      ? [
          {
            '@type': 'OpenUri',
            name: 'View Report',
            targets: [
              {
                os: 'default',
                uri: reportUrl,
              },
            ],
          },
        ]
      : undefined;

    await this.sendMessage({
      webhookUrl,
      title: `📊 ${reportName}`,
      text: `Report "${reportName}" has been successfully generated.`,
      themeColor: '28A745', // Green
      sections,
      potentialAction,
    });
  }

  /**
   * Send a rich report card to Microsoft Teams
   */
  async sendReportCard(
    webhookUrl: string,
    reportName: string,
    stats: {
      executionTime: number;
      dataPoints: number;
      fileSize?: string;
    },
    reportUrl?: string
  ): Promise<void> {
    const facts = [
      {
        name: 'Execution Time',
        value: `${stats.executionTime}ms`,
      },
      {
        name: 'Data Points',
        value: stats.dataPoints.toString(),
      },
    ];

    if (stats.fileSize) {
      facts.push({
        name: 'File Size',
        value: stats.fileSize,
      });
    }

    facts.push({
      name: 'Generated At',
      value: new Date().toLocaleString(),
    });

    const sections: TeamsSection[] = [
      {
        activityTitle: 'Report Details',
        facts,
      },
    ];

    const potentialAction: TeamsPotentialAction[] | undefined = reportUrl
      ? [
          {
            '@type': 'OpenUri',
            name: 'View Report',
            targets: [
              {
                os: 'default',
                uri: reportUrl,
              },
            ],
          },
        ]
      : undefined;

    await this.sendMessage({
      webhookUrl,
      title: `📊 ${reportName}`,
      text: 'Report generated successfully',
      themeColor: '28A745', // Green
      sections,
      potentialAction,
    });
  }

  /**
   * Send an error notification to Microsoft Teams
   */
  async sendErrorNotification(
    webhookUrl: string,
    reportName: string,
    error: string
  ): Promise<void> {
    const sections: TeamsSection[] = [
      {
        activityTitle: 'Report Generation Failed',
        activitySubtitle: new Date().toLocaleString(),
        facts: [
          {
            name: 'Report Name',
            value: reportName,
          },
          {
            name: 'Status',
            value: 'Failed',
          },
          {
            name: 'Error',
            value: error,
          },
        ],
      },
    ];

    await this.sendMessage({
      webhookUrl,
      title: `❌ ${reportName}`,
      text: `Report generation failed: ${error}`,
      themeColor: 'DC3545', // Red
      sections,
    });
  }

  /**
   * Send an adaptive card (more modern format)
   */
  async sendAdaptiveCard(webhookUrl: string, card: any): Promise<void> {
    try {
      console.log(`[TeamsService] Sending adaptive card to Microsoft Teams`);

      if (!webhookUrl) {
        throw new Error('Webhook URL is required');
      }

      const payload = {
        type: 'message',
        attachments: [
          {
            contentType: 'application/vnd.microsoft.card.adaptive',
            contentUrl: null,
            content: card,
          },
        ],
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Teams API error: ${response.status} - ${errorText}`);
      }

      console.log('[TeamsService] Adaptive card sent successfully');
    } catch (error: any) {
      console.error('[TeamsService] Failed to send adaptive card:', error);
      throw new Error(`Teams adaptive card sending failed: ${error.message}`);
    }
  }

  /**
   * Test webhook connection
   */
  async testWebhook(webhookUrl: string): Promise<boolean> {
    try {
      await this.sendMessage({
        webhookUrl,
        title: 'Test Message',
        text: 'Test message from Report Builder - Webhook is working correctly!',
        themeColor: '0078D7',
      });
      return true;
    } catch (error) {
      console.error('[TeamsService] Webhook test failed:', error);
      return false;
    }
  }

  /**
   * Validate webhook URL format
   */
  validateWebhookUrl(webhookUrl: string): boolean {
    try {
      const url = new URL(webhookUrl);
      return (
        url.hostname.includes('office.com') ||
        url.hostname.includes('outlook.com') ||
        url.hostname.includes('microsoft.com')
      );
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const teamsService = new TeamsService();
