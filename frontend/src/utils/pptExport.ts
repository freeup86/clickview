/**
 * PowerPoint Export Utility
 *
 * Generate PowerPoint presentations from report data:
 * - Multiple slides support
 * - Title slides and section dividers
 * - Charts and visualizations
 * - Tables with formatting
 * - Text boxes and images
 * - Custom themes and layouts
 * - Speaker notes
 */

import pptxgen from 'pptxgenjs';
import { Report, ReportElement, ReportElementType, ChartElement, TableElement, TextElement, MetricCardElement } from '../types/reports';

// ===================================================================
// POWERPOINT EXPORTER CLASS
// ===================================================================

export class PowerPointExporter {
  private pres: pptxgen;
  private options: PowerPointExportOptions;

  constructor(options: PowerPointExportOptions = {}) {
    this.pres = new pptxgen();
    this.options = {
      layout: 'LAYOUT_16x9',
      theme: 'default',
      includeCharts: true,
      includeTables: true,
      includeMetrics: true,
      ...options,
    };

    // Set presentation properties
    this.pres.author = options.author || 'ClickView';
    this.pres.company = options.company || 'ClickView';
    this.pres.title = options.title || 'Report';
    this.pres.subject = options.subject || 'Automated Report';

    // Set layout
    this.pres.layout = options.layout || 'LAYOUT_16x9';

    // Apply theme
    this.applyTheme(options.theme || 'default');
  }

  /**
   * Export a complete report to PowerPoint
   */
  public async exportReport(report: Report): Promise<Blob> {
    // Title slide
    this.addTitleSlide(report.name, report.description || '');

    // Group elements by type
    const metrics = report.elements.filter((e) => e.type === ReportElementType.METRIC_CARD) as MetricCardElement[];
    const charts = report.elements.filter((e) => e.type === ReportElementType.CHART) as ChartElement[];
    const tables = report.elements.filter((e) => e.type === ReportElementType.TABLE) as TableElement[];

    // Metrics overview slide
    if (this.options.includeMetrics && metrics.length > 0) {
      this.addMetricsSlide(metrics);
    }

    // Chart slides
    if (this.options.includeCharts) {
      for (const chart of charts) {
        await this.addChartSlide(chart);
      }
    }

    // Table slides
    if (this.options.includeTables) {
      for (const table of tables) {
        await this.addTableSlide(table);
      }
    }

    // Summary slide
    this.addSummarySlide(report);

    // Generate presentation
    return await this.pres.write({ outputType: 'blob' }) as Blob;
  }

  /**
   * Add title slide
   */
  private addTitleSlide(title: string, subtitle: string): void {
    const slide = this.pres.addSlide();

    // Title
    slide.addText(title, {
      x: 0.5,
      y: 2.5,
      w: 9,
      h: 1.5,
      fontSize: 44,
      bold: true,
      align: 'center',
      color: '363636',
    });

    // Subtitle
    if (subtitle) {
      slide.addText(subtitle, {
        x: 0.5,
        y: 4,
        w: 9,
        h: 0.75,
        fontSize: 24,
        align: 'center',
        color: '666666',
      });
    }

    // Date
    slide.addText(new Date().toLocaleDateString(), {
      x: 0.5,
      y: 5,
      w: 9,
      h: 0.5,
      fontSize: 16,
      align: 'center',
      color: '999999',
    });
  }

  /**
   * Add metrics overview slide
   */
  private addMetricsSlide(metrics: MetricCardElement[]): void {
    const slide = this.pres.addSlide();

    // Slide title
    slide.addText('Key Metrics', {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.75,
      fontSize: 32,
      bold: true,
      color: '363636',
    });

    // Layout metrics in grid
    const metricsPerRow = 3;
    const cardWidth = 3;
    const cardHeight = 1.5;
    const spacing = 0.2;

    metrics.slice(0, 6).forEach((metric, index) => {
      const row = Math.floor(index / metricsPerRow);
      const col = index % metricsPerRow;

      const x = 0.5 + col * (cardWidth + spacing);
      const y = 1.5 + row * (cardHeight + spacing);

      // Metric card background
      slide.addShape('rect', {
        x,
        y,
        w: cardWidth,
        h: cardHeight,
        fill: { color: 'F5F5F5' },
        line: { color: 'DDDDDD', width: 1 },
      });

      // Metric label
      slide.addText(metric.metric.label, {
        x: x + 0.2,
        y: y + 0.2,
        w: cardWidth - 0.4,
        h: 0.4,
        fontSize: 14,
        color: '666666',
      });

      // Metric value (placeholder)
      const value = `${metric.metric.prefix || ''}0${metric.metric.suffix || ''}`;
      slide.addText(value, {
        x: x + 0.2,
        y: y + 0.7,
        w: cardWidth - 0.4,
        h: 0.6,
        fontSize: 28,
        bold: true,
        color: '363636',
      });
    });
  }

  /**
   * Add chart slide
   */
  private async addChartSlide(chart: ChartElement): Promise<void> {
    const slide = this.pres.addSlide();

    // Slide title
    slide.addText(chart.name, {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.6,
      fontSize: 28,
      bold: true,
      color: '363636',
    });

    // Chart placeholder (in production, would render actual chart)
    slide.addShape('rect', {
      x: 1,
      y: 1.5,
      w: 8,
      h: 4,
      fill: { color: 'F0F0F0' },
      line: { color: 'CCCCCC', width: 1 },
    });

    slide.addText('Chart Visualization', {
      x: 1,
      y: 3.25,
      w: 8,
      h: 0.5,
      fontSize: 18,
      align: 'center',
      color: '999999',
    });

    // Add chart type and description
    slide.addText(`Type: ${chart.chartType}`, {
      x: 1,
      y: 5.75,
      w: 8,
      h: 0.4,
      fontSize: 12,
      color: '666666',
    });

    // Speaker notes
    slide.addNotes(
      `This slide displays a ${chart.chartType} chart showing ${chart.name}. ` +
      `Data is refreshed ${chart.refreshInterval ? `every ${chart.refreshInterval} seconds` : 'on demand'}.`
    );
  }

  /**
   * Add table slide
   */
  private async addTableSlide(table: TableElement): Promise<void> {
    const slide = this.pres.addSlide();

    // Slide title
    slide.addText(table.name, {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.6,
      fontSize: 28,
      bold: true,
      color: '363636',
    });

    // Prepare table data
    const columns = table.columns.filter((col) => col.visible !== false);

    // Table headers
    const headerRow = columns.map((col) => ({
      text: col.header,
      options: {
        bold: true,
        fill: { color: '4472C4' },
        color: 'FFFFFF',
        align: 'center' as const,
      },
    }));

    // Sample data rows (in production, would use actual data)
    const dataRows = Array(5).fill(null).map(() =>
      columns.map((col) => ({
        text: 'Sample',
        options: { align: (col.align || 'left') as any },
      }))
    );

    // Add table
    slide.addTable([headerRow, ...dataRows], {
      x: 0.5,
      y: 1.5,
      w: 9,
      h: 4,
      colW: columns.map(() => 9 / columns.length),
      border: { type: 'solid', pt: 1, color: 'CCCCCC' },
      fontSize: 12,
    });

    // Pagination info (if enabled)
    if (table.pagination?.enabled) {
      slide.addText(`Page size: ${table.pagination.pageSize} rows`, {
        x: 0.5,
        y: 5.75,
        w: 9,
        h: 0.4,
        fontSize: 10,
        color: '999999',
      });
    }
  }

  /**
   * Add summary slide
   */
  private addSummarySlide(report: Report): void {
    const slide = this.pres.addSlide();

    // Title
    slide.addText('Summary', {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.75,
      fontSize: 32,
      bold: true,
      color: '363636',
    });

    // Report metadata
    const metadata = [
      `Report: ${report.name}`,
      `Created: ${report.createdAt.toLocaleDateString()}`,
      `Version: ${report.version}`,
      `Elements: ${report.elements.length}`,
      '',
      'This report was automatically generated by ClickView.',
    ];

    slide.addText(metadata.join('\n'), {
      x: 1,
      y: 1.5,
      w: 8,
      h: 4,
      fontSize: 16,
      color: '666666',
      lineSpacing: 24,
    });
  }

  /**
   * Apply theme to presentation
   */
  private applyTheme(theme: string): void {
    if (theme === 'corporate') {
      this.pres.defineLayout({
        name: 'CUSTOM',
        width: 10,
        height: 5.625,
      });
    } else if (theme === 'modern') {
      // Modern theme settings
    }
    // Default theme is already applied
  }

  // ===================================================================
  // STATIC CONVENIENCE METHODS
  // ===================================================================

  /**
   * Quick export of data table to PowerPoint
   */
  public static async exportTable(
    data: any[],
    columns: Array<{ header: string; key: string; align?: string }>,
    title: string = 'Data Table'
  ): Promise<void> {
    const exporter = new PowerPointExporter({ title });
    const pres = exporter.pres;

    // Title slide
    const titleSlide = pres.addSlide();
    titleSlide.addText(title, {
      x: 0.5,
      y: 2.5,
      w: 9,
      h: 1.5,
      fontSize: 44,
      bold: true,
      align: 'center',
    });

    // Data slide
    const dataSlide = pres.addSlide();
    dataSlide.addText(title, {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.6,
      fontSize: 24,
      bold: true,
    });

    // Prepare table
    const headerRow = columns.map((col) => ({
      text: col.header,
      options: {
        bold: true,
        fill: { color: '4472C4' },
        color: 'FFFFFF',
        align: 'center' as const,
      },
    }));

    const dataRows = data.slice(0, 20).map((row) =>
      columns.map((col) => ({
        text: String(row[col.key] || ''),
        options: { align: (col.align || 'left') as any },
      }))
    );

    dataSlide.addTable([headerRow, ...dataRows], {
      x: 0.5,
      y: 1.3,
      w: 9,
      colW: columns.map(() => 9 / columns.length),
      border: { type: 'solid', pt: 1, color: 'CCCCCC' },
      fontSize: 11,
    });

    // Download
    const blob = await pres.write({ outputType: 'blob' }) as Blob;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}.pptx`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Export chart to PowerPoint
   */
  public static async exportChart(
    chartName: string,
    chartType: string,
    chartImage?: string
  ): Promise<void> {
    const pres = new pptxgen();

    // Title slide
    const titleSlide = pres.addSlide();
    titleSlide.addText(chartName, {
      x: 0.5,
      y: 2.5,
      w: 9,
      h: 1.5,
      fontSize: 44,
      bold: true,
      align: 'center',
    });

    // Chart slide
    const chartSlide = pres.addSlide();
    chartSlide.addText(chartName, {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.6,
      fontSize: 24,
      bold: true,
    });

    if (chartImage) {
      chartSlide.addImage({
        data: chartImage,
        x: 1,
        y: 1.5,
        w: 8,
        h: 4,
      });
    } else {
      chartSlide.addShape('rect', {
        x: 1,
        y: 1.5,
        w: 8,
        h: 4,
        fill: { color: 'F0F0F0' },
      });
      chartSlide.addText(`${chartType} Chart`, {
        x: 1,
        y: 3.25,
        w: 8,
        h: 0.5,
        fontSize: 18,
        align: 'center',
        color: '999999',
      });
    }

    // Download
    const blob = await pres.write({ outputType: 'blob' }) as Blob;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${chartName}.pptx`;
    link.click();
    URL.revokeObjectURL(url);
  }
}

// ===================================================================
// TYPES
// ===================================================================

export interface PowerPointExportOptions {
  author?: string;
  company?: string;
  title?: string;
  subject?: string;
  layout?: 'LAYOUT_16x9' | 'LAYOUT_16x10' | 'LAYOUT_4x3' | 'LAYOUT_WIDE';
  theme?: 'default' | 'corporate' | 'modern' | 'minimal';
  includeCharts?: boolean;
  includeTables?: boolean;
  includeMetrics?: boolean;
  includeSummary?: boolean;
}

// ===================================================================
// CONVENIENCE FUNCTIONS
// ===================================================================

/**
 * Export report to PowerPoint
 */
export async function exportReportToPowerPoint(
  report: Report,
  options?: PowerPointExportOptions
): Promise<void> {
  const exporter = new PowerPointExporter({
    ...options,
    title: report.name,
    author: report.createdBy,
  });

  const blob = await exporter.exportReport(report);

  // Download file
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${report.name}.pptx`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Quick export of simple data table
 */
export async function exportTableToPowerPoint(
  data: any[],
  title: string = 'Data Report'
): Promise<void> {
  // Infer columns from first row
  const columns = Object.keys(data[0] || {}).map((key) => ({
    header: key.charAt(0).toUpperCase() + key.slice(1),
    key,
  }));

  await PowerPointExporter.exportTable(data, columns, title);
}
