/**
 * Permissions Manager Component
 *
 * Manage user permissions for dashboards with:
 * - User/team selection
 * - Role assignment (viewer/editor/admin)
 * - Permission inheritance
 * - Access control
 */

import React, { useState } from 'react';
import { XIcon, TrashIcon } from './icons';

export interface Permission {
  id: string;
  userId?: string;
  teamId?: string;
  userName?: string;
  teamName?: string;
  userEmail?: string;
  role: 'viewer' | 'editor' | 'admin';
  inheritedFrom?: string;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface Team {
  id: string;
  name: string;
  memberCount: number;
}

interface PermissionsManagerProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardId: string;
  dashboardName: string;
  permissions: Permission[];
  availableUsers: User[];
  availableTeams: Team[];
  onAddPermission: (data: {
    userId?: string;
    teamId?: string;
    role: 'viewer' | 'editor' | 'admin';
  }) => void;
  onUpdatePermission: (permissionId: string, role: 'viewer' | 'editor' | 'admin') => void;
  onRemovePermission: (permissionId: string) => void;
  currentUserId: string;
}

const ROLE_OPTIONS = [
  {
    value: 'viewer',
    label: 'Viewer',
    description: 'Can view dashboard',
    icon: '👁️',
    permissions: ['View dashboard', 'View data', 'Export data'],
  },
  {
    value: 'editor',
    label: 'Editor',
    description: 'Can edit dashboard',
    icon: '✏️',
    permissions: ['All viewer permissions', 'Edit widgets', 'Add/remove widgets', 'Edit filters'],
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full control',
    icon: '👑',
    permissions: ['All editor permissions', 'Manage permissions', 'Delete dashboard', 'Dashboard settings'],
  },
] as const;

export const PermissionsManager: React.FC<PermissionsManagerProps> = ({
  isOpen,
  onClose,
  dashboardId,
  dashboardName,
  permissions,
  availableUsers,
  availableTeams,
  onAddPermission,
  onUpdatePermission,
  onRemovePermission,
  currentUserId,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'teams'>('users');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'viewer' | 'editor' | 'admin'>('viewer');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const handleAddUser = () => {
    if (!selectedUserId) return;
    onAddPermission({ userId: selectedUserId, role: selectedRole });
    setSelectedUserId('');
    setSelectedRole('viewer');
  };

  const handleAddTeam = () => {
    if (!selectedTeamId) return;
    onAddPermission({ teamId: selectedTeamId, role: selectedRole });
    setSelectedTeamId('');
    setSelectedRole('viewer');
  };

  const handleRemove = (permissionId: string, isCurrentUser: boolean) => {
    if (isCurrentUser) {
      if (!confirm('Remove your own access? You will no longer be able to access this dashboard.')) {
        return;
      }
    }
    onRemovePermission(permissionId);
  };

  const userPermissions = permissions.filter((p) => p.userId);
  const teamPermissions = permissions.filter((p) => p.teamId);

  const filteredUsers = availableUsers.filter((user) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getRoleInfo = (role: string) => {
    return ROLE_OPTIONS.find((r) => r.value === role);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Manage Permissions</h2>
              <p className="text-sm text-gray-600 mt-1">{dashboardName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {/* Add Permission Section */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Add People or Teams</h3>

              {/* Tabs */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setActiveTab('users')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'users'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  👤 Users
                </button>
                <button
                  onClick={() => setActiveTab('teams')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'teams'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  👥 Teams
                </button>
              </div>

              {activeTab === 'users' ? (
                <div className="space-y-3">
                  <div>
                    <label className="label text-sm">Select User</label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search users..."
                      className="input w-full mb-2"
                    />
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="input w-full"
                    >
                      <option value="">Choose a user...</option>
                      {filteredUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label text-sm">Role</label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as any)}
                      className="input w-full"
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.icon} {role.label} - {role.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleAddUser}
                    disabled={!selectedUserId}
                    className="btn-primary w-full"
                  >
                    Add User
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="label text-sm">Select Team</label>
                    <select
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                      className="input w-full"
                    >
                      <option value="">Choose a team...</option>
                      {availableTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name} ({team.memberCount} members)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label text-sm">Role</label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as any)}
                      className="input w-full"
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.icon} {role.label} - {role.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleAddTeam}
                    disabled={!selectedTeamId}
                    className="btn-primary w-full"
                  >
                    Add Team
                  </button>
                </div>
              )}
            </div>

            {/* Current Permissions */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">
                Current Access ({userPermissions.length + teamPermissions.length})
              </h3>

              {/* User Permissions */}
              {userPermissions.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm font-semibold text-gray-600 mb-2">Users</div>
                  <div className="space-y-2">
                    {userPermissions.map((permission) => {
                      const roleInfo = getRoleInfo(permission.role);
                      const isCurrentUser = permission.userId === currentUserId;

                      return (
                        <div
                          key={permission.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-sm">
                                {permission.userName?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                {permission.userName}
                                {isCurrentUser && (
                                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">{permission.userEmail}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <select
                              value={permission.role}
                              onChange={(e) => onUpdatePermission(permission.id, e.target.value as any)}
                              className="input text-sm py-1"
                              disabled={permission.inheritedFrom !== undefined}
                            >
                              {ROLE_OPTIONS.map((role) => (
                                <option key={role.value} value={role.value}>
                                  {role.icon} {role.label}
                                </option>
                              ))}
                            </select>

                            <button
                              onClick={() => handleRemove(permission.id, isCurrentUser)}
                              className="p-2 hover:bg-red-50 rounded transition-colors"
                              title="Remove access"
                            >
                              <TrashIcon className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Team Permissions */}
              {teamPermissions.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-gray-600 mb-2">Teams</div>
                  <div className="space-y-2">
                    {teamPermissions.map((permission) => {
                      const roleInfo = getRoleInfo(permission.role);

                      return (
                        <div
                          key={permission.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                              <span className="text-purple-600 font-semibold text-sm">👥</span>
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{permission.teamName}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <select
                              value={permission.role}
                              onChange={(e) => onUpdatePermission(permission.id, e.target.value as any)}
                              className="input text-sm py-1"
                            >
                              {ROLE_OPTIONS.map((role) => (
                                <option key={role.value} value={role.value}>
                                  {role.icon} {role.label}
                                </option>
                              ))}
                            </select>

                            <button
                              onClick={() => handleRemove(permission.id, false)}
                              className="p-2 hover:bg-red-50 rounded transition-colors"
                              title="Remove access"
                            >
                              <TrashIcon className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {userPermissions.length === 0 && teamPermissions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No permissions set. Add users or teams to grant access.</p>
                </div>
              )}
            </div>

            {/* Role Descriptions */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="font-semibold text-blue-900 mb-2">Role Permissions</div>
              <div className="space-y-3">
                {ROLE_OPTIONS.map((role) => (
                  <div key={role.value} className="text-sm">
                    <div className="font-medium text-blue-900">
                      {role.icon} {role.label}
                    </div>
                    <ul className="text-blue-800 mt-1 ml-6 list-disc">
                      {role.permissions.map((perm, idx) => (
                        <li key={idx}>{perm}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end p-6 border-t bg-gray-50">
            <button onClick={onClose} className="btn-primary">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
