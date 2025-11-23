/**
 * Report Version History Component
 *
 * Displays and manages report versions:
 * - Version list with timestamps
 * - Version comparison (diff view)
 * - Version restore
 * - Version metadata (author, changes summary)
 * - Version deletion
 */

import React, { useState } from 'react';
import { Report } from '../types/reports';

// ===================================================================
// TYPES
// ===================================================================

export interface ReportVersion {
  id: string;
  versionNumber: number;
  reportId: string;
  snapshot: Report;
  createdAt: Date;
  createdBy: string;
  createdByName: string;
  changesSummary?: string;
  comment?: string;
  tags?: string[];
}

interface ReportVersionHistoryProps {
  reportId: string;
  currentVersion: number;
  versions: ReportVersion[];
  onRestore: (versionId: string) => Promise<void>;
  onCompare: (versionId1: string, versionId2: string) => void;
  onDeleteVersion: (versionId: string) => Promise<void>;
  onClose?: () => void;
}

// ===================================================================
// REPORT VERSION HISTORY COMPONENT
// ===================================================================

export const ReportVersionHistory: React.FC<ReportVersionHistoryProps> = ({
  reportId,
  currentVersion,
  versions,
  onRestore,
  onCompare,
  onDeleteVersion,
  onClose,
}) => {
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  // Sort versions by version number descending (newest first)
  const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);

  // ===================================================================
  // HANDLERS
  // ===================================================================

  const handleVersionClick = (versionId: string) => {
    if (selectedVersions.includes(versionId)) {
      setSelectedVersions(selectedVersions.filter((id) => id !== versionId));
    } else if (selectedVersions.length < 2) {
      setSelectedVersions([...selectedVersions, versionId]);
    } else {
      // Replace oldest selection
      setSelectedVersions([selectedVersions[1], versionId]);
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!confirm('Are you sure you want to restore this version? Your current work will be saved as a new version.')) {
      return;
    }

    setIsLoading(true);
    try {
      await onRestore(versionId);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompare = () => {
    if (selectedVersions.length === 2) {
      onCompare(selectedVersions[0], selectedVersions[1]);
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    if (!confirm('Are you sure you want to delete this version? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    try {
      await onDeleteVersion(versionId);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpanded = (versionId: string) => {
    setExpandedVersion(expandedVersion === versionId ? null : versionId);
  };

  // ===================================================================
  // RENDER
  // ===================================================================

  return (
    <div
      className="version-history"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'white',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '1.5rem',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>
            Version History
          </h2>
          <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>
            {versions.length} version{versions.length !== 1 ? 's' : ''} available
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {selectedVersions.length === 2 && (
            <button
              onClick={handleCompare}
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              Compare Selected
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'white',
                color: '#666',
                border: '1px solid #d0d0d0',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Instructions */}
      {selectedVersions.length < 2 && (
        <div
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#e3f2fd',
            color: '#1976d2',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>ℹ️</span>
          <span>
            {selectedVersions.length === 0
              ? 'Select two versions to compare'
              : 'Select one more version to compare'}
          </span>
        </div>
      )}

      {/* Version List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
        {sortedVersions.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              color: '#999',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
            <div style={{ fontSize: '1rem' }}>No version history yet</div>
            <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Versions are automatically created when you save changes
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {sortedVersions.map((version) => {
              const isCurrentVersion = version.versionNumber === currentVersion;
              const isSelected = selectedVersions.includes(version.id);
              const isExpanded = expandedVersion === version.id;

              return (
                <div
                  key={version.id}
                  style={{
                    border: `2px solid ${isSelected ? '#4CAF50' : '#e0e0e0'}`,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    backgroundColor: isCurrentVersion ? '#f5f5f5' : 'white',
                  }}
                >
                  {/* Version Header */}
                  <div
                    onClick={() => handleVersionClick(version.id)}
                    style={{
                      padding: '1rem',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <div
                          style={{
                            fontSize: '1rem',
                            fontWeight: 600,
                            color: isCurrentVersion ? '#4CAF50' : '#333',
                          }}
                        >
                          Version {version.versionNumber}
                        </div>

                        {isCurrentVersion && (
                          <span
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#4CAF50',
                              color: 'white',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                            }}
                          >
                            CURRENT
                          </span>
                        )}

                        {version.tags && version.tags.length > 0 && (
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            {version.tags.map((tag) => (
                              <span
                                key={tag}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  backgroundColor: '#e3f2fd',
                                  color: '#1976d2',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{ fontSize: '0.875rem', color: '#666' }}>
                        By {version.createdByName} on {new Date(version.createdAt).toLocaleString()}
                      </div>

                      {version.changesSummary && (
                        <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>
                          {version.changesSummary}
                        </div>
                      )}

                      {version.comment && (
                        <div
                          style={{
                            fontSize: '0.875rem',
                            color: '#333',
                            marginTop: '0.5rem',
                            fontStyle: 'italic',
                          }}
                        >
                          "{version.comment}"
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpanded(version.id);
                        }}
                        style={{
                          padding: '0.5rem 0.75rem',
                          backgroundColor: 'white',
                          border: '1px solid #d0d0d0',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                        }}
                      >
                        {isExpanded ? '▼' : '▶'} Details
                      </button>

                      {!isCurrentVersion && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestore(version.id);
                          }}
                          disabled={isLoading}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            fontSize: '0.875rem',
                          }}
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: '1rem',
                        backgroundColor: '#fafafa',
                        borderTop: '1px solid #e0e0e0',
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#999', marginBottom: '0.25rem' }}>
                            VERSION ID
                          </div>
                          <div style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>
                            {version.id.substring(0, 8)}...
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#999', marginBottom: '0.25rem' }}>
                            ELEMENTS
                          </div>
                          <div style={{ fontSize: '0.875rem' }}>
                            {version.snapshot.elements.length} element{version.snapshot.elements.length !== 1 ? 's' : ''}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#999', marginBottom: '0.25rem' }}>
                            LAYOUT
                          </div>
                          <div style={{ fontSize: '0.875rem' }}>
                            {version.snapshot.layout || 'canvas'}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#999', marginBottom: '0.25rem' }}>
                            CATEGORY
                          </div>
                          <div style={{ fontSize: '0.875rem' }}>
                            {version.snapshot.category || 'None'}
                          </div>
                        </div>
                      </div>

                      {!isCurrentVersion && (
                        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleDeleteVersion(version.id)}
                            disabled={isLoading}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#f44336',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: isLoading ? 'not-allowed' : 'pointer',
                              fontSize: '0.875rem',
                            }}
                          >
                            Delete Version
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer with Stats */}
      <div
        style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #e0e0e0',
          backgroundColor: '#fafafa',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.875rem',
          color: '#666',
        }}
      >
        <div>
          {selectedVersions.length > 0 && (
            <span>
              {selectedVersions.length} version{selectedVersions.length !== 1 ? 's' : ''} selected
            </span>
          )}
        </div>
        <div>
          Current: Version {currentVersion}
        </div>
      </div>
    </div>
  );
};

export default ReportVersionHistory;
