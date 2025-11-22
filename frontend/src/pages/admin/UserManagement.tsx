/**
 * User Management Admin Portal
 *
 * Comprehensive user administration interface:
 * - User list with search, filter, pagination
 * - User details and editing
 * - Role and permission assignment
 * - Account activation/deactivation
 * - Password reset
 * - Session management
 * - MFA management
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

// ===================================================================
// MAIN USER MANAGEMENT COMPONENT
// ===================================================================

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'locked'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

  const pageSize = 20;

  useEffect(() => {
    loadUsers();
  }, [currentPage, searchTerm, statusFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });

      const response = await api.get(`/admin/users?${params}`);
      setUsers(response.data.users);
      setTotalPages(Math.ceil(response.data.total / pageSize));
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (userData: CreateUserData) => {
    try {
      await api.post('/admin/users', userData);
      setShowCreateModal(false);
      loadUsers();
    } catch (error) {
      console.error('Failed to create user:', error);
      alert('Failed to create user');
    }
  };

  const handleUpdateUser = async (userId: string, userData: Partial<User>) => {
    try {
      await api.patch(`/admin/users/${userId}`, userData);
      setShowEditModal(false);
      loadUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('Failed to update user');
    }
  };

  const handleToggleStatus = async (userId: string, active: boolean) => {
    try {
      await api.patch(`/admin/users/${userId}/status`, { active });
      loadUsers();
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!confirm('Send password reset email to this user?')) return;

    try {
      await api.post(`/admin/users/${userId}/reset-password`);
      alert('Password reset email sent successfully');
    } catch (error) {
      console.error('Failed to reset password:', error);
      alert('Failed to send password reset email');
    }
  };

  const handleRevokeSessions = async (userId: string) => {
    if (!confirm('Revoke all sessions for this user? They will be logged out.')) return;

    try {
      await api.delete(`/admin/users/${userId}/sessions`);
      alert('All sessions revoked successfully');
    } catch (error) {
      console.error('Failed to revoke sessions:', error);
      alert('Failed to revoke sessions');
    }
  };

  const handleDisableMFA = async (userId: string) => {
    if (!confirm('Disable MFA for this user? This will reduce their account security.')) return;

    try {
      await api.post(`/admin/users/${userId}/disable-mfa`);
      loadUsers();
      alert('MFA disabled successfully');
    } catch (error) {
      console.error('Failed to disable MFA:', error);
      alert('Failed to disable MFA');
    }
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">User Management</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage users, roles, and permissions</p>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="flex-1 w-full md:w-auto">
            <input
              type="text"
              placeholder="Search users by name, email, or username..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="all">All Users</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="locked">Locked Only</option>
          </select>

          {/* Create Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold whitespace-nowrap"
          >
            + Create User
          </button>
        </div>
      </div>

      {/* User Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading users...</div>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <div className="text-gray-500">No users found</div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onEdit={() => {
                    setSelectedUser(user);
                    setShowEditModal(true);
                  }}
                  onManageRoles={() => {
                    setSelectedUser(user);
                    setShowRoleModal(true);
                  }}
                  onToggleStatus={handleToggleStatus}
                  onResetPassword={handleResetPassword}
                  onRevokeSessions={handleRevokeSessions}
                  onDisableMFA={handleDisableMFA}
                />
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateUser}
        />
      )}

      {showEditModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onSave={(data) => handleUpdateUser(selectedUser.id, data)}
        />
      )}

      {showRoleModal && selectedUser && (
        <ManageRolesModal
          user={selectedUser}
          onClose={() => {
            setShowRoleModal(false);
            setSelectedUser(null);
          }}
          onSave={loadUsers}
        />
      )}
    </div>
  );
};

// ===================================================================
// USER ROW COMPONENT
// ===================================================================

interface UserRowProps {
  user: User;
  onEdit: () => void;
  onManageRoles: () => void;
  onToggleStatus: (userId: string, active: boolean) => void;
  onResetPassword: (userId: string) => void;
  onRevokeSessions: (userId: string) => void;
  onDisableMFA: (userId: string) => void;
}

const UserRow: React.FC<UserRowProps> = ({
  user,
  onEdit,
  onManageRoles,
  onToggleStatus,
  onResetPassword,
  onRevokeSessions,
  onDisableMFA,
}) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
              {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name || 'No name'}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
            {user.username && (
              <div className="text-xs text-gray-400 dark:text-gray-500">@{user.username}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-wrap gap-1">
          {user.roles?.slice(0, 3).map((role: string) => (
            <span
              key={role}
              className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded"
            >
              {role}
            </span>
          ))}
          {user.roles && user.roles.length > 3 && (
            <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
              +{user.roles.length - 3}
            </span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col gap-1">
          <span
            className={`px-2 py-1 text-xs font-semibold rounded inline-block w-fit ${
              user.active
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
            }`}
          >
            {user.active ? 'Active' : 'Inactive'}
          </span>
          {user.emailVerified && (
            <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded inline-block w-fit">
              ✓ Verified
            </span>
          )}
          {user.mfaEnabled && (
            <span className="px-2 py-1 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded inline-block w-fit">
              🔒 MFA
            </span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
          >
            Actions ▼
          </button>

          {showActions && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowActions(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-20 border border-gray-200 dark:border-gray-700 py-1">
                <button
                  onClick={() => {
                    onEdit();
                    setShowActions(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  Edit User
                </button>
                <button
                  onClick={() => {
                    onManageRoles();
                    setShowActions(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  Manage Roles
                </button>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                <button
                  onClick={() => {
                    onToggleStatus(user.id, !user.active);
                    setShowActions(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  {user.active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => {
                    onResetPassword(user.id);
                    setShowActions(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  Reset Password
                </button>
                <button
                  onClick={() => {
                    onRevokeSessions(user.id);
                    setShowActions(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  Revoke Sessions
                </button>
                {user.mfaEnabled && (
                  <button
                    onClick={() => {
                      onDisableMFA(user.id);
                      setShowActions(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-orange-600 dark:text-orange-400"
                  >
                    Disable MFA
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
};

// ===================================================================
// CREATE USER MODAL
// ===================================================================

interface CreateUserModalProps {
  onClose: () => void;
  onCreate: (data: CreateUserData) => void;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState<CreateUserData>({
    email: '',
    username: '',
    name: '',
    password: '',
    sendWelcomeEmail: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Create New User</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Username
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password *
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.sendWelcomeEmail}
              onChange={(e) => setFormData({ ...formData, sendWelcomeEmail: e.target.checked })}
              className="rounded"
            />
            <label className="text-sm text-gray-700 dark:text-gray-300">Send welcome email</label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
            >
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ===================================================================
// EDIT USER MODAL
// ===================================================================

interface EditUserModalProps {
  user: User;
  onClose: () => void;
  onSave: (data: Partial<User>) => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    email: user.email,
    username: user.username || '',
    name: user.name || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Edit User</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Username
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ===================================================================
// MANAGE ROLES MODAL
// ===================================================================

interface ManageRolesModalProps {
  user: User;
  onClose: () => void;
  onSave: () => void;
}

const ManageRolesModal: React.FC<ManageRolesModalProps> = ({ user, onClose, onSave }) => {
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(user.roles || []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const response = await api.get('/admin/roles');
      setAvailableRoles(response.data.roles);
    } catch (error) {
      console.error('Failed to load roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await api.patch(`/admin/users/${user.id}/roles`, { roles: selectedRoles });
      onSave();
      onClose();
    } catch (error) {
      console.error('Failed to update roles:', error);
      alert('Failed to update roles');
    }
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Manage Roles</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{user.email}</p>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading roles...</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {availableRoles.map((role) => (
                <label
                  key={role.id}
                  className="flex items-start gap-3 p-3 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{role.name}</div>
                    {role.description && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">{role.description}</div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
            >
              Save Roles
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===================================================================
// TYPES
// ===================================================================

interface User {
  id: string;
  email: string;
  username?: string;
  name?: string;
  active: boolean;
  emailVerified: boolean;
  mfaEnabled: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  roles?: string[];
}

interface CreateUserData {
  email: string;
  username?: string;
  name?: string;
  password: string;
  sendWelcomeEmail?: boolean;
}

interface Role {
  id: string;
  name: string;
  description?: string;
}
