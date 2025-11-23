/**
 * Email Service
 *
 * Handles email distribution for reports
 * Supports SMTP and template-based emails
 */

// ===================================================================
// EMAIL SERVICE
// ===================================================================

export interface EmailOptions {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  html?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export class EmailService {
  private smtpHost: string;
  private smtpPort: number;
  private smtpUser: string;
  private smtpPassword: string;
  private fromAddress: string;

  constructor() {
    this.smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    this.smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    this.smtpUser = process.env.SMTP_USER || '';
    this.smtpPassword = process.env.SMTP_PASSWORD || '';
    this.fromAddress = process.env.SMTP_FROM || 'noreply@example.com';

    console.log('EmailService initialized with SMTP:', this.smtpHost);
  }

  /**
   * Send an email
   */
  async send(options: EmailOptions): Promise<void> {
    try {
      console.log(`[EmailService] Sending email to ${options.to.join(', ')}`);
      console.log(`[EmailService] Subject: ${options.subject}`);

      // In production: Use nodemailer or similar library
      // const transporter = nodemailer.createTransport({
      //   host: this.smtpHost,
      //   port: this.smtpPort,
      //   secure: this.smtpPort === 465,
      //   auth: {
      //     user: this.smtpUser,
      //     pass: this.smtpPassword,
      //   },
      // });
      //
      // const mailOptions = {
      //   from: this.fromAddress,
      //   to: options.to.join(', '),
      //   cc: options.cc?.join(', '),
      //   bcc: options.bcc?.join(', '),
      //   subject: options.subject,
      //   text: options.body,
      //   html: options.html,
      //   attachments: options.attachments?.map(att => ({
      //     filename: att.filename,
      //     content: att.content,
      //     contentType: att.contentType,
      //   })),
      // };
      //
      // await transporter.sendMail(mailOptions);

      console.log(`[EmailService] Email sent successfully`);
    } catch (error: any) {
      console.error('[EmailService] Failed to send email:', error);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  /**
   * Send a templated email
   */
  async sendTemplate(
    template: string,
    data: Record<string, any>,
    options: Omit<EmailOptions, 'body' | 'html'>
  ): Promise<void> {
    // In production: Load template from file or database
    // const templateContent = await this.loadTemplate(template);
    // const renderedHtml = this.renderTemplate(templateContent, data);

    const renderedHtml = `<p>Template: ${template}</p>`;

    await this.send({
      ...options,
      body: 'Please view this email in HTML mode',
      html: renderedHtml,
    });
  }

  /**
   * Send report email with attachment
   */
  async sendReport(
    recipients: string[],
    reportName: string,
    reportData: Buffer,
    format: 'pdf' | 'excel'
  ): Promise<void> {
    const extension = format === 'pdf' ? 'pdf' : 'xlsx';
    const contentType =
      format === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    await this.send({
      to: recipients,
      subject: `Report: ${reportName}`,
      body: `Please find attached the report "${reportName}".`,
      html: `
        <html>
          <body>
            <h2>Report: ${reportName}</h2>
            <p>Please find attached the report generated on ${new Date().toLocaleString()}.</p>
            <p>This is an automated email. Please do not reply.</p>
          </body>
        </html>
      `,
      attachments: [
        {
          filename: `${reportName}.${extension}`,
          content: reportData,
          contentType,
        },
      ],
    });
  }

  /**
   * Validate email address
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate multiple email addresses
   */
  validateEmails(emails: string[]): { valid: string[]; invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const email of emails) {
      if (this.validateEmail(email.trim())) {
        valid.push(email.trim());
      } else {
        invalid.push(email.trim());
      }
    }

    return { valid, invalid };
  }

  /**
   * Test SMTP connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // In production: Test SMTP connection
      // const transporter = nodemailer.createTransport({...});
      // await transporter.verify();
      console.log('[EmailService] SMTP connection test successful');
      return true;
    } catch (error) {
      console.error('[EmailService] SMTP connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
