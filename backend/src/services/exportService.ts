/**
 * Export Service
 *
 * Handles PDF and Excel export for reports
 * Supports charts, tables, metrics, and text elements
 */

import ExcelJS from 'exceljs';
import { Report, ReportElement } from '../types/reports';

// ===================================================================
// EXPORT SERVICE
// ===================================================================

export class ExportService {
  constructor() {
    console.log('ExportService initialized');
  }

  /**
   * Export report to PDF
   */
  async exportToPDF(report: Report, data: Record<string, any>): Promise<Buffer> {
    try {
      console.log(`[ExportService] Exporting report "${report.name}" to PDF`);

      // In production: Use puppeteer or pdfkit
      // Option 1: Puppeteer (render HTML to PDF)
      // const browser = await puppeteer.launch();
      // const page = await browser.newPage();
      // const html = this.generateReportHTML(report, data);
      // await page.setContent(html);
      // const pdfBuffer = await page.pdf({
      //   format: 'A4',
      //   printBackground: true,
      // });
      // await browser.close();
      // return pdfBuffer;

      // Option 2: PDFKit (programmatic PDF generation)
      // const PDFDocument = require('pdfkit');
      // const doc = new PDFDocument();
      // const chunks: Buffer[] = [];
      //
      // doc.on('data', (chunk) => chunks.push(chunk));
      // doc.on('end', () => Promise.resolve(Buffer.concat(chunks)));
      //
      // doc.fontSize(20).text(report.name, 50, 50);
      // doc.fontSize(12).text(report.description || '', 50, 80);
      //
      // // Render elements
      // let yPosition = 120;
      // for (const element of report.elements) {
      //   yPosition = this.renderElementToPDF(doc, element, data[element.id], yPosition);
      // }
      //
      // doc.end();

      // Mock implementation for development
      const mockPDFContent = this.generateMockPDF(report, data);
      return Buffer.from(mockPDFContent);
    } catch (error: any) {
      console.error('[ExportService] PDF export failed:', error);
      throw new Error(`PDF export failed: ${error.message}`);
    }
  }

  /**
   * Export report to Excel
   */
  async exportToExcel(report: Report, data: Record<string, any>): Promise<Buffer> {
    try {
      console.log(`[ExportService] Exporting report "${report.name}" to Excel`);

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'ClickView Enterprise';
      workbook.created = new Date();

      // Create summary sheet
      const summarySheet = workbook.addWorksheet('Report Summary');
      summarySheet.mergeCells('A1:D1');
      summarySheet.getCell('A1').value = report.name;
      summarySheet.getCell('A1').font = { size: 16, bold: true };
      summarySheet.getCell('A1').alignment = { horizontal: 'center' };

      if (report.description) {
        summarySheet.mergeCells('A2:D2');
        summarySheet.getCell('A2').value = report.description;
        summarySheet.getCell('A2').alignment = { horizontal: 'center' };
      }

      summarySheet.getRow(4).values = ['Generated', new Date().toLocaleString()];
      summarySheet.getRow(5).values = ['Elements', report.elements.length];

      // Export each element to its own sheet
      for (const element of report.elements) {
        await this.exportElementToExcel(workbook, element, data[element.id]);
      }

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);
    } catch (error: any) {
      console.error('[ExportService] Excel export failed:', error);
      throw new Error(`Excel export failed: ${error.message}`);
    }
  }

  // ===================================================================
  // EXCEL ELEMENT EXPORT
  // ===================================================================

  /**
   * Export a single element to Excel worksheet
   */
  private async exportElementToExcel(
    workbook: ExcelJS.Workbook,
    element: ReportElement,
    elementData: any
  ): Promise<void> {
    const sheetName = this.sanitizeSheetName(
      (element as any).title || (element as any).label || `Element_${element.id.substring(0, 8)}`
    );

    switch (element.type) {
      case 'table':
        await this.exportTableToExcel(workbook, sheetName, element as any, elementData);
        break;

      case 'chart':
        await this.exportChartToExcel(workbook, sheetName, element as any, elementData);
        break;

      case 'metric':
        await this.exportMetricToExcel(workbook, sheetName, element as any, elementData);
        break;

      case 'text':
        await this.exportTextToExcel(workbook, sheetName, element as any);
        break;

      default:
        console.log(`[ExportService] Skipping unsupported element type: ${element.type}`);
    }
  }

  /**
   * Export table element to Excel
   */
  private async exportTableToExcel(
    workbook: ExcelJS.Workbook,
    sheetName: string,
    element: any,
    tableData: any[]
  ): Promise<void> {
    const worksheet = workbook.addWorksheet(sheetName);

    if (!tableData || tableData.length === 0) {
      worksheet.getCell('A1').value = 'No data available';
      return;
    }

    // Define columns
    const columns = element.columns
      ?.filter((col: any) => col.visible !== false)
      .map((col: any) => ({
        header: col.header,
        key: col.field,
        width: (col.width || 100) / 10,
      })) || [];

    worksheet.columns = columns;

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: element.styling?.headerBackgroundColor?.replace('#', 'FF') || 'FF0078D7' },
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Add data rows
    worksheet.addRows(tableData);

    // Apply conditional formatting if exists
    if (element.styling?.conditionalFormatting) {
      this.applyConditionalFormatting(worksheet, element.styling.conditionalFormatting, tableData.length);
    }

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      if (column && !column.width) {
        column.width = 15;
      }
    });
  }

  /**
   * Export chart element to Excel (as data table)
   */
  private async exportChartToExcel(
    workbook: ExcelJS.Workbook,
    sheetName: string,
    element: any,
    chartData: any
  ): Promise<void> {
    const worksheet = workbook.addWorksheet(sheetName);

    if (!chartData) {
      worksheet.getCell('A1').value = 'No chart data available';
      return;
    }

    // Handle different chart data formats
    if (chartData.series && Array.isArray(chartData.series)) {
      // Multi-series data (line, bar, area charts)
      const categories = chartData.categories || chartData.labels || [];
      const columns: any[] = [
        { header: chartData.categoryLabel || 'Category', key: 'category', width: 20 },
      ];

      chartData.series.forEach((series: any, index: number) => {
        columns.push({
          header: series.name || `Series ${index + 1}`,
          key: `series_${index}`,
          width: 15,
        });
      });

      worksheet.columns = columns;

      // Style header
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0078D7' },
      };

      // Add data
      categories.forEach((category: any, catIndex: number) => {
        const row: any = { category };
        chartData.series.forEach((series: any, seriesIndex: number) => {
          row[`series_${seriesIndex}`] = series.data[catIndex];
        });
        worksheet.addRow(row);
      });
    } else if (chartData.labels && chartData.values) {
      // Label-value pairs (pie, doughnut charts)
      worksheet.columns = [
        { header: 'Label', key: 'label', width: 20 },
        { header: 'Value', key: 'value', width: 15 },
      ];

      // Style header
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0078D7' },
      };

      // Add data
      chartData.labels.forEach((label: any, index: number) => {
        worksheet.addRow({
          label,
          value: chartData.values[index],
        });
      });
    }
  }

  /**
   * Export metric element to Excel
   */
  private async exportMetricToExcel(
    workbook: ExcelJS.Workbook,
    sheetName: string,
    element: any,
    metricData: any
  ): Promise<void> {
    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.getCell('A1').value = element.metric.label;
    worksheet.getCell('A1').font = { size: 14, bold: true };

    const value = metricData || element.dataSource?.data?.[element.metric.field] || 0;

    worksheet.getCell('A2').value = 'Value';
    worksheet.getCell('B2').value = value;
    worksheet.getCell('B2').font = { size: 16, bold: true };

    // Apply formatting
    if (element.metric.format === 'currency') {
      worksheet.getCell('B2').numFmt = '$#,##0.00';
    } else if (element.metric.format === 'percent') {
      worksheet.getCell('B2').numFmt = '0.00%';
    } else {
      worksheet.getCell('B2').numFmt = '#,##0';
    }

    // Add comparison if exists
    if (element.comparison) {
      const comparisonValue = element.comparison.value;
      const change = comparisonValue !== 0 ? ((value - comparisonValue) / comparisonValue) : 0;

      worksheet.getCell('A3').value = 'Previous Value';
      worksheet.getCell('B3').value = comparisonValue;

      worksheet.getCell('A4').value = 'Change';
      worksheet.getCell('B4').value = change;
      worksheet.getCell('B4').numFmt = '0.00%';

      if (change > 0) {
        worksheet.getCell('B4').font = { color: { argb: 'FF00B050' } };
      } else if (change < 0) {
        worksheet.getCell('B4').font = { color: { argb: 'FFFF0000' } };
      }
    }

    worksheet.getColumn('A').width = 20;
    worksheet.getColumn('B').width = 20;
  }

  /**
   * Export text element to Excel
   */
  private async exportTextToExcel(
    workbook: ExcelJS.Workbook,
    sheetName: string,
    element: any
  ): Promise<void> {
    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.getCell('A1').value = element.content;
    worksheet.getCell('A1').font = {
      size: element.fontSize || 12,
      bold: element.fontWeight === 'bold',
    };
    worksheet.getCell('A1').alignment = {
      wrapText: true,
      horizontal: element.textAlign || 'left',
    };

    worksheet.getColumn('A').width = 80;
  }

  /**
   * Apply conditional formatting to worksheet
   */
  private applyConditionalFormatting(
    worksheet: ExcelJS.Worksheet,
    rules: any[],
    dataRowCount: number
  ): void {
    for (const rule of rules) {
      if (!rule.column) continue;

      const columnIndex = worksheet.columns.findIndex((col: any) => col.key === rule.column) + 1;
      if (columnIndex === 0) continue;

      const columnLetter = this.getColumnLetter(columnIndex);
      const range = `${columnLetter}2:${columnLetter}${dataRowCount + 1}`;

      if (rule.type === 'dataBar') {
        worksheet.addConditionalFormatting({
          ref: range,
          rules: [
            {
              type: 'dataBar',
              minLength: 0,
              maxLength: 100,
              color: { argb: 'FF638EC6' },
            } as any,
          ],
        });
      } else if (rule.type === 'colorScale' && rule.gradient) {
        worksheet.addConditionalFormatting({
          ref: range,
          rules: [
            {
              type: 'colorScale',
              cfvo: [
                { type: 'min' },
                { type: 'max' },
              ],
              color: [
                { argb: rule.gradient.minColor.replace('#', 'FF') },
                { argb: rule.gradient.maxColor.replace('#', 'FF') },
              ],
            } as any,
          ],
        });
      }
    }
  }

  // ===================================================================
  // HELPER METHODS
  // ===================================================================

  /**
   * Generate mock PDF content for development
   */
  private generateMockPDF(report: Report, data: Record<string, any>): string {
    return `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 100 >>
stream
BT
/F1 20 Tf
50 750 Td
(${report.name}) Tj
ET
endstream
endobj
xref
0 5
trailer
<< /Size 5 /Root 1 0 R >>
%%EOF`;
  }

  /**
   * Sanitize sheet name for Excel
   */
  private sanitizeSheetName(name: string): string {
    return name
      .replace(/[\\/*?[\]:]/g, '_')
      .substring(0, 31);
  }

  /**
   * Get Excel column letter from number
   */
  private getColumnLetter(num: number): string {
    let letter = '';
    while (num > 0) {
      const remainder = (num - 1) % 26;
      letter = String.fromCharCode(65 + remainder) + letter;
      num = Math.floor((num - 1) / 26);
    }
    return letter;
  }
}

// Export singleton instance
export const exportService = new ExportService();
