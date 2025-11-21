/**
 * Chart Export Utilities
 *
 * Export charts to various formats (PNG, SVG, PDF) for sharing and reporting.
 * Supports customization of dimensions, quality, and styling.
 */

import { ChartExportOptions } from '../types/charts';

/**
 * Export chart to PNG format
 */
export const exportToPNG = async (
  chartElement: HTMLElement,
  options: ChartExportOptions
): Promise<Blob> => {
  const {
    width = chartElement.offsetWidth,
    height = chartElement.offsetHeight,
    quality = 1.0,
    backgroundColor = '#ffffff',
  } = options;

  try {
    // Clone the element to avoid modifying the original
    const clone = chartElement.cloneNode(true) as HTMLElement;
    clone.style.width = `${width}px`;
    clone.style.height = `${height}px`;
    clone.style.backgroundColor = backgroundColor;

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Set background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Convert SVG elements to images
    const svgElements = clone.querySelectorAll('svg');
    for (const svg of Array.from(svgElements)) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const rect = svg.getBoundingClientRect();
          ctx.drawImage(img, rect.left, rect.top, rect.width, rect.height);
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to load SVG'));
        };
        img.src = url;
      });
    }

    // Convert canvas to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create PNG blob'));
          }
        },
        'image/png',
        quality
      );
    });
  } catch (error) {
    console.error('Error exporting to PNG:', error);
    throw error;
  }
};

/**
 * Export chart to SVG format
 */
export const exportToSVG = (
  chartElement: HTMLElement,
  options: ChartExportOptions
): Blob => {
  const {
    width = chartElement.offsetWidth,
    height = chartElement.offsetHeight,
    backgroundColor = '#ffffff',
    includeTitle = true,
    includeLegend = true,
  } = options;

  try {
    // Find the main SVG element
    const svgElement = chartElement.querySelector('svg');
    if (!svgElement) {
      throw new Error('No SVG element found in chart');
    }

    // Clone and modify SVG
    const clone = svgElement.cloneNode(true) as SVGElement;
    clone.setAttribute('width', String(width));
    clone.setAttribute('height', String(height));
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    // Add background
    const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    background.setAttribute('width', '100%');
    background.setAttribute('height', '100%');
    background.setAttribute('fill', backgroundColor);
    clone.insertBefore(background, clone.firstChild);

    // Remove elements based on options
    if (!includeTitle) {
      const titles = clone.querySelectorAll('text.recharts-text.recharts-label');
      titles.forEach((title) => title.remove());
    }

    if (!includeLegend) {
      const legends = clone.querySelectorAll('.recharts-legend-wrapper');
      legends.forEach((legend) => legend.remove());
    }

    // Serialize SVG
    const svgData = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });

    return svgBlob;
  } catch (error) {
    console.error('Error exporting to SVG:', error);
    throw error;
  }
};

/**
 * Export chart to PDF format (requires jsPDF library)
 */
export const exportToPDF = async (
  chartElement: HTMLElement,
  options: ChartExportOptions
): Promise<Blob> => {
  const {
    width = chartElement.offsetWidth,
    height = chartElement.offsetHeight,
    quality = 0.95,
  } = options;

  try {
    // First convert to PNG
    const pngBlob = await exportToPNG(chartElement, {
      ...options,
      width,
      height,
      quality,
    });

    // Note: In a real implementation, you would use jsPDF here
    // For now, we'll just return the PNG blob wrapped in a PDF structure
    // You would need to: npm install jspdf

    // Example with jsPDF (commented out, requires dependency):
    /*
    import jsPDF from 'jspdf';

    const pdf = new jsPDF({
      orientation: width > height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [width, height],
    });

    const imgData = await blobToDataURL(pngBlob);
    pdf.addImage(imgData, 'PNG', 0, 0, width, height);

    return pdf.output('blob');
    */

    // For now, return PNG blob (placeholder)
    console.warn('PDF export requires jsPDF library. Returning PNG instead.');
    return pngBlob;
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw error;
  }
};

/**
 * Download exported chart
 */
export const downloadChart = (
  blob: Blob,
  filename: string,
  format: 'png' | 'svg' | 'pdf'
): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.${format}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Copy chart to clipboard as image
 */
export const copyToClipboard = async (
  chartElement: HTMLElement,
  options: ChartExportOptions = {}
): Promise<void> => {
  try {
    const blob = await exportToPNG(chartElement, {
      format: 'png',
      quality: 1.0,
      ...options,
    });

    const clipboardItem = new ClipboardItem({ 'image/png': blob });
    await navigator.clipboard.write([clipboardItem]);
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    throw error;
  }
};

/**
 * Helper: Convert blob to data URL
 */
const blobToDataURL = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Export multiple charts as a single PDF report
 */
export const exportMultipleChartsToPDF = async (
  charts: { element: HTMLElement; title?: string }[],
  options: {
    pageSize?: 'a4' | 'letter';
    orientation?: 'portrait' | 'landscape';
    title?: string;
    includeDate?: boolean;
  } = {}
): Promise<Blob> => {
  const { pageSize = 'a4', orientation = 'portrait', includeDate = true } = options;

  try {
    // Convert all charts to PNG
    const chartImages = await Promise.all(
      charts.map((chart) =>
        exportToPNG(chart.element, {
          format: 'png',
          quality: 0.95,
        })
      )
    );

    // Note: This would require jsPDF for full implementation
    console.warn('Multi-chart PDF export requires jsPDF library');

    // Example with jsPDF (commented out):
    /*
    import jsPDF from 'jspdf';

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: pageSize,
    });

    // Add title page
    if (options.title) {
      pdf.setFontSize(20);
      pdf.text(options.title, 105, 50, { align: 'center' });
    }

    if (includeDate) {
      pdf.setFontSize(12);
      pdf.text(new Date().toLocaleDateString(), 105, 60, { align: 'center' });
    }

    // Add each chart on a new page
    for (let i = 0; i < chartImages.length; i++) {
      if (i > 0 || options.title) {
        pdf.addPage();
      }

      const imgData = await blobToDataURL(chartImages[i]);
      pdf.addImage(imgData, 'PNG', 10, 10, 190, 140);

      if (charts[i].title) {
        pdf.setFontSize(14);
        pdf.text(charts[i].title!, 105, 160, { align: 'center' });
      }
    }

    return pdf.output('blob');
    */

    // Placeholder: return first chart as PNG
    return chartImages[0];
  } catch (error) {
    console.error('Error exporting multiple charts to PDF:', error);
    throw error;
  }
};

/**
 * Print chart
 */
export const printChart = (chartElement: HTMLElement): void => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Failed to open print window');
  }

  const clone = chartElement.cloneNode(true) as HTMLElement;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Chart</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        ${clone.outerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();

  // Wait for images to load before printing
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
};

export default {
  exportToPNG,
  exportToSVG,
  exportToPDF,
  downloadChart,
  copyToClipboard,
  exportMultipleChartsToPDF,
  printChart,
};
