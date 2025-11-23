/**
 * Report Sharing Dialog
 *
 * Manages report sharing and permissions:
 * - Share with users and teams
 * - Permission levels (view, edit, admin)
 * - Public link generation
 * - Access control settings
 * - Share history
 */

import React, { useState } from 'react';

// ===================================================================
// TYPES
// ===================================================================

export type PermissionLevel = 'view' | 'edit' | 'admin';

export interface ShareEntry {
  id: string;
  targetType: 'user' | 'team' | 'organization';
  targetId: string;
  targetName: string;
  permission: PermissionLevel;
  sharedAt: Date;
  sharedBy: string;
}

export interface PublicLinkSettings {
  enabled: boolean;
  allowedActions: string[];
  expiresAt?: Date;
  password?: string;
  maxViews?: number;
}

interface ReportSharingDialogProps {
  reportId: string;
  reportName: string;
  currentShares: ShareEntry[];
  publicLink?: PublicLinkSettings;
  onShare: (targetType: string, targetId: string, permission: PermissionLevel) => Promise<void>;
  onRemoveShare: (shareId: string) => Promise<void>;
  onUpdatePermission: (shareId: string, permission: PermissionLevel) => Promise<void>;
  onGeneratePublicLink: (settings: PublicLinkSettings) => Promise<string>;
  onRevokePublicLink: () => Promise<void>;
  onClose: () => void;
}

// ===================================================================
// REPORT SHARING DIALOG COMPONENT
// ===================================================================

export const ReportSharingDialog: React.FC<ReportSharingDialogProps> = ({
  reportId,
  reportName,
  currentShares,
  publicLink,
  onShare,
  onRemoveShare,
  onUpdatePermission,
  onGeneratePublicLink,
  onRevokePublicLink,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'shares' | 'public'>('shares');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPermission, setSelectedPermission] = useState<PermissionLevel>('view');
  const [showPublicLinkSettings, setShowPublicLinkSettings] = useState(false);
  const [publicLinkPassword, setPublicLinkPassword] = useState('');
  const [publicLinkExpiry, setPublicLinkExpiry] = useState('never');
  const [isLoading, setIsLoading] = useState(false);

  // Mock user/team search results
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // ===================================================================
  // HANDLERS
  // ===================================================================

  const handleSearch = async (term: string) => {
    setSearchTerm(term);

    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    // Mock search - in real app, this would call an API
    const mockResults = [
      { type: 'user', id: 'user-1', name: 'John Doe', email: 'john@example.com' },
      { type: 'user', id: 'user-2', name: 'Jane Smith', email: 'jane@example.com' },
      { type: 'team', id: 'team-1', name: 'Engineering Team', memberCount: 15 },
      { type: 'team', id: 'team-2', name: 'Marketing Team', memberCount: 8 },
    ].filter((r) => r.name.toLowerCase().includes(term.toLowerCase()));

    setSearchResults(mockResults);
  };

  const handleAddShare = async (target: any) => {
    setIsLoading(true);
    try {
      await onShare(target.type, target.id, selectedPermission);
      setSearchTerm('');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    if (!confirm('Are you sure you want to remove this share?')) return;

    setIsLoading(true);
    try {
      await onRemoveShare(shareId);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePermission = async (shareId: string, permission: PermissionLevel) => {
    setIsLoading(true);
    try {
      await onUpdatePermission(shareId, permission);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePublicLink = async () => {
    setIsLoading(true);
    try {
      const settings: PublicLinkSettings = {
        enabled: true,
        allowedActions: ['view'],
        password: publicLinkPassword || undefined,
        expiresAt: publicLinkExpiry !== 'never' ? new Date(Date.now() + parseInt(publicLinkExpiry) * 24 * 60 * 60 * 1000) : undefined,
      };

      await onGeneratePublicLink(settings);
      setShowPublicLinkSettings(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokePublicLink = async () => {
    if (!confirm('Are you sure you want to revoke the public link? Anyone with this link will lose access.')) return;

    setIsLoading(true);
    try {
      await onRevokePublicLink();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    alert('Link copied to clipboard!');
  };

  // ===================================================================
  // RENDER
  // ===================================================================

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="sharing-dialog"
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          width: '90%',
          maxWidth: '700px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid #e0e0e0',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>
              Share "{reportName}"
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#666',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e0e0e0',
            padding: '0 1.5rem',
          }}
        >
          <button
            onClick={() => setActiveTab('shares')}
            style={{
              padding: '1rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'shares' ? '2px solid #4CAF50' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === 'shares' ? 600 : 400,
              color: activeTab === 'shares' ? '#4CAF50' : '#666',
            }}
          >
            People with Access ({currentShares.length})
          </button>
          <button
            onClick={() => setActiveTab('public')}
            style={{
              padding: '1rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'public' ? '2px solid #4CAF50' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === 'public' ? 600 : 400,
              color: activeTab === 'public' ? '#4CAF50' : '#666',
            }}
          >
            Public Link
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
          {activeTab === 'shares' && (
            <div>
              {/* Add Share */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Search users or teams..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: '1px solid #d0d0d0',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                    }}
                  />
                  <select
                    value={selectedPermission}
                    onChange={(e) => setSelectedPermission(e.target.value as PermissionLevel)}
                    style={{
                      padding: '0.75rem',
                      border: '1px solid #d0d0d0',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                    }}
                  >
                    <option value="view">Can View</option>
                    <option value="edit">Can Edit</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div
                    style={{
                      border: '1px solid #d0d0d0',
                      borderRadius: '4px',
                      maxHeight: '200px',
                      overflow: 'auto',
                    }}
                  >
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        onClick={() => handleAddShare(result)}
                        style={{
                          padding: '0.75rem',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f0f0f0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
                      >
                        <div>
                          <div style={{ fontWeight: 500 }}>{result.name}</div>
                          {result.email && <div style={{ fontSize: '0.75rem', color: '#666' }}>{result.email}</div>}
                          {result.memberCount && (
                            <div style={{ fontSize: '0.75rem', color: '#666' }}>
                              {result.memberCount} members
                            </div>
                          )}
                        </div>
                        <div
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#e8f5e9',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            color: '#2e7d32',
                          }}
                        >
                          {result.type === 'user' ? '👤 User' : '👥 Team'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Current Shares */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                  People with Access
                </h3>

                {currentShares.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '2rem',
                      color: '#999',
                      fontSize: '0.875rem',
                    }}
                  >
                    No one has access yet. Search above to share this report.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {currentShares.map((share) => (
                      <div
                        key={share.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.75rem',
                          border: '1px solid #e0e0e0',
                          borderRadius: '4px',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500 }}>{share.targetName}</div>
                          <div style={{ fontSize: '0.75rem', color: '#666' }}>
                            Shared {new Date(share.sharedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <select
                            value={share.permission}
                            onChange={(e) => handleChangePermission(share.id, e.target.value as PermissionLevel)}
                            disabled={isLoading}
                            style={{
                              padding: '0.5rem',
                              border: '1px solid #d0d0d0',
                              borderRadius: '4px',
                              fontSize: '0.875rem',
                            }}
                          >
                            <option value="view">Can View</option>
                            <option value="edit">Can Edit</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            onClick={() => handleRemoveShare(share.id)}
                            disabled={isLoading}
                            style={{
                              padding: '0.5rem 0.75rem',
                              backgroundColor: '#f44336',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: isLoading ? 'not-allowed' : 'pointer',
                              fontSize: '0.875rem',
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'public' && (
            <div>
              {publicLink?.enabled ? (
                <div>
                  <div
                    style={{
                      padding: '1rem',
                      backgroundColor: '#e8f5e9',
                      borderRadius: '4px',
                      marginBottom: '1rem',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                      🔗 Public Link Active
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#2e7d32', marginBottom: '1rem' }}>
                      Anyone with this link can view the report
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        value={`https://app.clickview.com/public/reports/${reportId}`}
                        readOnly
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          border: '1px solid #d0d0d0',
                          borderRadius: '4px',
                          fontSize: '0.875rem',
                          backgroundColor: '#f5f5f5',
                        }}
                      />
                      <button
                        onClick={() => handleCopyLink(`https://app.clickview.com/public/reports/${reportId}`)}
                        style={{
                          padding: '0.75rem 1rem',
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                        }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  {publicLink.expiresAt && (
                    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '1rem' }}>
                      Expires on {new Date(publicLink.expiresAt).toLocaleDateString()}
                    </div>
                  )}

                  <button
                    onClick={handleRevokePublicLink}
                    disabled={isLoading}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                    }}
                  >
                    Revoke Public Link
                  </button>
                </div>
              ) : (
                <div>
                  {!showPublicLinkSettings ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔗</div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        Create a Public Link
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '1.5rem' }}>
                        Anyone with the link will be able to view this report
                      </div>
                      <button
                        onClick={() => setShowPublicLinkSettings(true)}
                        style={{
                          padding: '0.75rem 1.5rem',
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                        }}
                      >
                        Generate Public Link
                      </button>
                    </div>
                  ) : (
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                        Configure Public Link
                      </h3>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                            Password Protection (Optional)
                          </label>
                          <input
                            type="password"
                            placeholder="Leave empty for no password"
                            value={publicLinkPassword}
                            onChange={(e) => setPublicLinkPassword(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '1px solid #d0d0d0',
                              borderRadius: '4px',
                              fontSize: '0.875rem',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                            Link Expiration
                          </label>
                          <select
                            value={publicLinkExpiry}
                            onChange={(e) => setPublicLinkExpiry(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '1px solid #d0d0d0',
                              borderRadius: '4px',
                              fontSize: '0.875rem',
                            }}
                          >
                            <option value="never">Never</option>
                            <option value="1">1 day</option>
                            <option value="7">7 days</option>
                            <option value="30">30 days</option>
                            <option value="90">90 days</option>
                          </select>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setShowPublicLinkSettings(false)}
                            style={{
                              padding: '0.75rem 1.5rem',
                              backgroundColor: 'white',
                              color: '#666',
                              border: '1px solid #d0d0d0',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleGeneratePublicLink}
                            disabled={isLoading}
                            style={{
                              padding: '0.75rem 1.5rem',
                              backgroundColor: '#4CAF50',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: isLoading ? 'not-allowed' : 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: 500,
                            }}
                          >
                            Generate Link
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'white',
              color: '#666',
              border: '1px solid #d0d0d0',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportSharingDialog;
