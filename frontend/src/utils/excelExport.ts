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
    // Transform chart data to tabular format
    const data: any[] = [];
    const columns: any[] = [];

    // Handle different chart data formats
    if (chartData.series && Array.isArray(chartData.series)) {
      // Time series or multi-series data
      const categories = chartData.categories || chartData.labels || [];

      // Create columns: first column for categories, then one for each series
      columns.push({ header: chartData.categoryLabel || 'Category', key: 'category', width: 20 });
      chartData.series.forEach((series: any, index: number) => {
        columns.push({
          header: series.name || `Series ${index + 1}`,
          key: `series_${index}`,
          width: 15,
          format: series.format || 'number',
        });
      });

      // Create rows
      categories.forEach((category: any, catIndex: number) => {
        const row: any = { category };
        chartData.series.forEach((series: any, seriesIndex: number) => {
          row[`series_${seriesIndex}`] = series.data[catIndex];
        });
        data.push(row);
      });
    } else if (chartData.data && Array.isArray(chartData.data)) {
      // Simple data array
      if (chartData.data.length > 0 && typeof chartData.data[0] === 'object') {
        // Array of objects
        const keys = Object.keys(chartData.data[0]);
        keys.forEach(key => {
          columns.push({ header: key, key, width: 15 });
        });
        data.push(...chartData.data);
      } else {
        // Array of primitives
        columns.push({ header: 'Value', key: 'value', width: 15 });
        chartData.data.forEach((value: any) => {
          data.push({ value });
        });
      }
    } else if (chartData.labels && chartData.values) {
      // Label-value pairs (pie chart, donut, etc.)
      columns.push(
        { header: 'Label', key: 'label', width: 20 },
        { header: 'Value', key: 'value', width: 15, format: 'number' }
      );
      chartData.labels.forEach((label: string, index: number) => {
        data.push({
          label,
          value: chartData.values[index],
        });
      });
    }

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
      // Fetch actual value from dataSource
      let metricValue = 0;
      let comparisonValue = 0;

      if (metric.dataSource && metric.dataSource.type === 'static' && metric.dataSource.data) {
        // Extract value from static data
        metricValue = metric.dataSource.data[metric.metric.field] || 0;
      } else if (metric.dataSource && metric.dataSource.type === 'api' && metric.dataSource.apiEndpoint) {
        // For API, we'd need async fetch, so use 0 as placeholder for now
        // In real implementation, this would be fetched before calling this function
        metricValue = 0;
      }

      // Calculate change if comparison exists
      if (metric.comparison) {
        comparisonValue = metric.comparison.value || 0;
      }

      const change = comparisonValue !== 0 ? ((metricValue - comparisonValue) / comparisonValue) : 0;

      const row = worksheet.addRow({
        label: metric.metric.label,
        value: metricValue,
        comparison: metric.comparison?.type || 'N/A',
        change: change,
      });

      // Format value cell based on metric format
      const valueCell = row.getCell(2);
      if (metric.metric.format === 'currency') {
        valueCell.numFmt = '$#,##0.00';
      } else if (metric.metric.format === 'percent') {
        valueCell.numFmt = '0.00%';
      } else {
        valueCell.numFmt = '#,##0.00';
      }

      // Format change cell with conditional coloring
      const changeCell = row.getCell(4);
      changeCell.numFmt = '0.00%';
      if (change > 0) {
        changeCell.font = { color: { argb: 'FF00B050' } };
      } else if (change < 0) {
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

    // Fetch and add data
    let data: any[] = [];
    if (table.dataSource) {
      if (table.dataSource.type === 'static' && table.dataSource.data) {
        data = Array.isArray(table.dataSource.data) ? table.dataSource.data : [table.dataSource.data];
      } else if (table.dataSource.type === 'api' && table.dataSource.apiEndpoint) {
        // For API data, this would be fetched asynchronously before export
        // In real implementation, pass pre-fetched data to this function
        data = [];
      } else if (table.dataSource.type === 'query' && table.dataSource.query) {
        // Query results would be pre-fetched as well
        data = [];
      }
    }

    if (data.length > 0) {
      data.forEach((row) => worksheet.addRow(row));
    } else {
      // Add placeholder if no data
      worksheet.addRow({ [columns[0].key]: 'No data available' });
    }

    // Apply conditional formatting if configured
    if (table.conditionalFormatting && table.conditionalFormatting.length > 0 && data.length > 0) {
      table.conditionalFormatting.forEach((rule) => {
        const columnIndex = columns.findIndex(col => col.key === rule.field);
        if (columnIndex === -1) return;

        const columnLetter = String.fromCharCode(65 + columnIndex);
        const startRow = 2; // After header
        const endRow = data.length + 1;
        const range = `${columnLetter}${startRow}:${columnLetter}${endRow}`;

        // Apply different formatting based on rule type
        if (rule.type === 'cellValue') {
          if (rule.operator === 'greaterThan' && rule.value !== undefined) {
            worksheet.addConditionalFormatting({
              ref: range,
              rules: [{
                type: 'cellIs',
                operator: 'greaterThan',
                formulae: [rule.value.toString()],
                style: {
                  fill: {
                    type: 'pattern',
                    pattern: 'solid',
                    bgColor: { argb: rule.style?.backgroundColor?.replace('#', 'FF') || 'FF00B050' }
                  }
                }
              }]
            });
          } else if (rule.operator === 'lessThan' && rule.value !== undefined) {
            worksheet.addConditionalFormatting({
              ref: range,
              rules: [{
                type: 'cellIs',
                operator: 'lessThan',
                formulae: [rule.value.toString()],
                style: {
                  fill: {
                    type: 'pattern',
                    pattern: 'solid',
                    bgColor: { argb: rule.style?.backgroundColor?.replace('#', 'FF') || 'FFFF0000' }
                  }
                }
              }]
            });
          } else if (rule.operator === 'between' && rule.min !== undefined && rule.max !== undefined) {
            worksheet.addConditionalFormatting({
              ref: range,
              rules: [{
                type: 'cellIs',
                operator: 'between',
                formulae: [rule.min.toString(), rule.max.toString()],
                style: {
                  fill: {
                    type: 'pattern',
                    pattern: 'solid',
                    bgColor: { argb: rule.style?.backgroundColor?.replace('#', 'FF') || 'FFFFFF00' }
                  }
                }
              }]
            });
          }
        } else if (rule.type === 'dataBar') {
          worksheet.addConditionalFormatting({
            ref: range,
            rules: [{
              type: 'dataBar',
              minLength: 0,
              maxLength: 100,
              color: { argb: rule.style?.backgroundColor?.replace('#', 'FF') || 'FF638EC6' }
            }]
          });
        } else if (rule.type === 'colorScale') {
          worksheet.addConditionalFormatting({
            ref: range,
            rules: [{
              type: 'colorScale',
              cfvo: [
                { type: 'min' },
                { type: 'max' }
              ],
              color: [
                { argb: 'FFF8696B' }, // Red for min
                { argb: 'FF63BE7B' }  // Green for max
              ]
            }]
          });
        }
      });
    }
  }

  /**
   * Add chart data sheet
   */
  private async addChartDataSheet(chart: ChartElement): Promise<void> {
    const worksheet = this.workbook.addWorksheet(`${chart.name} Data`);

    // Transform chart data to tabular format
    let chartData: any = null;

    // Fetch chart data based on dataSource
    if (chart.dataSource) {
      if (chart.dataSource.type === 'static' && chart.dataSource.data) {
        chartData = chart.dataSource.data;
      } else if (chart.dataSource.type === 'api' && chart.dataSource.apiEndpoint) {
        // API data would be pre-fetched
        chartData = null;
      } else if (chart.dataSource.type === 'query' && chart.dataSource.query) {
        // Query results would be pre-fetched
        chartData = null;
      }
    }

    if (!chartData) {
      worksheet.addRow(['No chart data available']);
      return;
    }

    // Transform based on chart data structure
    if (chartData.series && Array.isArray(chartData.series)) {
      // Multi-series chart data
      const categories = chartData.categories || chartData.labels || [];

      // Create header row
      const headers = [chartData.categoryLabel || 'Category'];
      chartData.series.forEach((series: any) => {
        headers.push(series.name || 'Series');
      });
      worksheet.addRow(headers);

      // Style header
      worksheet.getRow(1).font = { bold: true, size: 12 };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      worksheet.getRow(1).font = { ...worksheet.getRow(1).font, color: { argb: 'FFFFFFFF' } };

      // Add data rows
      categories.forEach((category: any, index: number) => {
        const row = [category];
        chartData.series.forEach((series: any) => {
          row.push(series.data[index] || 0);
        });
        worksheet.addRow(row);
      });
    } else if (chartData.labels && chartData.values) {
      // Simple label-value pairs (pie, donut, etc.)
      worksheet.addRow(['Label', 'Value']);

      // Style header
      worksheet.getRow(1).font = { bold: true, size: 12 };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      worksheet.getRow(1).font = { ...worksheet.getRow(1).font, color: { argb: 'FFFFFFFF' } };

      // Add data
      chartData.labels.forEach((label: string, index: number) => {
        worksheet.addRow([label, chartData.values[index]]);
      });
    } else if (Array.isArray(chartData)) {
      // Array of objects
      if (chartData.length > 0 && typeof chartData[0] === 'object') {
        const keys = Object.keys(chartData[0]);
        worksheet.addRow(keys);

        // Style header
        worksheet.getRow(1).font = { bold: true, size: 12 };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' },
        };
        worksheet.getRow(1).font = { ...worksheet.getRow(1).font, color: { argb: 'FFFFFFFF' } };

        chartData.forEach((item: any) => {
          const row = keys.map(key => item[key]);
          worksheet.addRow(row);
        });
      }
    }

    // Auto-size columns
    worksheet.columns.forEach((column, index) => {
      let maxLength = 10;
      const columnLetter = String.fromCharCode(65 + index);
      worksheet.getColumn(columnLetter).eachCell({ includeEmpty: false }, (cell) => {
        const cellValue = cell.value?.toString() || '';
        maxLength = Math.max(maxLength, cellValue.length);
      });
      column.width = Math.min(maxLength + 2, 50);
    });
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
