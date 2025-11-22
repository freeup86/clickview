import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  KeyIcon,
  ShieldCheckIcon,
  CloudIcon,
} from '@heroicons/react/24/outline';

interface SSOProvider {
  id: number;
  provider: 'google' | 'azure' | 'okta' | 'saml';
  name: string;
  enabled: boolean;
  clientId: string;
  clientSecret?: string;
  tenantId?: string; // For Azure
  domain?: string; // For Okta
  entryPoint?: string; // For SAML
  issuer?: string; // For SAML
  certificate?: string; // For SAML
  callbackUrl: string;
  autoProvision: boolean;
  defaultRole: string;
  attributeMapping: {
    email: string;
    firstName: string;
    lastName: string;
    groups?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface SSOConfig {
  enabled: boolean;
  providers: SSOProvider[];
  allowEmailPasswordLogin: boolean;
  requireMFA: boolean;
  sessionTimeout: number; // in seconds
}

export const SSOConfiguration: React.FC = () => {
  const [config, setConfig] = useState<SSOConfig>({
    enabled: false,
    providers: [],
    allowEmailPasswordLogin: true,
    requireMFA: false,
    sessionTimeout: 86400, // 24 hours
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<number | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<SSOProvider | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<SSOProvider | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [newProvider, setNewProvider] = useState<Partial<SSOProvider>>({
    provider: 'google',
    name: '',
    enabled: true,
    autoProvision: true,
    defaultRole: 'user',
    attributeMapping: {
      email: 'email',
      firstName: 'given_name',
      lastName: 'family_name',
    },
  });

  useEffect(() => {
    fetchSSOConfig();
  }, []);

  const fetchSSOConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/sso/config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch SSO configuration');

      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Error fetching SSO config:', error);
      setMessage({ type: 'error', text: 'Failed to load SSO configuration' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSSO = async (enabled: boolean) => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/sso/config', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ enabled }),
      });

      if (!response.ok) throw new Error('Failed to update SSO configuration');

      setConfig({ ...config, enabled });
      setMessage({ type: 'success', text: `SSO ${enabled ? 'enabled' : 'disabled'} successfully` });
    } catch (error) {
      console.error('Error updating SSO config:', error);
      setMessage({ type: 'error', text: 'Failed to update SSO configuration' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddProvider = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/sso/providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(newProvider),
      });

      if (!response.ok) throw new Error('Failed to add SSO provider');

      const provider = await response.json();
      setConfig({
        ...config,
        providers: [...config.providers, provider],
      });
      setShowAddModal(false);
      setMessage({ type: 'success', text: 'SSO provider added successfully' });

      // Reset form
      setNewProvider({
        provider: 'google',
        name: '',
        enabled: true,
        autoProvision: true,
        defaultRole: 'user',
        attributeMapping: {
          email: 'email',
          firstName: 'given_name',
          lastName: 'family_name',
        },
      });
    } catch (error) {
      console.error('Error adding provider:', error);
      setMessage({ type: 'error', text: 'Failed to add SSO provider' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProvider = async (providerId: number, updates: Partial<SSOProvider>) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/admin/sso/providers/${providerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update SSO provider');

      const updatedProvider = await response.json();
      setConfig({
        ...config,
        providers: config.providers.map(p =>
          p.id === providerId ? updatedProvider : p
        ),
      });
      setMessage({ type: 'success', text: 'SSO provider updated successfully' });
    } catch (error) {
      console.error('Error updating provider:', error);
      setMessage({ type: 'error', text: 'Failed to update SSO provider' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProvider = async (providerId: number) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/admin/sso/providers/${providerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete SSO provider');

      setConfig({
        ...config,
        providers: config.providers.filter(p => p.id !== providerId),
      });
      setShowDeleteModal(null);
      setMessage({ type: 'success', text: 'SSO provider deleted successfully' });
    } catch (error) {
      console.error('Error deleting provider:', error);
      setMessage({ type: 'error', text: 'Failed to delete SSO provider' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestProvider = async (providerId: number) => {
    try {
      setTesting(providerId);
      const response = await fetch(`/api/admin/sso/providers/${providerId}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('SSO test failed');

      const result = await response.json();
      if (result.success) {
        setMessage({ type: 'success', text: 'SSO connection test successful' });
      } else {
        setMessage({ type: 'error', text: `SSO test failed: ${result.error}` });
      }
    } catch (error) {
      console.error('Error testing provider:', error);
      setMessage({ type: 'error', text: 'Failed to test SSO provider' });
    } finally {
      setTesting(null);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google':
        return '🔵'; // Google blue
      case 'azure':
        return '☁️'; // Azure cloud
      case 'okta':
        return '🔷'; // Okta blue
      case 'saml':
        return '🔐'; // Generic SAML lock
      default:
        return '🔑';
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'google':
        return 'blue';
      case 'azure':
        return 'cyan';
      case 'okta':
        return 'indigo';
      case 'saml':
        return 'purple';
      default:
        return 'gray';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          SSO Configuration
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configure Single Sign-On providers for enterprise authentication
        </p>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
            : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <CheckCircleIcon className="h-5 w-5 mr-2" />
            ) : (
              <XCircleIcon className="h-5 w-5 mr-2" />
            )}
            <span>{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className="ml-auto text-sm underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Global SSO Settings */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Global Settings
        </h2>

        <div className="space-y-4">
          {/* Enable SSO */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Enable SSO
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Allow users to authenticate using SSO providers
              </p>
            </div>
            <button
              onClick={() => handleToggleSSO(!config.enabled)}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Allow Email/Password Login */}
          <div className="flex items-center justify-between pt-4 border-t dark:border-gray-700">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Allow Email/Password Login
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Users can still login with email and password
              </p>
            </div>
            <button
              onClick={() => handleUpdateProvider(0, {
                allowEmailPasswordLogin: !config.allowEmailPasswordLogin
              } as any)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.allowEmailPasswordLogin ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.allowEmailPasswordLogin ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Session Timeout */}
          <div className="pt-4 border-t dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Session Timeout (hours)
            </label>
            <input
              type="number"
              min="1"
              max="168"
              value={config.sessionTimeout / 3600}
              onChange={(e) => setConfig({
                ...config,
                sessionTimeout: parseInt(e.target.value) * 3600
              })}
              className="w-32 px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* SSO Providers */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            SSO Providers
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Provider
          </button>
        </div>

        {config.providers.length === 0 ? (
          <div className="text-center py-12">
            <ShieldCheckIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No SSO providers configured
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Add your first provider →
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {config.providers.map((provider) => (
              <div
                key={provider.id}
                className="border dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <span className="text-3xl mr-3">{getProviderIcon(provider.provider)}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {provider.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                        {provider.provider}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      provider.enabled
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                    }`}>
                      {provider.enabled ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Client ID:</span>
                    <code className="ml-2 text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {provider.clientId.substring(0, 20)}...
                    </code>
                  </div>
                  {provider.domain && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Domain:</span>
                      <span className="ml-2 font-mono text-xs">{provider.domain}</span>
                    </div>
                  )}
                  {provider.tenantId && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Tenant ID:</span>
                      <code className="ml-2 text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {provider.tenantId.substring(0, 20)}...
                      </code>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Auto-provision:</span>
                    <span className="ml-2">{provider.autoProvision ? 'Yes' : 'No'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Default Role:</span>
                    <span className="ml-2 capitalize">{provider.defaultRole}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleTestProvider(provider.id)}
                    disabled={testing === provider.id}
                    className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {testing === provider.id ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 inline mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <ShieldCheckIcon className="h-4 w-4 inline mr-2" />
                        Test
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedProvider(provider)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Configure
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(provider)}
                    className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Provider Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Add SSO Provider
            </h2>

            <div className="space-y-4">
              {/* Provider Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Provider Type
                </label>
                <select
                  value={newProvider.provider}
                  onChange={(e) => setNewProvider({
                    ...newProvider,
                    provider: e.target.value as any
                  })}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="google">Google OAuth 2.0</option>
                  <option value="azure">Microsoft Azure AD</option>
                  <option value="okta">Okta</option>
                  <option value="saml">SAML 2.0</option>
                </select>
              </div>

              {/* Provider Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Provider Name
                </label>
                <input
                  type="text"
                  value={newProvider.name}
                  onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                  placeholder="e.g., Company Google SSO"
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Client ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Client ID
                </label>
                <input
                  type="text"
                  value={newProvider.clientId || ''}
                  onChange={(e) => setNewProvider({ ...newProvider, clientId: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                />
              </div>

              {/* Client Secret */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Client Secret
                </label>
                <input
                  type="password"
                  value={newProvider.clientSecret || ''}
                  onChange={(e) => setNewProvider({ ...newProvider, clientSecret: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                />
              </div>

              {/* Provider-specific fields */}
              {newProvider.provider === 'azure' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tenant ID
                  </label>
                  <input
                    type="text"
                    value={newProvider.tenantId || ''}
                    onChange={(e) => setNewProvider({ ...newProvider, tenantId: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  />
                </div>
              )}

              {newProvider.provider === 'okta' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Okta Domain
                  </label>
                  <input
                    type="text"
                    value={newProvider.domain || ''}
                    onChange={(e) => setNewProvider({ ...newProvider, domain: e.target.value })}
                    placeholder="your-domain.okta.com"
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              )}

              {newProvider.provider === 'saml' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Entry Point (SSO URL)
                    </label>
                    <input
                      type="url"
                      value={newProvider.entryPoint || ''}
                      onChange={(e) => setNewProvider({ ...newProvider, entryPoint: e.target.value })}
                      className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Issuer
                    </label>
                    <input
                      type="text"
                      value={newProvider.issuer || ''}
                      onChange={(e) => setNewProvider({ ...newProvider, issuer: e.target.value })}
                      className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Certificate (X.509)
                    </label>
                    <textarea
                      value={newProvider.certificate || ''}
                      onChange={(e) => setNewProvider({ ...newProvider, certificate: e.target.value })}
                      rows={4}
                      placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                      className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-xs"
                    />
                  </div>
                </>
              )}

              {/* Auto-provision */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={newProvider.autoProvision}
                  onChange={(e) => setNewProvider({ ...newProvider, autoProvision: e.target.checked })}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Auto-provision new users on first login
                </label>
              </div>

              {/* Default Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Default Role for New Users
                </label>
                <select
                  value={newProvider.defaultRole}
                  onChange={(e) => setNewProvider({ ...newProvider, defaultRole: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="user">User</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProvider}
                disabled={saving || !newProvider.name || !newProvider.clientId}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Adding...' : 'Add Provider'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Delete SSO Provider
              </h2>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete <strong>{showDeleteModal.name}</strong>?
              Users will no longer be able to authenticate using this provider.
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="flex-1 px-4 py-2 border dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProvider(showDeleteModal.id)}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
