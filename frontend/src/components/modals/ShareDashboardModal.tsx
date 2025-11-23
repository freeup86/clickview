/**
 * Share Dashboard Modal
 *
 * Advanced sharing modal with:
 * - Public/private link generation
 * - Password protection
 * - Expiration dates
 * - Permission levels
 * - Link management
 */

import React, { useState, useEffect } from 'react';
import { XIcon } from '../icons';

export interface ShareLink {
  id: string;
  token: string;
  url: string;
  createdAt: string;
  expiresAt: string | null;
  hasPassword: boolean;
  permission: 'view' | 'edit' | 'admin';
  accessCount: number;
  lastAccessedAt: string | null;
  isActive: boolean;
}

interface ShareDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardId: string;
  dashboardName: string;
  existingLinks?: ShareLink[];
  onCreateLink: (data: {
    expiresIn?: number;
    password?: string;
    permission: 'view' | 'edit' | 'admin';
  }) => Promise<ShareLink>;
  onRevokeLink: (linkId: string) => void;
  onCopyLink: (url: string) => void;
}

const EXPIRATION_OPTIONS = [
  { label: 'Never', value: null },
  { label: '1 hour', value: 1 },
  { label: '24 hours', value: 24 },
  { label: '7 days', value: 168 },
  { label: '30 days', value: 720 },
  { label: '90 days', value: 2160 },
];

const PERMISSION_OPTIONS = [
  {
    value: 'view',
    label: 'View Only',
    description: 'Can view dashboard but cannot make changes',
    icon: '👁️',
  },
  {
    value: 'edit',
    label: 'Can Edit',
    description: 'Can view and edit widgets, but not settings',
    icon: '✏️',
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full access including settings and sharing',
    icon: '👑',
  },
] as const;

export const ShareDashboardModal: React.FC<ShareDashboardModalProps> = ({
  isOpen,
  onClose,
  dashboardId,
  dashboardName,
  existingLinks = [],
  onCreateLink,
  onRevokeLink,
  onCopyLink,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');
  const [expiresIn, setExpiresIn] = useState<number | null>(168); // 7 days default
  const [password, setPassword] = useState('');
  const [permission, setPermission] = useState<'view' | 'edit' | 'admin'>('view');
  const [showPassword, setShowPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Reset form
      setExpiresIn(168);
      setPassword('');
      setPermission('view');
      setShowPassword(false);
      setActiveTab('create');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateLink = async () => {
    setIsCreating(true);
    try {
      const link = await onCreateLink({
        expiresIn: expiresIn || undefined,
        password: password || undefined,
        permission,
      });
      onCopyLink(link.url);
      setActiveTab('manage');
      // Reset form
      setPassword('');
    } catch (error) {
      console.error('Failed to create share link:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = (url: string) => {
    onCopyLink(url);
  };

  const handleRevokeLink = (linkId: string) => {
    if (confirm('Revoke this share link? Users with this link will no longer have access.')) {
      onRevokeLink(linkId);
    }
  };

  const formatExpirationDate = (expiresAt: string | null) => {
    if (!expiresAt) return 'Never';
    const date = new Date(expiresAt);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `${diffDays} days`;
    return date.toLocaleDateString();
  };

  const activeLinks = existingLinks.filter((link) => link.isActive);
  const hasPasswordProtection = password.length > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Share Dashboard</h2>
              <p className="text-sm text-gray-600 mt-1">{dashboardName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 px-6 py-3 font-medium transition-colors ${
                activeTab === 'create'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🔗 Create New Link
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`flex-1 px-6 py-3 font-medium transition-colors ${
                activeTab === 'manage'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📋 Manage Links ({activeLinks.length})
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {activeTab === 'create' ? (
              <div className="space-y-5">
                {/* Permission Level */}
                <div>
                  <label className="label">Permission Level *</label>
                  <div className="space-y-2 mt-2">
                    {PERMISSION_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setPermission(option.value)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          permission === option.value
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{option.icon}</span>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{option.label}</div>
                            <div className="text-sm text-gray-600 mt-1">{option.description}</div>
                          </div>
                          {permission === option.value && (
                            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Expiration */}
                <div>
                  <label className="label">Link Expiration</label>
                  <select
                    value={expiresIn === null ? '' : expiresIn}
                    onChange={(e) => setExpiresIn(e.target.value ? Number(e.target.value) : null)}
                    className="input w-full"
                  >
                    {EXPIRATION_OPTIONS.map((option) => (
                      <option key={option.label} value={option.value === null ? '' : option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Password Protection */}
                <div>
                  <label className="label">Password Protection (Optional)</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Leave blank for no password"
                      className="input w-full pr-10"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {hasPasswordProtection && (
                    <div className="mt-2 text-sm text-green-600 flex items-center gap-1">
                      <span>🔒</span>
                      <span>Password protection enabled</span>
                    </div>
                  )}
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <div className="text-blue-600 text-xl">ℹ️</div>
                    <div className="text-sm text-blue-900">
                      <p className="font-semibold mb-1">Link Settings Summary:</p>
                      <ul className="space-y-1 text-blue-800">
                        <li>• Permission: <strong>{PERMISSION_OPTIONS.find(p => p.value === permission)?.label}</strong></li>
                        <li>• Expires: <strong>{expiresIn ? `${EXPIRATION_OPTIONS.find(e => e.value === expiresIn)?.label}` : 'Never'}</strong></li>
                        <li>• Password: <strong>{hasPasswordProtection ? 'Protected' : 'Not protected'}</strong></li>
                      </ul>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCreateLink}
                  disabled={isCreating}
                  className="w-full btn-primary py-3"
                >
                  {isCreating ? 'Creating Link...' : '🔗 Create Share Link'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeLinks.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No active share links</p>
                    <button
                      onClick={() => setActiveTab('create')}
                      className="mt-4 text-blue-600 hover:text-blue-700"
                    >
                      Create your first share link
                    </button>
                  </div>
                ) : (
                  activeLinks.map((link) => (
                    <div
                      key={link.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">
                            {PERMISSION_OPTIONS.find((p) => p.value === link.permission)?.icon}
                          </span>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {PERMISSION_OPTIONS.find((p) => p.value === link.permission)?.label}
                            </div>
                            <div className="text-xs text-gray-500">
                              Created {new Date(link.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {link.hasPassword && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                              🔒 Protected
                            </span>
                          )}
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            {formatExpirationDate(link.expiresAt)}
                          </span>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded p-2 mb-3 font-mono text-xs text-gray-700 break-all">
                        {link.url}
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
                        <span>Access count: {link.accessCount}</span>
                        {link.lastAccessedAt && (
                          <span>Last used: {new Date(link.lastAccessedAt).toLocaleDateString()}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyLink(link.url)}
                          className="flex-1 btn-secondary text-sm"
                        >
                          📋 Copy Link
                        </button>
                        <button
                          onClick={() => handleRevokeLink(link.id)}
                          className="btn-secondary text-sm text-red-600 hover:bg-red-50"
                        >
                          🗑️ Revoke
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end p-6 border-t bg-gray-50">
            <button onClick={onClose} className="btn-primary">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
