/**
 * Enhanced PDF Export with jsPDF
 *
 * Professional PDF generation for charts and dashboards with:
 * - Multi-page reports
 * - Custom headers and footers
 * - Table of contents
 * - Multiple chart layouts
 * - Metadata and watermarks
 */

import jsPDF from 'jspdf';
import { exportToPNG } from './chartExport';
import { ChartExportOptions } from '../types/charts';

// ===================================================================
// TYPES
// ===================================================================

export interface PDFExportOptions {
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'letter' | 'legal' | [number, number];
  unit?: 'pt' | 'px' | 'in' | 'mm' | 'cm' | 'ex' | 'em' | 'pc';
  compress?: boolean;

  // Document metadata
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;

  // Header/Footer
  header?: PDFHeaderFooter;
  footer?: PDFHeaderFooter;

  // Styling
  margin?: { top: number; right: number; bottom: number; left: number };
  backgroundColor?: string;
  watermark?: string;
}

export interface PDFHeaderFooter {
  enabled: boolean;
  height?: number;
  content?: (pdf: jsPDF, pageNumber: number, totalPages: number) => void;
  text?: string;
  fontSize?: number;
  align?: 'left' | 'center' | 'right';
}

export interface ChartPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PDFChartItem {
  element: HTMLElement;
  title?: string;
  description?: string;
  position?: ChartPosition;
  exportOptions?: ChartExportOptions;
}

export interface PDFReportSection {
  title: string;
  charts: PDFChartItem[];
  layout?: 'single' | 'grid-2x1' | 'grid-2x2' | 'grid-3x2';
  pageBreakBefore?: boolean;
}

// ===================================================================
// PDF EXPORT CLASS
// ===================================================================

export class PDFExporter {
  private pdf: jsPDF;
  private options: Required<PDFExportOptions>;
  private currentY: number = 0;
  private pageNumber: number = 1;

  constructor(options: PDFExportOptions = {}) {
    const defaults: Required<PDFExportOptions> = {
      orientation: 'portrait',
      format: 'a4',
      unit: 'mm',
      compress: true,
      title: 'Chart Report',
      author: 'ClickView',
      subject: 'Data Visualization Report',
      keywords: 'charts, data, visualization',
      creator: 'ClickView Enterprise',
      header: { enabled: false, height: 20 },
      footer: { enabled: true, height: 15, text: 'Page {page} of {pages}', fontSize: 10, align: 'center' },
      margin: { top: 20, right: 15, bottom: 20, left: 15 },
      backgroundColor: '#ffffff',
      watermark: undefined,
    };

    this.options = { ...defaults, ...options };

    this.pdf = new jsPDF({
      orientation: this.options.orientation,
      unit: this.options.unit,
      format: this.options.format,
      compress: this.options.compress,
    });

    // Set metadata
    this.pdf.setProperties({
      title: this.options.title,
      subject: this.options.subject,
      author: this.options.author,
      keywords: this.options.keywords,
      creator: this.options.creator,
    });

    this.currentY = this.options.margin.top;
  }

  /**
   * Get page dimensions
   */
  private getPageDimensions() {
    const pageWidth = this.pdf.internal.pageSize.getWidth();
    const pageHeight = this.pdf.internal.pageSize.getHeight();
    const contentWidth = pageWidth - this.options.margin.left - this.options.margin.right;
    const contentHeight = pageHeight - this.options.margin.top - this.options.margin.bottom;

    return { pageWidth, pageHeight, contentWidth, contentHeight };
  }

  /**
   * Add header to page
   */
  private addHeader() {
    if (!this.options.header.enabled) return;

    const { pageWidth } = this.getPageDimensions();

    if (this.options.header.content) {
      this.options.header.content(this.pdf, this.pageNumber, this.getTotalPages());
    } else if (this.options.header.text) {
      this.pdf.setFontSize(this.options.header.fontSize || 12);
      const x = this.options.header.align === 'right' ? pageWidth - this.options.margin.right :
                this.options.header.align === 'center' ? pageWidth / 2 :
                this.options.margin.left;

      this.pdf.text(this.options.header.text, x, this.options.margin.top / 2, {
        align: this.options.header.align || 'left',
      });
    }
  }

  /**
   * Add footer to page
   */
  private addFooter() {
    if (!this.options.footer.enabled) return;

    const { pageWidth, pageHeight } = this.getPageDimensions();
    const footerY = pageHeight - this.options.margin.bottom / 2;

    if (this.options.footer.content) {
      this.options.footer.content(this.pdf, this.pageNumber, this.getTotalPages());
    } else if (this.options.footer.text) {
      this.pdf.setFontSize(this.options.footer.fontSize || 10);
      const text = this.options.footer.text
        .replace('{page}', String(this.pageNumber))
        .replace('{pages}', String(this.getTotalPages()));

      const x = this.options.footer.align === 'right' ? pageWidth - this.options.margin.right :
                this.options.footer.align === 'center' ? pageWidth / 2 :
                this.options.margin.left;

      this.pdf.text(text, x, footerY, {
        align: this.options.footer.align || 'center',
      });
    }
  }

  /**
   * Add watermark to page
   */
  private addWatermark() {
    if (!this.options.watermark) return;

    const { pageWidth, pageHeight } = this.getPageDimensions();

    this.pdf.saveGraphicsState();
    this.pdf.setGState(new (this.pdf as any).GState({ opacity: 0.1 }));
    this.pdf.setFontSize(60);
    this.pdf.setTextColor(200, 200, 200);

    // Rotate and center watermark
    this.pdf.text(this.options.watermark, pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: 45,
    });

    this.pdf.restoreGraphicsState();
  }

  /**
   * Add new page
   */
  private addPage() {
    this.pdf.addPage();
    this.pageNumber++;
    this.currentY = this.options.margin.top;
    this.addHeader();
    this.addWatermark();
  }

  /**
   * Get total pages (placeholder, updated at end)
   */
  private getTotalPages(): number {
    return (this.pdf as any).internal.getNumberOfPages();
  }

  /**
   * Add title to document
   */
  public addTitle(title: string, fontSize: number = 24) {
    const { contentWidth } = this.getPageDimensions();

    this.pdf.setFontSize(fontSize);
    this.pdf.setFont(undefined, 'bold');
    this.pdf.text(title, this.options.margin.left, this.currentY, {
      maxWidth: contentWidth,
    });

    this.currentY += fontSize * 0.5;
    this.pdf.setFont(undefined, 'normal');
  }

  /**
   * Add text paragraph
   */
  public addText(text: string, fontSize: number = 12) {
    const { contentWidth } = this.getPageDimensions();

    this.pdf.setFontSize(fontSize);
    const lines = this.pdf.splitTextToSize(text, contentWidth);

    lines.forEach((line: string) => {
      if (this.currentY > this.getPageDimensions().pageHeight - this.options.margin.bottom) {
        this.addPage();
      }
      this.pdf.text(line, this.options.margin.left, this.currentY);
      this.currentY += fontSize * 0.5;
    });

    this.currentY += 5;
  }

  /**
   * Add chart to PDF
   */
  public async addChart(
    chartElement: HTMLElement,
    options: {
      title?: string;
      width?: number;
      height?: number;
      centered?: boolean;
    } = {}
  ) {
    const { contentWidth } = this.getPageDimensions();

    // Add title if provided
    if (options.title) {
      this.pdf.setFontSize(14);
      this.pdf.setFont(undefined, 'bold');
      this.pdf.text(options.title, this.options.margin.left, this.currentY);
      this.currentY += 10;
      this.pdf.setFont(undefined, 'normal');
    }

    // Calculate chart dimensions
    const chartWidth = options.width || contentWidth;
    const chartHeight = options.height || (chartWidth * 0.6); // 16:10 aspect ratio

    // Check if chart fits on current page
    if (this.currentY + chartHeight > this.getPageDimensions().pageHeight - this.options.margin.bottom) {
      this.addPage();
    }

    // Convert chart to PNG
    const pngBlob = await exportToPNG(chartElement, {
      format: 'png',
      width: chartWidth * 4, // Higher resolution for better quality
      height: chartHeight * 4,
      quality: 1.0,
      backgroundColor: '#ffffff',
    });

    // Convert blob to data URL
    const dataUrl = await this.blobToDataURL(pngBlob);

    // Add image to PDF
    const x = options.centered
      ? this.options.margin.left + (contentWidth - chartWidth) / 2
      : this.options.margin.left;

    this.pdf.addImage(dataUrl, 'PNG', x, this.currentY, chartWidth, chartHeight);
    this.currentY += chartHeight + 10;
  }

  /**
   * Add multiple charts in a grid layout
   */
  public async addChartGrid(
    charts: PDFChartItem[],
    layout: 'grid-2x1' | 'grid-2x2' | 'grid-3x2' = 'grid-2x2'
  ) {
    const { contentWidth } = this.getPageDimensions();

    const layouts = {
      'grid-2x1': { cols: 2, rows: 1 },
      'grid-2x2': { cols: 2, rows: 2 },
      'grid-3x2': { cols: 3, rows: 2 },
    };

    const { cols, rows } = layouts[layout];
    const chartWidth = (contentWidth - (cols - 1) * 10) / cols;
    const chartHeight = chartWidth * 0.6;

    for (let i = 0; i < charts.length; i += (cols * rows)) {
      if (i > 0) this.addPage();

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const index = i + r * cols + c;
          if (index >= charts.length) break;

          const chart = charts[index];
          const x = this.options.margin.left + c * (chartWidth + 10);
          const y = this.currentY + r * (chartHeight + 15);

          // Add chart title
          if (chart.title) {
            this.pdf.setFontSize(10);
            this.pdf.setFont(undefined, 'bold');
            this.pdf.text(chart.title, x, y - 3);
            this.pdf.setFont(undefined, 'normal');
          }

          // Convert and add chart
          const pngBlob = await exportToPNG(chart.element, {
            format: 'png',
            width: chartWidth * 4,
            height: chartHeight * 4,
            quality: 1.0,
          });

          const dataUrl = await this.blobToDataURL(pngBlob);
          this.pdf.addImage(dataUrl, 'PNG', x, y, chartWidth, chartHeight);
        }
      }

      this.currentY += rows * (chartHeight + 15) + 10;
    }
  }

  /**
   * Add table of contents
   */
  public addTableOfContents(sections: string[]) {
    this.addTitle('Table of Contents', 18);
    this.currentY += 5;

    sections.forEach((section, index) => {
      this.pdf.setFontSize(12);
      this.pdf.text(`${index + 1}. ${section}`, this.options.margin.left + 5, this.currentY);
      this.currentY += 7;
    });

    this.addPage();
  }

  /**
   * Helper: Convert blob to data URL
   */
  private blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Finalize and get PDF blob
   */
  public async getBlob(): Promise<Blob> {
    // Add footers to all pages
    const totalPages = this.getTotalPages();
    for (let i = 1; i <= totalPages; i++) {
      this.pdf.setPage(i);
      this.pageNumber = i;
      this.addFooter();
    }

    return this.pdf.output('blob');
  }

  /**
   * Download PDF
   */
  public async download(filename: string = 'chart-report.pdf') {
    const blob = await this.getBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}

// ===================================================================
// CONVENIENCE FUNCTIONS
// ===================================================================

/**
 * Export single chart to PDF
 */
export async function exportChartToPDF(
  chartElement: HTMLElement,
  options: PDFExportOptions & { title?: string } = {}
): Promise<Blob> {
  const exporter = new PDFExporter(options);

  if (options.title) {
    exporter.addTitle(options.title);
  }

  await exporter.addChart(chartElement, {
    width: options.orientation === 'landscape' ? 250 : 180,
    centered: true,
  });

  return exporter.getBlob();
}

/**
 * Export multiple charts to PDF report
 */
export async function exportMultiChartReport(
  sections: PDFReportSection[],
  options: PDFExportOptions = {}
): Promise<Blob> {
  const exporter = new PDFExporter(options);

  // Add title page
  if (options.title) {
    exporter.addTitle(options.title, 28);
    exporter.addText(`Generated: ${new Date().toLocaleDateString()}`);
  }

  // Add table of contents
  if (sections.length > 1) {
    exporter.addTableOfContents(sections.map(s => s.title));
  }

  // Add each section
  for (const section of sections) {
    if (section.pageBreakBefore && exporter['pageNumber'] > 1) {
      exporter['addPage']();
    }

    exporter.addTitle(section.title, 18);

    if (section.layout && section.layout !== 'single') {
      await exporter.addChartGrid(section.charts, section.layout);
    } else {
      for (const chart of section.charts) {
        await exporter.addChart(chart.element, {
          title: chart.title,
          width: options.orientation === 'landscape' ? 250 : 180,
        });

        if (chart.description) {
          exporter.addText(chart.description, 10);
        }
      }
    }
  }

  return exporter.getBlob();
}

/**
 * Quick export: dashboard to PDF
 */
export async function exportDashboardToPDF(
  dashboardElement: HTMLElement,
  options: PDFExportOptions = {}
): Promise<Blob> {
  // Find all chart elements
  const charts = Array.from(dashboardElement.querySelectorAll('[data-chart]')) as HTMLElement[];

  const sections: PDFReportSection[] = [{
    title: 'Dashboard Overview',
    charts: charts.map(chart => ({
      element: chart,
      title: chart.getAttribute('data-chart-title') || undefined,
    })),
    layout: 'grid-2x2',
  }];

  return exportMultiChartReport(sections, {
    ...options,
    orientation: 'landscape',
    title: options.title || 'Dashboard Report',
  });
}
