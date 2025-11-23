/**
 * Report Builder Page
 *
 * Main page for building, editing, and managing reports
 * Integrates all report builder components:
 * - DragDropReportBuilder (canvas)
 * - ReportPropertiesPanel (properties editor)
 * - ReportTemplateGallery (templates)
 * - ReportPreview (preview mode)
 * - ReportSharingDialog (sharing)
 * - ReportVersionHistory (versions)
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropReportBuilder } from '../components/DragDropReportBuilder';
import { ReportPreview } from '../components/ReportPreview';
import { ReportSharingDialog, ShareEntry, PermissionLevel, PublicLinkSettings } from '../components/ReportSharingDialog';
import { ReportVersionHistory, ReportVersion } from '../components/ReportVersionHistory';
import { ReportTemplateGallery } from '../components/ReportTemplateGallery';
import { Report } from '../types/reports';
import api from '../services/api';

// ===================================================================
// TYPES
// ===================================================================

type ViewMode = 'builder' | 'preview' | 'templates';
type SidePanel = 'none' | 'sharing' | 'versions';

// ===================================================================
// REPORT BUILDER PAGE
// ===================================================================

export const ReportBuilderPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();

  // State
  const [report, setReport] = useState<Report | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('builder');
  const [sidePanel, setSidePanel] = useState<SidePanel>('none');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [reportData, setReportData] = useState<Record<string, any>>({});

  // Sharing state
  const [shares, setShares] = useState<ShareEntry[]>([]);
  const [publicLink, setPublicLink] = useState<PublicLinkSettings | undefined>();

  // Version state
  const [versions, setVersions] = useState<ReportVersion[]>([]);

  // ===================================================================
  // EFFECTS
  // ===================================================================

  useEffect(() => {
    if (reportId) {
      loadReport(reportId);
      loadShares(reportId);
      loadVersions(reportId);
    } else {
      // New report
      setReport(createNewReport());
      setIsLoading(false);
    }
  }, [reportId]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Auto-save every 2 minutes
  useEffect(() => {
    if (!report || !hasUnsavedChanges) return;

    const autoSaveInterval = setInterval(() => {
      handleSave(true);
    }, 2 * 60 * 1000);

    return () => clearInterval(autoSaveInterval);
  }, [report, hasUnsavedChanges]);

  // ===================================================================
  // DATA LOADING
  // ===================================================================

  const createNewReport = (): Report => {
    return {
      id: 'new',
      name: 'Untitled Report',
      description: '',
      category: 'custom',
      elements: [],
      layout: 'canvas',
      canvasWidth: 1200,
      canvasHeight: 800,
      createdBy: 'current-user',
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };
  };

  const loadReport = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await api.get(`/api/reports/${id}`);
      if (response.data.success) {
        setReport(response.data.report);
        setReportData(response.data.data || {});
      }
    } catch (error) {
      console.error('Failed to load report:', error);
      alert('Failed to load report. Creating a new one instead.');
      setReport(createNewReport());
    } finally {
      setIsLoading(false);
    }
  };

  const loadShares = async (id: string) => {
    try {
      const response = await api.get(`/api/reports/${id}/shares`);
      if (response.data.success) {
        setShares(response.data.shares);
        setPublicLink(response.data.publicLink);
      }
    } catch (error) {
      console.error('Failed to load shares:', error);
      // Non-critical, continue
    }
  };

  const loadVersions = async (id: string) => {
    try {
      const response = await api.get(`/api/reports/${id}/versions`);
      if (response.data.success) {
        setVersions(response.data.versions);
      }
    } catch (error) {
      console.error('Failed to load versions:', error);
      // Non-critical, continue
    }
  };

  // ===================================================================
  // HANDLERS
  // ===================================================================

  const handleSave = async (isAutoSave = false) => {
    if (!report) return;

    setIsSaving(true);
    try {
      let response;

      if (report.id === 'new') {
        // Create new report
        response = await api.post('/api/reports', report);
        if (response.data.success) {
          const newReport = response.data.report;
          setReport(newReport);
          navigate(`/reports/${newReport.id}/edit`, { replace: true });
          if (!isAutoSave) {
            alert('Report created successfully!');
          }
        }
      } else {
        // Update existing report
        response = await api.put(`/api/reports/${report.id}`, report);
        if (response.data.success) {
          setReport(response.data.report);
          if (!isAutoSave) {
            alert('Report saved successfully!');
          }
        }
      }

      setHasUnsavedChanges(false);

      // Reload versions after save
      if (report.id !== 'new') {
        await loadVersions(report.id);
      }
    } catch (error: any) {
      console.error('Failed to save report:', error);
      alert(`Failed to save report: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReportChange = (updatedReport: Report) => {
    setReport(updatedReport);
    setHasUnsavedChanges(true);
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
        return;
      }
    }
    navigate('/reports');
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'powerpoint') => {
    if (!report || report.id === 'new') {
      alert('Please save the report before exporting.');
      return;
    }

    try {
      const response = await api.get(`/api/reports/${report.id}/export/${format}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const extensions = {
        pdf: 'pdf',
        excel: 'xlsx',
        powerpoint: 'pptx',
      };

      link.download = `${report.name}.${extensions[format]}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error(`Failed to export as ${format}:`, error);
      alert(`Failed to export report: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleTemplateSelect = (template: Report) => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Load template anyway?')) {
        return;
      }
    }

    setReport({
      ...template,
      id: report?.id || 'new',
      name: `${template.name} (Copy)`,
      createdBy: 'current-user',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    setHasUnsavedChanges(true);
    setViewMode('builder');
  };

  // ===================================================================
  // SHARING HANDLERS
  // ===================================================================

  const handleShare = async (targetType: string, targetId: string, permission: PermissionLevel) => {
    if (!report || report.id === 'new') {
      alert('Please save the report before sharing.');
      return;
    }

    try {
      const response = await api.post(`/api/reports/${report.id}/share`, {
        targetType,
        targetId,
        permission,
      });

      if (response.data.success) {
        await loadShares(report.id);
      }
    } catch (error: any) {
      console.error('Failed to share report:', error);
      alert(`Failed to share report: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    if (!report || report.id === 'new') return;

    try {
      await api.delete(`/api/reports/${report.id}/share/${shareId}`);
      await loadShares(report.id);
    } catch (error: any) {
      console.error('Failed to remove share:', error);
      alert(`Failed to remove share: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleUpdatePermission = async (shareId: string, permission: PermissionLevel) => {
    if (!report || report.id === 'new') return;

    try {
      await api.put(`/api/reports/${report.id}/share/${shareId}`, { permission });
      await loadShares(report.id);
    } catch (error: any) {
      console.error('Failed to update permission:', error);
      alert(`Failed to update permission: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleGeneratePublicLink = async (settings: PublicLinkSettings): Promise<string> => {
    if (!report || report.id === 'new') {
      throw new Error('Please save the report before generating a public link.');
    }

    try {
      const response = await api.post(`/api/reports/${report.id}/public-link`, settings);
      if (response.data.success) {
        setPublicLink(settings);
        return response.data.link;
      }
      throw new Error('Failed to generate public link');
    } catch (error: any) {
      console.error('Failed to generate public link:', error);
      throw error;
    }
  };

  const handleRevokePublicLink = async () => {
    if (!report || report.id === 'new') return;

    try {
      await api.delete(`/api/reports/${report.id}/public-link`);
      setPublicLink(undefined);
    } catch (error: any) {
      console.error('Failed to revoke public link:', error);
      alert(`Failed to revoke public link: ${error.response?.data?.error || error.message}`);
    }
  };

  // ===================================================================
  // VERSION HANDLERS
  // ===================================================================

  const handleRestoreVersion = async (versionId: string) => {
    if (!report || report.id === 'new') return;

    try {
      const response = await api.post(`/api/reports/${report.id}/restore/${versionId}`);
      if (response.data.success) {
        setReport(response.data.report);
        await loadVersions(report.id);
        alert('Version restored successfully!');
        setSidePanel('none');
      }
    } catch (error: any) {
      console.error('Failed to restore version:', error);
      alert(`Failed to restore version: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleCompareVersions = (versionId1: string, versionId2: string) => {
    // Open version comparison view
    window.open(`/reports/${report?.id}/compare?v1=${versionId1}&v2=${versionId2}`, '_blank');
  };

  const handleDeleteVersion = async (versionId: string) => {
    if (!report || report.id === 'new') return;

    try {
      await api.delete(`/api/reports/${report.id}/versions/${versionId}`);
      await loadVersions(report.id);
    } catch (error: any) {
      console.error('Failed to delete version:', error);
      alert(`Failed to delete version: ${error.response?.data?.error || error.message}`);
    }
  };

  // ===================================================================
  // RENDER
  // ===================================================================

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontSize: '1.25rem',
          color: '#666',
        }}
      >
        Loading report...
      </div>
    );
  }

  if (!report) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontSize: '1.25rem',
          color: '#666',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
        <div>Report not found</div>
        <button
          onClick={() => navigate('/reports')}
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Back to Reports
        </button>
      </div>
    );
  }

  return (
    <div
      className="report-builder-page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#f5f5f5',
      }}
    >
      {/* Top Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.5rem',
          backgroundColor: 'white',
          borderBottom: '1px solid #e0e0e0',
          gap: '1rem',
        }}
      >
        {/* Left: Report Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
          <button
            onClick={handleCancel}
            style={{
              padding: '0.5rem',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.25rem',
            }}
            title="Back to Reports"
          >
            ←
          </button>
          <input
            type="text"
            value={report.name}
            onChange={(e) => handleReportChange({ ...report, name: e.target.value })}
            style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              flex: 1,
              maxWidth: '400px',
            }}
            placeholder="Report Name"
          />
          {hasUnsavedChanges && (
            <span style={{ fontSize: '0.875rem', color: '#ff9800' }}>● Unsaved changes</span>
          )}
          {isSaving && <span style={{ fontSize: '0.875rem', color: '#666' }}>Saving...</span>}
        </div>

        {/* Center: View Mode Toggle */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            padding: '0.25rem',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
          }}
        >
          <button
            onClick={() => setViewMode('builder')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: viewMode === 'builder' ? 'white' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: viewMode === 'builder' ? 600 : 400,
            }}
          >
            🛠️ Builder
          </button>
          <button
            onClick={() => setViewMode('preview')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: viewMode === 'preview' ? 'white' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: viewMode === 'preview' ? 600 : 400,
            }}
          >
            👁️ Preview
          </button>
          <button
            onClick={() => setViewMode('templates')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: viewMode === 'templates' ? 'white' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: viewMode === 'templates' ? 600 : 400,
            }}
          >
            📋 Templates
          </button>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setSidePanel(sidePanel === 'versions' ? 'none' : 'versions')}
            disabled={report.id === 'new'}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'white',
              border: '1px solid #d0d0d0',
              borderRadius: '4px',
              cursor: report.id === 'new' ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
            }}
          >
            📜 Versions
          </button>
          <button
            onClick={() => setSidePanel(sidePanel === 'sharing' ? 'none' : 'sharing')}
            disabled={report.id === 'new'}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'white',
              border: '1px solid #d0d0d0',
              borderRadius: '4px',
              cursor: report.id === 'new' ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
            }}
          >
            🔗 Share
          </button>
          <button
            onClick={() => handleSave()}
            disabled={isSaving || !hasUnsavedChanges}
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: hasUnsavedChanges ? '#4CAF50' : '#e0e0e0',
              color: hasUnsavedChanges ? 'white' : '#999',
              border: 'none',
              borderRadius: '4px',
              cursor: isSaving || !hasUnsavedChanges ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Main View */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {viewMode === 'builder' && (
            <DragDropReportBuilder
              report={report}
              onSave={handleReportChange}
              onCancel={handleCancel}
            />
          )}

          {viewMode === 'preview' && (
            <ReportPreview
              report={report}
              data={reportData}
              onClose={() => setViewMode('builder')}
              onExport={handleExport}
            />
          )}

          {viewMode === 'templates' && (
            <ReportTemplateGallery
              onSelectTemplate={handleTemplateSelect}
              onClose={() => setViewMode('builder')}
            />
          )}
        </div>

        {/* Side Panel */}
        {sidePanel !== 'none' && (
          <div
            style={{
              width: '400px',
              backgroundColor: 'white',
              borderLeft: '1px solid #e0e0e0',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {sidePanel === 'versions' && (
              <ReportVersionHistory
                reportId={report.id}
                currentVersion={report.version || 1}
                versions={versions}
                onRestore={handleRestoreVersion}
                onCompare={handleCompareVersions}
                onDeleteVersion={handleDeleteVersion}
                onClose={() => setSidePanel('none')}
              />
            )}
          </div>
        )}
      </div>

      {/* Sharing Dialog (Modal) */}
      {sidePanel === 'sharing' && (
        <ReportSharingDialog
          reportId={report.id}
          reportName={report.name}
          currentShares={shares}
          publicLink={publicLink}
          onShare={handleShare}
          onRemoveShare={handleRemoveShare}
          onUpdatePermission={handleUpdatePermission}
          onGeneratePublicLink={handleGeneratePublicLink}
          onRevokePublicLink={handleRevokePublicLink}
          onClose={() => setSidePanel('none')}
        />
      )}
    </div>
  );
};

export default ReportBuilderPage;
