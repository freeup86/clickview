/**
 * Enterprise Report Builder Service
 *
 * Phase 4 - REPORT-001 Implementation
 * Handles report creation, management, and execution
 */

import { Report, ReportElement, ReportSchedule } from '../types/reports';
import { DatabaseService } from './databaseService';
import { QueryService } from './queryService';
import { CacheService } from './cacheService';
import { ExportService } from './exportService';

// ===================================================================
// REPORT BUILDER SERVICE
// ===================================================================

export class ReportBuilderService {
  private db: DatabaseService;
  private queryService: QueryService;
  private cacheService: CacheService;
  private exportService: ExportService;

  constructor() {
    this.db = new DatabaseService();
    this.queryService = new QueryService();
    this.cacheService = new CacheService();
    this.exportService = new ExportService();
  }

  // ===================================================================
  // REPORT CRUD OPERATIONS
  // ===================================================================

  /**
   * Create a new report
   */
  async createReport(report: Omit<Report, 'id' | 'createdAt' | 'updatedAt'>): Promise<Report> {
    const newReport: Report = {
      ...report,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };

    await this.db.insert('reports', newReport);

    // Clear cache
    await this.cacheService.invalidate(`reports:*`);

    return newReport;
  }

  /**
   * Get report by ID
   */
  async getReport(reportId: string, userId?: string): Promise<Report | null> {
    // Check cache first
    const cacheKey = `report:${reportId}`;
    const cached = await this.cacheService.get<Report>(cacheKey);
    if (cached) return cached;

    const report = await this.db.findOne<Report>('reports', { id: reportId });

    if (!report) return null;

    // Check permissions
    if (userId && !this.hasPermission(report, userId, 'read')) {
      throw new Error('Unauthorized access to report');
    }

    // Cache the result
    await this.cacheService.set(cacheKey, report, 300); // 5 minutes TTL

    return report;
  }

  /**
   * List reports with filters
   */
  async listReports(filters: {
    userId?: string;
    category?: string;
    tags?: string[];
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ reports: Report[]; total: number }> {
    const { userId, category, tags, search, limit = 20, offset = 0 } = filters;

    const query: any = {};

    if (userId) {
      query.$or = [
        { createdBy: userId },
        { 'permissions.users': userId },
        { 'permissions.public': true },
      ];
    }

    if (category) {
      query.category = category;
    }

    if (tags && tags.length > 0) {
      query.tags = { $in: tags };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const [reports, total] = await Promise.all([
      this.db.find<Report>('reports', query, { limit, skip: offset, sort: { updatedAt: -1 } }),
      this.db.count('reports', query),
    ]);

    return { reports, total };
  }

  /**
   * Update report
   */
  async updateReport(
    reportId: string,
    updates: Partial<Report>,
    userId: string
  ): Promise<Report> {
    const report = await this.getReport(reportId);

    if (!report) {
      throw new Error('Report not found');
    }

    if (!this.hasPermission(report, userId, 'write')) {
      throw new Error('Unauthorized to update report');
    }

    const updatedReport: Report = {
      ...report,
      ...updates,
      updatedAt: new Date(),
      version: report.version + 1,
    };

    await this.db.update('reports', { id: reportId }, updatedReport);

    // Clear cache
    await this.cacheService.invalidate(`report:${reportId}`);
    await this.cacheService.invalidate(`reports:*`);

    return updatedReport;
  }

  /**
   * Delete report
   */
  async deleteReport(reportId: string, userId: string): Promise<void> {
    const report = await this.getReport(reportId);

    if (!report) {
      throw new Error('Report not found');
    }

    if (!this.hasPermission(report, userId, 'delete')) {
      throw new Error('Unauthorized to delete report');
    }

    await this.db.delete('reports', { id: reportId });

    // Clear cache
    await this.cacheService.invalidate(`report:${reportId}`);
    await this.cacheService.invalidate(`reports:*`);
  }

  /**
   * Duplicate report
   */
  async duplicateReport(reportId: string, userId: string, newName?: string): Promise<Report> {
    const originalReport = await this.getReport(reportId, userId);

    if (!originalReport) {
      throw new Error('Report not found');
    }

    const duplicatedReport: Omit<Report, 'id' | 'createdAt' | 'updatedAt'> = {
      ...originalReport,
      name: newName || `${originalReport.name} (Copy)`,
      createdBy: userId,
      version: 1,
    };

    return await this.createReport(duplicatedReport);
  }

  // ===================================================================
  // REPORT ELEMENT OPERATIONS
  // ===================================================================

  /**
   * Add element to report
   */
  async addElement(
    reportId: string,
    element: Omit<ReportElement, 'id'>,
    userId: string
  ): Promise<Report> {
    const report = await this.getReport(reportId, userId);

    if (!report) {
      throw new Error('Report not found');
    }

    if (!this.hasPermission(report, userId, 'write')) {
      throw new Error('Unauthorized to update report');
    }

    const newElement: ReportElement = {
      ...element,
      id: this.generateId(),
    } as ReportElement;

    report.elements.push(newElement);

    return await this.updateReport(reportId, { elements: report.elements }, userId);
  }

  /**
   * Update element in report
   */
  async updateElement(
    reportId: string,
    elementId: string,
    updates: Partial<ReportElement>,
    userId: string
  ): Promise<Report> {
    const report = await this.getReport(reportId, userId);

    if (!report) {
      throw new Error('Report not found');
    }

    if (!this.hasPermission(report, userId, 'write')) {
      throw new Error('Unauthorized to update report');
    }

    const elementIndex = report.elements.findIndex((el) => el.id === elementId);

    if (elementIndex === -1) {
      throw new Error('Element not found');
    }

    report.elements[elementIndex] = {
      ...report.elements[elementIndex],
      ...updates,
    };

    return await this.updateReport(reportId, { elements: report.elements }, userId);
  }

  /**
   * Delete element from report
   */
  async deleteElement(reportId: string, elementId: string, userId: string): Promise<Report> {
    const report = await this.getReport(reportId, userId);

    if (!report) {
      throw new Error('Report not found');
    }

    if (!this.hasPermission(report, userId, 'write')) {
      throw new Error('Unauthorized to update report');
    }

    report.elements = report.elements.filter((el) => el.id !== elementId);

    return await this.updateReport(reportId, { elements: report.elements }, userId);
  }

  // ===================================================================
  // REPORT EXECUTION
  // ===================================================================

  /**
   * Execute report and fetch all data
   */
  async executeReport(reportId: string, parameters?: Record<string, any>): Promise<{
    report: Report;
    data: Record<string, any>;
    executionTime: number;
  }> {
    const startTime = Date.now();

    const report = await this.getReport(reportId);

    if (!report) {
      throw new Error('Report not found');
    }

    // Fetch data for each element
    const data: Record<string, any> = {};

    await Promise.all(
      report.elements.map(async (element) => {
        if (element.dataSource) {
          try {
            const elementData = await this.fetchElementData(element, parameters);
            data[element.id] = elementData;
          } catch (error) {
            console.error(`Failed to fetch data for element ${element.id}:`, error);
            data[element.id] = null;
          }
        }
      })
    );

    const executionTime = Date.now() - startTime;

    return {
      report,
      data,
      executionTime,
    };
  }

  /**
   * Fetch data for a specific element
   */
  private async fetchElementData(
    element: ReportElement,
    parameters?: Record<string, any>
  ): Promise<any> {
    if (!element.dataSource) return null;

    const { type, query, apiEndpoint, data: staticData } = element.dataSource;

    switch (type) {
      case 'query':
        if (query) {
          return await this.queryService.execute(query, parameters);
        }
        return null;

      case 'api':
        if (apiEndpoint) {
          const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parameters || {}),
          });
          return await response.json();
        }
        return null;

      case 'static':
        return staticData;

      default:
        return null;
    }
  }

  // ===================================================================
  // REPORT EXPORT
  // ===================================================================

  /**
   * Export report to PDF
   */
  async exportToPDF(reportId: string, userId?: string): Promise<Buffer> {
    const { report, data } = await this.executeReport(reportId);

    // Check permissions
    if (userId && !this.hasPermission(report, userId, 'read')) {
      throw new Error('Unauthorized access to report');
    }

    return await this.exportService.exportToPDF(report, data);
  }

  /**
   * Export report to Excel
   */
  async exportToExcel(reportId: string, userId?: string): Promise<Buffer> {
    const { report, data } = await this.executeReport(reportId);

    // Check permissions
    if (userId && !this.hasPermission(report, userId, 'read')) {
      throw new Error('Unauthorized access to report');
    }

    return await this.exportService.exportToExcel(report, data);
  }

  // ===================================================================
  // PERMISSIONS
  // ===================================================================

  /**
   * Check if user has permission to perform action on report
   */
  private hasPermission(
    report: Report,
    userId: string,
    action: 'read' | 'write' | 'delete'
  ): boolean {
    // Owner has all permissions
    if (report.createdBy === userId) {
      return true;
    }

    if (!report.permissions) {
      return false;
    }

    // Public read permission
    if (action === 'read' && report.permissions.public) {
      return true;
    }

    // Check user-specific permissions
    const userPermission = report.permissions.users?.find((p) => p.userId === userId);

    if (!userPermission) {
      return false;
    }

    switch (action) {
      case 'read':
        return ['read', 'write', 'admin'].includes(userPermission.role);
      case 'write':
        return ['write', 'admin'].includes(userPermission.role);
      case 'delete':
        return userPermission.role === 'admin';
      default:
        return false;
    }
  }

  // ===================================================================
  // UTILITIES
  // ===================================================================

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const reportBuilderService = new ReportBuilderService();
