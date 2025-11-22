/**
 * Organization Management Admin Portal
 *
 * Comprehensive organization administration:
 * - Organization list with search and filtering
 * - Organization creation and editing
 * - Member management
 * - Settings and configuration
 * - License and quota management
 * - Organization metrics and usage
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

// ===================================================================
// MAIN ORGANIZATION MANAGEMENT COMPONENT
// ===================================================================

export const OrganizationManagement: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, [searchTerm]);

  const loadOrganizations = async () => {
    setLoading(true);
    try {
      const params = searchTerm ? `?search=${searchTerm}` : '';
      const response = await api.get(`/admin/organizations${params}`);
      setOrganizations(response.data.organizations);
    } catch (error) {
      console.error('Failed to load organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: CreateOrgData) => {
    try {
      await api.post('/admin/organizations', data);
      setShowCreateModal(false);
      loadOrganizations();
    } catch (error) {
      console.error('Failed to create organization:', error);
      alert('Failed to create organization');
    }
  };

  const handleUpdate = async (orgId: string, data: Partial<Organization>) => {
    try {
      await api.patch(`/admin/organizations/${orgId}`, data);
      setShowEditModal(false);
      loadOrganizations();
    } catch (error) {
      console.error('Failed to update organization:', error);
      alert('Failed to update organization');
    }
  };

  const handleDelete = async (orgId: string) => {
    if (!confirm('Delete this organization? This action cannot be undone.')) return;

    try {
      await api.delete(`/admin/organizations/${orgId}`);
      loadOrganizations();
    } catch (error) {
      console.error('Failed to delete organization:', error);
      alert('Failed to delete organization');
    }
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Organization Management</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage organizations and memberships</p>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 p-4">
        <div className="flex gap-4 items-center justify-between">
          <input
            type="text"
            placeholder="Search organizations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
          />
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold whitespace-nowrap"
          >
            + Create Organization
          </button>
        </div>
      </div>

      {/* Organization Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading organizations...</div>
        </div>
      ) : organizations.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <div className="text-gray-500">No organizations found</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map((org) => (
            <OrganizationCard
              key={org.id}
              organization={org}
              onEdit={() => {
                setSelectedOrg(org);
                setShowEditModal(true);
              }}
              onMembers={() => {
                setSelectedOrg(org);
                setShowMembersModal(true);
              }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateOrgModal onClose={() => setShowCreateModal(false)} onCreate={handleCreate} />
      )}

      {showEditModal && selectedOrg && (
        <EditOrgModal
          organization={selectedOrg}
          onClose={() => {
            setShowEditModal(false);
            setSelectedOrg(null);
          }}
          onSave={(data) => handleUpdate(selectedOrg.id, data)}
        />
      )}

      {showMembersModal && selectedOrg && (
        <MembersModal
          organization={selectedOrg}
          onClose={() => {
            setShowMembersModal(false);
            setSelectedOrg(null);
          }}
        />
      )}
    </div>
  );
};

// ===================================================================
// ORGANIZATION CARD
// ===================================================================

interface OrganizationCardProps {
  organization: Organization;
  onEdit: () => void;
  onMembers: () => void;
  onDelete: (id: string) => void;
}

const OrganizationCard: React.FC<OrganizationCardProps> = ({
  organization,
  onEdit,
  onMembers,
  onDelete,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
            {organization.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{organization.name}</h3>
            {organization.domain && (
              <div className="text-sm text-gray-500 dark:text-gray-400">@{organization.domain}</div>
            )}
          </div>
        </div>
      </div>

      {organization.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          {organization.description}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Members</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {organization.memberCount || 0}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Dashboards</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {organization.dashboardCount || 0}
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onEdit}
          className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
        >
          Edit
        </button>
        <button
          onClick={onMembers}
          className="flex-1 px-3 py-2 text-sm bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded"
        >
          Members
        </button>
        <button
          onClick={() => onDelete(organization.id)}
          className="px-3 py-2 text-sm bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

// ===================================================================
// CREATE ORGANIZATION MODAL
// ===================================================================

interface CreateOrgModalProps {
  onClose: () => void;
  onCreate: (data: CreateOrgData) => void;
}

const CreateOrgModal: React.FC<CreateOrgModalProps> = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState<CreateOrgData>({
    name: '',
    domain: '',
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
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Create Organization</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Organization Name *
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
              Domain
            </label>
            <input
              type="text"
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
              placeholder="example.com"
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
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ===================================================================
// EDIT ORGANIZATION MODAL
// ===================================================================

interface EditOrgModalProps {
  organization: Organization;
  onClose: () => void;
  onSave: (data: Partial<Organization>) => void;
}

const EditOrgModal: React.FC<EditOrgModalProps> = ({ organization, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: organization.name,
    domain: organization.domain || '',
    description: organization.description || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Edit Organization</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Organization Name
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
              Domain
            </label>
            <input
              type="text"
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
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
// MEMBERS MODAL
// ===================================================================

interface MembersModalProps {
  organization: Organization;
  onClose: () => void;
}

const MembersModal: React.FC<MembersModalProps> = ({ organization, onClose }) => {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/organizations/${organization.id}/members`);
      setMembers(response.data.members);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm('Remove this member from the organization?')) return;

    try {
      await api.delete(`/admin/organizations/${organization.id}/members/${userId}`);
      loadMembers();
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const handleUpdateRole = async (userId: string, role: string) => {
    try {
      await api.patch(`/admin/organizations/${organization.id}/members/${userId}`, { role });
      loadMembers();
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Members</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{organization.name}</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
            >
              + Add Member
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading members...</div>
          ) : members.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No members</div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                      {member.user.name?.charAt(0) || member.user.email.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {member.user.name || member.user.email}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{member.user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member.userId, e.target.value)}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                      <option value="owner">Owner</option>
                    </select>
                    <button
                      onClick={() => handleRemove(member.userId)}
                      className="px-3 py-1 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ===================================================================
// TYPES
// ===================================================================

interface Organization {
  id: string;
  name: string;
  domain?: string;
  description?: string;
  memberCount?: number;
  dashboardCount?: number;
  createdAt: Date;
}

interface CreateOrgData {
  name: string;
  domain?: string;
  description?: string;
}

interface OrgMember {
  userId: string;
  role: 'member' | 'admin' | 'owner';
  user: {
    name?: string;
    email: string;
  };
}
