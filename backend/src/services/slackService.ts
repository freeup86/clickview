/**
 * Slack Service
 *
 * Handles Slack distribution for reports
 * Supports incoming webhooks and Slack API
 */

// ===================================================================
// SLACK SERVICE
// ===================================================================

export interface SlackMessageOptions {
  webhookUrl: string;
  channel?: string;
  message: string;
  attachments?: SlackAttachment[];
  blocks?: SlackBlock[];
}

export interface SlackAttachment {
  fallback?: string;
  color?: string;
  pretext?: string;
  author_name?: string;
  author_link?: string;
  author_icon?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: Array<{
    title: string;
    value: string;
    short?: boolean;
  }>;
  image_url?: string;
  thumb_url?: string;
  footer?: string;
  footer_icon?: string;
  ts?: number;
}

export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
  };
  [key: string]: any;
}

export class SlackService {
  constructor() {
    console.log('SlackService initialized');
  }

  /**
   * Send a message to Slack
   */
  async sendMessage(options: SlackMessageOptions): Promise<void> {
    try {
      console.log(`[SlackService] Sending message to Slack`);

      if (!options.webhookUrl) {
        throw new Error('Webhook URL is required');
      }

      const payload: any = {
        text: options.message,
      };

      if (options.channel) {
        payload.channel = options.channel;
      }

      if (options.attachments && options.attachments.length > 0) {
        payload.attachments = options.attachments;
      }

      if (options.blocks && options.blocks.length > 0) {
        payload.blocks = options.blocks;
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
        throw new Error(`Slack API error: ${response.status} - ${errorText}`);
      }

      console.log('[SlackService] Message sent successfully');
    } catch (error: any) {
      console.error('[SlackService] Failed to send message:', error);
      throw new Error(`Slack message sending failed: ${error.message}`);
    }
  }

  /**
   * Send a report notification to Slack
   */
  async sendReportNotification(
    webhookUrl: string,
    reportName: string,
    reportUrl?: string,
    channel?: string
  ): Promise<void> {
    const attachments: SlackAttachment[] = [
      {
        fallback: `Report "${reportName}" has been generated`,
        color: '#36a64f',
        title: reportName,
        title_link: reportUrl,
        text: 'A new report has been generated and is ready to view.',
        fields: [
          {
            title: 'Generated At',
            value: new Date().toLocaleString(),
            short: true,
          },
          {
            title: 'Status',
            value: 'Success',
            short: true,
          },
        ],
        footer: 'Report Builder',
        footer_icon: 'https://platform.slack-edge.com/img/default_application_icon.png',
        ts: Math.floor(Date.now() / 1000),
      },
    ];

    await this.sendMessage({
      webhookUrl,
      channel,
      message: `Report "${reportName}" has been generated`,
      attachments,
    });
  }

  /**
   * Send a rich report card to Slack using blocks
   */
  async sendReportCard(
    webhookUrl: string,
    reportName: string,
    stats: {
      executionTime: number;
      dataPoints: number;
      fileSize?: string;
    },
    reportUrl?: string,
    channel?: string
  ): Promise<void> {
    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `📊 ${reportName}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Report generated successfully on ${new Date().toLocaleString()}`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Execution Time:*\n${stats.executionTime}ms`,
          },
          {
            type: 'mrkdwn',
            text: `*Data Points:*\n${stats.dataPoints}`,
          },
        ],
      },
    ];

    if (stats.fileSize) {
      blocks[2].fields.push({
        type: 'mrkdwn',
        text: `*File Size:*\n${stats.fileSize}`,
      });
    }

    if (reportUrl) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Report',
            },
            url: reportUrl,
            style: 'primary',
          },
        ],
      });
    }

    await this.sendMessage({
      webhookUrl,
      channel,
      message: `Report "${reportName}" has been generated`,
      blocks,
    });
  }

  /**
   * Send an error notification to Slack
   */
  async sendErrorNotification(
    webhookUrl: string,
    reportName: string,
    error: string,
    channel?: string
  ): Promise<void> {
    const attachments: SlackAttachment[] = [
      {
        fallback: `Report "${reportName}" generation failed`,
        color: '#ff0000',
        title: `❌ ${reportName}`,
        text: `Report generation failed with error:\n\`\`\`${error}\`\`\``,
        fields: [
          {
            title: 'Failed At',
            value: new Date().toLocaleString(),
            short: true,
          },
          {
            title: 'Status',
            value: 'Failed',
            short: true,
          },
        ],
        footer: 'Report Builder',
        ts: Math.floor(Date.now() / 1000),
      },
    ];

    await this.sendMessage({
      webhookUrl,
      channel,
      message: `Report "${reportName}" generation failed`,
      attachments,
    });
  }

  /**
   * Test webhook connection
   */
  async testWebhook(webhookUrl: string): Promise<boolean> {
    try {
      await this.sendMessage({
        webhookUrl,
        message: 'Test message from Report Builder - Webhook is working correctly!',
      });
      return true;
    } catch (error) {
      console.error('[SlackService] Webhook test failed:', error);
      return false;
    }
  }

  /**
   * Validate webhook URL format
   */
  validateWebhookUrl(webhookUrl: string): boolean {
    try {
      const url = new URL(webhookUrl);
      return url.hostname === 'hooks.slack.com';
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const slackService = new SlackService();
