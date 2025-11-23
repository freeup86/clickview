/**
 * Report Preview Component
 *
 * Displays a read-only preview of a report with:
 * - Rendered report elements
 * - Full-screen preview mode
 * - Print layout preview
 * - Export options
 * - Zoom controls
 */

import React, { useState, useRef } from 'react';
import { Report, ReportElement } from '../types/reports';
import { ReportElementRenderer } from './ReportElementRenderer';

// ===================================================================
// TYPES
// ===================================================================

interface ReportPreviewProps {
  report: Report;
  data?: Record<string, any>;
  onClose?: () => void;
  onExport?: (format: 'pdf' | 'excel' | 'powerpoint') => void;
  mode?: 'screen' | 'print';
}

// ===================================================================
// REPORT PREVIEW COMPONENT
// ===================================================================

export const ReportPreview: React.FC<ReportPreviewProps> = ({
  report,
  data = {},
  onClose,
  onExport,
  mode = 'screen',
}) => {
  const [zoom, setZoom] = useState(100);
  const [fullScreen, setFullScreen] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // ===================================================================
  // HANDLERS
  // ===================================================================

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 10, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 10, 25));
  };

  const handleZoomReset = () => {
    setZoom(100);
  };

  const handleFullScreen = () => {
    if (!fullScreen && previewRef.current) {
      previewRef.current.requestFullscreen?.();
      setFullScreen(true);
    } else {
      document.exitFullscreen?.();
      setFullScreen(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = (format: 'pdf' | 'excel' | 'powerpoint') => {
    onExport?.(format);
  };

  // ===================================================================
  // RENDER
  // ===================================================================

  const isPrintMode = mode === 'print';

  return (
    <div
      ref={previewRef}
      className={`report-preview ${fullScreen ? 'fullscreen' : ''} ${isPrintMode ? 'print-mode' : ''}`}
      style={{
        position: fullScreen ? 'fixed' : 'relative',
        inset: fullScreen ? 0 : undefined,
        zIndex: fullScreen ? 9999 : undefined,
        backgroundColor: isPrintMode ? 'white' : '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Toolbar */}
      {!isPrintMode && (
        <div
          className="preview-toolbar"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem',
            backgroundColor: 'white',
            borderBottom: '1px solid #e0e0e0',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Left: Report Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>{report.name}</h2>
            {report.description && (
              <span style={{ color: '#666', fontSize: '0.875rem' }}>
                {report.description}
              </span>
            )}
          </div>

          {/* Right: Controls */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {/* Zoom Controls */}
            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 25}
                style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: zoom <= 25 ? '#f5f5f5' : 'white',
                  border: '1px solid #d0d0d0',
                  borderRadius: '4px',
                  cursor: zoom <= 25 ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                }}
                title="Zoom Out"
              >
                −
              </button>
              <span
                style={{
                  padding: '0.5rem 0.75rem',
                  minWidth: '60px',
                  textAlign: 'center',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                {zoom}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 200}
                style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: zoom >= 200 ? '#f5f5f5' : 'white',
                  border: '1px solid #d0d0d0',
                  borderRadius: '4px',
                  cursor: zoom >= 200 ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                }}
                title="Zoom In"
              >
                +
              </button>
              <button
                onClick={handleZoomReset}
                style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: 'white',
                  border: '1px solid #d0d0d0',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
                title="Reset Zoom"
              >
                Reset
              </button>
            </div>

            {/* Action Buttons */}
            <button
              onClick={handleFullScreen}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'white',
                border: '1px solid #d0d0d0',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              {fullScreen ? '⊗ Exit Fullscreen' : '⛶ Fullscreen'}
            </button>

            <button
              onClick={handlePrint}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'white',
                border: '1px solid #d0d0d0',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              🖨️ Print
            </button>

            {/* Export Dropdown */}
            {onExport && (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <button
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                  onClick={() => {
                    const dropdown = document.getElementById('export-dropdown');
                    if (dropdown) {
                      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                    }
                  }}
                >
                  📤 Export ▾
                </button>
                <div
                  id="export-dropdown"
                  style={{
                    display: 'none',
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    marginTop: '0.25rem',
                    backgroundColor: 'white',
                    border: '1px solid #d0d0d0',
                    borderRadius: '4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    minWidth: '150px',
                    zIndex: 1000,
                  }}
                >
                  <button
                    onClick={() => handleExport('pdf')}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      backgroundColor: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    📄 Export as PDF
                  </button>
                  <button
                    onClick={() => handleExport('excel')}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      backgroundColor: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    📊 Export as Excel
                  </button>
                  <button
                    onClick={() => handleExport('powerpoint')}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      backgroundColor: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    📊 Export as PowerPoint
                  </button>
                </div>
              </div>
            )}

            {onClose && (
              <button
                onClick={onClose}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'white',
                  border: '1px solid #d0d0d0',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                ✕ Close
              </button>
            )}
          </div>
        </div>
      )}

      {/* Preview Content */}
      <div
        className="preview-content"
        style={{
          flex: 1,
          overflow: 'auto',
          padding: isPrintMode ? 0 : '2rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}
      >
        <div
          className="report-page"
          style={{
            width: report.layout === 'canvas' ? `${report.canvasWidth || 1200}px` : '100%',
            minHeight: report.layout === 'canvas' ? `${report.canvasHeight || 800}px` : 'auto',
            backgroundColor: 'white',
            boxShadow: isPrintMode ? 'none' : '0 2px 8px rgba(0,0,0,0.1)',
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease',
            position: 'relative',
          }}
        >
          {/* Render Report Elements */}
          {report.elements.map((element: ReportElement) => (
            <div
              key={element.id}
              style={{
                position: report.layout === 'canvas' ? 'absolute' : 'relative',
                left: report.layout === 'canvas' ? `${element.layout?.x || 0}px` : undefined,
                top: report.layout === 'canvas' ? `${element.layout?.y || 0}px` : undefined,
                width: report.layout === 'canvas' ? `${element.layout?.width || 400}px` : undefined,
                height: report.layout === 'canvas' ? `${element.layout?.height || 300}px` : undefined,
                zIndex: element.layout?.zIndex || 0,
              }}
            >
              <ReportElementRenderer element={element} data={data[element.id]} />
            </div>
          ))}

          {/* Empty State */}
          {report.elements.length === 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem',
                color: '#999',
                fontSize: '1rem',
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
              <div>This report has no elements</div>
            </div>
          )}
        </div>
      </div>

      {/* Print Styles */}
      <style>
        {`
          @media print {
            .preview-toolbar {
              display: none !important;
            }

            .report-preview {
              background: white !important;
            }

            .preview-content {
              padding: 0 !important;
            }

            .report-page {
              transform: none !important;
              box-shadow: none !important;
            }
          }

          .report-preview.fullscreen {
            background: white;
          }

          #export-dropdown button:hover {
            background-color: #f5f5f5;
          }
        `}
      </style>
    </div>
  );
};

export default ReportPreview;
