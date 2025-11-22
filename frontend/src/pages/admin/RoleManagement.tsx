/**
 * Role & Permission Management
 *
 * Comprehensive role and permission administration:
 * - Role list and management
 * - Permission assignment
 * - System vs custom roles
 * - Permission categories
 * - Resource-level permissions
 * - Role templates
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

// ===================================================================
// MAIN ROLE MANAGEMENT COMPONENT
// ===================================================================

export const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/roles');
      setRoles(response.data.roles);
    } catch (error) {
      console.error('Failed to load roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: CreateRoleData) => {
    try {
      await api.post('/admin/roles', data);
      setShowCreateModal(false);
      loadRoles();
    } catch (error) {
      console.error('Failed to create role:', error);
      alert('Failed to create role');
    }
  };

  const handleUpdate = async (roleId: string, data: Partial<Role>) => {
    try {
      await api.patch(`/admin/roles/${roleId}`, data);
      setShowEditModal(false);
      loadRoles();
    } catch (error) {
      console.error('Failed to update role:', error);
      alert('Failed to update role');
    }
  };

  const handleDelete = async (roleId: string) => {
    if (!confirm('Delete this role? Users with this role will lose associated permissions.')) return;

    try {
      await api.delete(`/admin/roles/${roleId}`);
      loadRoles();
    } catch (error) {
      console.error('Failed to delete role:', error);
      alert('Failed to delete role');
    }
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Role & Permission Management</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Configure roles and permissions</p>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 p-4">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {roles.length} role{roles.length !== 1 ? 's' : ''} configured
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
          >
            + Create Role
          </button>
        </div>
      </div>

      {/* Role Cards */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading roles...</div>
        </div>
      ) : roles.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <div className="text-gray-500">No roles found</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              onEdit={() => {
                setSelectedRole(role);
                setShowEditModal(true);
              }}
              onPermissions={() => {
                setSelectedRole(role);
                setShowPermissionsModal(true);
              }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateRoleModal onClose={() => setShowCreateModal(false)} onCreate={handleCreate} />
      )}

      {showEditModal && selectedRole && (
        <EditRoleModal
          role={selectedRole}
          onClose={() => {
            setShowEditModal(false);
            setSelectedRole(null);
          }}
          onSave={(data) => handleUpdate(selectedRole.id, data)}
        />
      )}

      {showPermissionsModal && selectedRole && (
        <PermissionsModal
          role={selectedRole}
          onClose={() => {
            setShowPermissionsModal(false);
            setSelectedRole(null);
          }}
          onSave={loadRoles}
        />
      )}
    </div>
  );
};

// ===================================================================
// ROLE CARD COMPONENT
// ===================================================================

interface RoleCardProps {
  role: Role;
  onEdit: () => void;
  onPermissions: () => void;
  onDelete: (id: string) => void;
}

const RoleCard: React.FC<RoleCardProps> = ({ role, onEdit, onPermissions, onDelete }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{role.name}</h3>
            {role.system && (
              <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                System
              </span>
            )}
          </div>
          {role.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{role.description}</p>
          )}
        </div>
      </div>

      <div className="mb-4">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Permissions</div>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {role.permissionCount || 0}
        </div>
      </div>

      <div className="mb-4">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Users</div>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {role.userCount || 0}
        </div>
      </div>

      <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        {!role.system && (
          <button
            onClick={onEdit}
            className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
          >
            Edit
          </button>
        )}
        <button
          onClick={onPermissions}
          className="flex-1 px-3 py-2 text-sm bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded"
        >
          Permissions
        </button>
        {!role.system && (
          <button
            onClick={() => onDelete(role.id)}
            className="px-3 py-2 text-sm bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

// ===================================================================
// CREATE ROLE MODAL
// ===================================================================

interface CreateRoleModalProps {
  onClose: () => void;
  onCreate: (data: CreateRoleData) => void;
}

const CreateRoleModal: React.FC<CreateRoleModalProps> = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState<CreateRoleData>({
    name: '',
    description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Create Role</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Role Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
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
              Create Role
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ===================================================================
// EDIT ROLE MODAL
// ===================================================================

interface EditRoleModalProps {
  role: Role;
  onClose: () => void;
  onSave: (data: Partial<Role>) => void;
}

const EditRoleModal: React.FC<EditRoleModalProps> = ({ role, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: role.name,
    description: role.description || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Edit Role</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Role Name
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
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
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
// PERMISSIONS MODAL
// ===================================================================

interface PermissionsModalProps {
  role: Role;
  onClose: () => void;
  onSave: () => void;
}

const PermissionsModal: React.FC<PermissionsModalProps> = ({ role, onClose, onSave }) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    setLoading(true);
    try {
      const [permissionsRes, rolePermsRes] = await Promise.all([
        api.get('/admin/permissions'),
        api.get(`/admin/roles/${role.id}/permissions`),
      ]);

      setPermissions(permissionsRes.data.permissions);
      setSelectedPermissions(rolePermsRes.data.permissions.map((p: Permission) => p.id));
    } catch (error) {
      console.error('Failed to load permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await api.put(`/admin/roles/${role.id}/permissions`, {
        permissions: selectedPermissions,
      });
      onSave();
      onClose();
    } catch (error) {
      console.error('Failed to update permissions:', error);
      alert('Failed to update permissions');
    }
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId) ? prev.filter((p) => p !== permissionId) : [...prev, permissionId]
    );
  };

  const categories = [...new Set(permissions.map((p) => p.category))];
  const filteredPermissions =
    filter === 'all' ? permissions : permissions.filter((p) => p.category === filter);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Manage Permissions</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{role.name}</p>
        </div>

        {/* Category Filter */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setFilter(category)}
                className={`px-4 py-2 rounded whitespace-nowrap ${
                  filter === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading permissions...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPermissions.map((permission) => (
                <label
                  key={permission.id}
                  className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(permission.id)}
                    onChange={() => togglePermission(permission.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{permission.name}</div>
                    {permission.description && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{permission.description}</div>
                    )}
                    <div className="flex gap-2 mt-2">
                      <span className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">
                        {permission.category}
                      </span>
                      <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded">
                        {permission.resource}:{permission.action}
                      </span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-3">
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
              Save Permissions ({selectedPermissions.length})
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

interface Role {
  id: string;
  name: string;
  description?: string;
  system?: boolean;
  permissionCount?: number;
  userCount?: number;
  createdAt: Date;
}

interface CreateRoleData {
  name: string;
  description?: string;
}

interface Permission {
  id: string;
  name: string;
  description?: string;
  category: string;
  resource: string;
  action: string;
}
