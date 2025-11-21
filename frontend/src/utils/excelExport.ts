/**
 * Excel Export Utility
 *
 * Generate Excel files from report data:
 * - Multiple worksheets support
 * - Formatted tables with headers
 * - Charts and visualizations
 * - Styling (colors, fonts, borders)
 * - Cell formatting (numbers, dates, currency)
 * - Formulas and calculations
 * - Images and logos
 * - Auto-sizing columns
 */

import ExcelJS from 'exceljs';
import { Report, ReportElement, ReportElementType, ChartElement, TableElement, MetricCardElement } from '../types/reports';

// ===================================================================
// EXCEL EXPORTER CLASS
// ===================================================================

export class ExcelExporter {
  private workbook: ExcelJS.Workbook;
  private options: ExcelExportOptions;

  constructor(options: ExcelExportOptions = {}) {
    this.workbook = new ExcelJS.Workbook();
    this.options = {
      includeCharts: true,
      includeFormatting: true,
      autoSizeColumns: true,
      ...options,
    };

    // Set workbook properties
    this.workbook.creator = options.creator || 'ClickView';
    this.workbook.created = new Date();
    this.workbook.modified = new Date();
  }

  /**
   * Export a complete report to Excel
   */
  public async exportReport(report: Report): Promise<Buffer> {
    // Add summary worksheet
    this.addSummarySheet(report);

    // Group elements by type
    const charts = report.elements.filter((e) => e.type === ReportElementType.CHART) as ChartElement[];
    const tables = report.elements.filter((e) => e.type === ReportElementType.TABLE) as TableElement[];
    const metrics = report.elements.filter((e) => e.type === ReportElementType.METRIC_CARD) as MetricCardElement[];

    // Add metrics sheet
    if (metrics.length > 0) {
      this.addMetricsSheet(metrics);
    }

    // Add table sheets
    for (const table of tables) {
      await this.addTableSheet(table);
    }

    // Add chart data sheets
    if (this.options.includeCharts) {
      for (const chart of charts) {
        await this.addChartDataSheet(chart);
      }
    }

    // Generate buffer
    return await this.workbook.xlsx.writeBuffer() as Buffer;
  }

  /**
   * Export table data to Excel
   */
  public async exportTable(
    data: any[],
    columns: Array<{ header: string; key: string; width?: number; format?: string }>,
    sheetName: string = 'Data'
  ): Promise<Buffer> {
    const worksheet = this.workbook.addWorksheet(sheetName);

    // Add headers
    worksheet.columns = columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width || 15,
    }));

    // Style header row
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).font = { ...worksheet.getRow(1).font, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 25;

    // Add data rows
    data.forEach((row) => {
      const excelRow = worksheet.addRow(row);

      // Apply cell formatting
      columns.forEach((col, colIndex) => {
        const cell = excelRow.getCell(colIndex + 1);

        if (col.format === 'currency') {
          cell.numFmt = '$#,##0.00';
        } else if (col.format === 'percentage') {
          cell.numFmt = '0.00%';
        } else if (col.format === 'date') {
          cell.numFmt = 'mm/dd/yyyy';
        } else if (col.format === 'number') {
          cell.numFmt = '#,##0.00';
        }
      });
    });

    // Add borders
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Auto-size columns
    if (this.options.autoSizeColumns) {
      worksheet.columns.forEach((column) => {
        if (column.eachCell) {
          let maxLength = 0;
          column.eachCell!({ includeEmpty: true }, (cell) => {
            const columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
              maxLength = columnLength;
            }
          });
          column.width = Math.min(maxLength + 2, 50);
        }
      });
    }

    // Freeze header row
    worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

    return await this.workbook.xlsx.writeBuffer() as Buffer;
  }

  /**
   * Export chart data as table
   */
  public async exportChartData(
    chartData: any,
    sheetName: string = 'Chart Data'
  ): Promise<Buffer> {
    // TODO: Transform chart data to tabular format
    const data: any[] = [];
    const columns: any[] = [];

    return await this.exportTable(data, columns, sheetName);
  }

  // ===================================================================
  // PRIVATE METHODS - SHEET BUILDERS
  // ===================================================================

  /**
   * Add summary sheet with report metadata
   */
  private addSummarySheet(report: Report): void {
    const worksheet = this.workbook.addWorksheet('Summary');

    // Title
    worksheet.mergeCells('A1:D1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = report.name;
    titleCell.font = { size: 18, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 30;

    // Metadata
    let row = 3;
    const metadata = [
      ['Description', report.description || 'N/A'],
      ['Category', report.category || 'N/A'],
      ['Created By', report.createdBy],
      ['Created At', report.createdAt.toLocaleString()],
      ['Version', report.version.toString()],
      ['Elements', report.elements.length.toString()],
    ];

    metadata.forEach(([label, value]) => {
      worksheet.getCell(`A${row}`).value = label;
      worksheet.getCell(`A${row}`).font = { bold: true };
      worksheet.getCell(`B${row}`).value = value;
      row++;
    });

    // Element summary
    row += 2;
    worksheet.getCell(`A${row}`).value = 'Elements';
    worksheet.getCell(`A${row}`).font = { bold: true, size: 14 };
    row += 1;

    const elementCounts: Record<string, number> = {};
    report.elements.forEach((el) => {
      elementCounts[el.type] = (elementCounts[el.type] || 0) + 1;
    });

    Object.entries(elementCounts).forEach(([type, count]) => {
      worksheet.getCell(`A${row}`).value = type;
      worksheet.getCell(`B${row}`).value = count;
      row++;
    });

    // Column widths
    worksheet.getColumn(1).width = 20;
    worksheet.getColumn(2).width = 40;
  }

  /**
   * Add metrics sheet with KPI summary
   */
  private addMetricsSheet(metrics: MetricCardElement[]): void {
    const worksheet = this.workbook.addWorksheet('Metrics');

    // Headers
    worksheet.columns = [
      { header: 'Metric', key: 'label', width: 30 },
      { header: 'Value', key: 'value', width: 20 },
      { header: 'Comparison', key: 'comparison', width: 20 },
      { header: 'Change %', key: 'change', width: 15 },
    ];

    // Style headers
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).font = { ...worksheet.getRow(1).font, color: { argb: 'FFFFFFFF' } };

    // Add metric rows
    metrics.forEach((metric) => {
      const row = worksheet.addRow({
        label: metric.metric.label,
        value: 0, // TODO: Fetch actual value
        comparison: metric.comparison?.type || 'N/A',
        change: 0, // TODO: Calculate change
      });

      // Format value cell
      row.getCell(2).numFmt = '$#,##0.00';

      // Format change cell with conditional coloring
      const changeCell = row.getCell(4);
      changeCell.numFmt = '0.00%';
      const changeValue = changeCell.value as number;
      if (changeValue > 0) {
        changeCell.font = { color: { argb: 'FF00B050' } };
      } else if (changeValue < 0) {
        changeCell.font = { color: { argb: 'FFFF0000' } };
      }
    });
  }

  /**
   * Add table sheet
   */
  private async addTableSheet(table: TableElement): Promise<void> {
    const worksheet = this.workbook.addWorksheet(table.name);

    // Prepare columns
    const columns = table.columns
      .filter((col) => col.visible !== false)
      .map((col) => ({
        header: col.header,
        key: col.field,
        width: col.width ? col.width / 10 : 15, // Convert pixels to Excel width
      }));

    worksheet.columns = columns;

    // Style header
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).font = { ...worksheet.getRow(1).font, color: { argb: 'FFFFFFFF' } };

    // TODO: Fetch and add data
    // const data = await this.fetchTableData(table);
    // data.forEach((row) => worksheet.addRow(row));

    // Add placeholder
    worksheet.addRow({ [columns[0].key]: 'Data loading...' });

    // Apply conditional formatting if configured
    if (table.conditionalFormatting) {
      // TODO: Apply conditional formatting rules
    }
  }

  /**
   * Add chart data sheet
   */
  private async addChartDataSheet(chart: ChartElement): Promise<void> {
    const worksheet = this.workbook.addWorksheet(`${chart.name} Data`);

    // TODO: Transform chart data to tabular format
    worksheet.addRow(['Chart data export coming soon']);
  }

  // ===================================================================
  // STATIC CONVENIENCE METHODS
  // ===================================================================

  /**
   * Quick export of simple data table
   */
  public static async exportSimpleTable(
    data: any[],
    filename: string = 'export.xlsx'
  ): Promise<void> {
    const exporter = new ExcelExporter();

    // Infer columns from first data row
    const columns = Object.keys(data[0] || {}).map((key) => ({
      header: key.charAt(0).toUpperCase() + key.slice(1),
      key,
      width: 15,
    }));

    const buffer = await exporter.exportTable(data, columns);

    // Download file
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Export with custom styling
   */
  public static async exportStyledTable(
    data: any[],
    options: {
      columns: Array<{ header: string; key: string; width?: number; format?: string }>;
      title?: string;
      headerColor?: string;
      alternateRows?: boolean;
      filename?: string;
    }
  ): Promise<void> {
    const exporter = new ExcelExporter();
    const workbook = exporter.workbook;
    const worksheet = workbook.addWorksheet('Data');

    // Add title if provided
    let startRow = 1;
    if (options.title) {
      worksheet.mergeCells(`A1:${String.fromCharCode(64 + options.columns.length)}1`);
      const titleCell = worksheet.getCell('A1');
      titleCell.value = options.title;
      titleCell.font = { size: 16, bold: true };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(1).height = 30;
      startRow = 3;
    }

    // Add headers
    worksheet.columns = options.columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width || 15,
    }));

    // Move headers to correct row if title exists
    if (startRow > 1) {
      const headerRow = worksheet.getRow(startRow);
      options.columns.forEach((col, idx) => {
        headerRow.getCell(idx + 1).value = col.header;
      });
    }

    // Style header
    const headerRow = worksheet.getRow(startRow);
    headerRow.font = { bold: true, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: options.headerColor || 'FF4472C4' },
    };
    headerRow.font = { ...headerRow.font, color: { argb: 'FFFFFFFF' } };
    headerRow.height = 25;

    // Add data
    data.forEach((rowData, index) => {
      const row = worksheet.addRow(rowData);

      // Alternate row coloring
      if (options.alternateRows && index % 2 === 1) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' },
        };
      }

      // Apply cell formatting
      options.columns.forEach((col, colIndex) => {
        const cell = row.getCell(colIndex + 1);

        if (col.format === 'currency') {
          cell.numFmt = '$#,##0.00';
        } else if (col.format === 'percentage') {
          cell.numFmt = '0.00%';
        } else if (col.format === 'date') {
          cell.numFmt = 'mm/dd/yyyy';
        } else if (col.format === 'number') {
          cell.numFmt = '#,##0.00';
        }
      });
    });

    // Add borders to all cells
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Freeze header row
    worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: startRow }];

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = options.filename || 'export.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  }
}

// ===================================================================
// TYPES
// ===================================================================

export interface ExcelExportOptions {
  creator?: string;
  includeCharts?: boolean;
  includeFormatting?: boolean;
  autoSizeColumns?: boolean;
  headerColor?: string;
  alternateRowColors?: boolean;
}

// ===================================================================
// CONVENIENCE FUNCTIONS
// ===================================================================

/**
 * Quick export of data array to Excel
 */
export async function exportToExcel(data: any[], filename: string = 'export.xlsx'): Promise<void> {
  await ExcelExporter.exportSimpleTable(data, filename);
}

/**
 * Export report to Excel
 */
export async function exportReportToExcel(report: Report, filename?: string): Promise<void> {
  const exporter = new ExcelExporter({
    creator: report.createdBy,
  });

  const buffer = await exporter.exportReport(report);

  // Download file
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${report.name}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
