/**
 * Dashboard Folders Component
 *
 * Main component for dashboard organization featuring:
 * - Folder hierarchy
 * - Favorites
 * - Recent dashboards
 * - Quick filters
 */

import React, { useState } from 'react';
import { PlusIcon } from '../icons';
import { FolderTree, Folder } from './FolderTree';
import { CreateFolderModal } from '../modals/CreateFolderModal';

interface Dashboard {
  id: string;
  name: string;
  folderId: string | null;
  isFavorite: boolean;
  lastViewedAt: string | null;
}

interface DashboardFoldersProps {
  folders: Folder[];
  dashboards: Dashboard[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (folderData: { name: string; parentId: string | null; icon: string; color: string }) => void;
  onEditFolder: (folderId: string, data: { name?: string; icon?: string; color?: string; parentId?: string | null }) => void;
  onDeleteFolder: (folderId: string) => void;
  onToggleFavorite: (dashboardId: string) => void;
  activeView: 'all' | 'favorites' | 'recent' | 'folder';
  onChangeView: (view: 'all' | 'favorites' | 'recent' | 'folder') => void;
}

export const DashboardFolders: React.FC<DashboardFoldersProps> = ({
  folders,
  dashboards,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
  onToggleFavorite,
  activeView,
  onChangeView,
}) => {
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | undefined>();
  const [parentFolderIdForNew, setParentFolderIdForNew] = useState<string | null>(null);

  const favoriteDashboards = dashboards.filter((d) => d.isFavorite);
  const recentDashboards = dashboards
    .filter((d) => d.lastViewedAt)
    .sort((a, b) => {
      const dateA = new Date(a.lastViewedAt!).getTime();
      const dateB = new Date(b.lastViewedAt!).getTime();
      return dateB - dateA;
    })
    .slice(0, 10);

  const handleCreateFolderClick = (parentId: string | null = null) => {
    setParentFolderIdForNew(parentId);
    setEditingFolder(undefined);
    setShowCreateFolderModal(true);
  };

  const handleEditFolderClick = (folder: Folder) => {
    setEditingFolder(folder);
    setShowCreateFolderModal(true);
  };

  const handleSaveFolder = (folderData: { name: string; parentId: string | null; icon: string; color: string }) => {
    if (editingFolder) {
      onEditFolder(editingFolder.id, folderData);
    } else {
      onCreateFolder(folderData);
    }
    setShowCreateFolderModal(false);
    setEditingFolder(undefined);
    setParentFolderIdForNew(null);
  };

  const handleDeleteFolderClick = (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;

    const message =
      folder.dashboardCount > 0
        ? `Delete "${folder.name}"? This will move ${folder.dashboardCount} dashboard(s) to the root level.`
        : `Delete "${folder.name}"?`;

    if (confirm(message)) {
      onDeleteFolder(folderId);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Dashboards</h2>
          <button
            onClick={() => handleCreateFolderClick()}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title="Create folder"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Views */}
        <div className="space-y-1">
          <button
            onClick={() => {
              onChangeView('all');
              onSelectFolder(null);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeView === 'all' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            <span>📊</span>
            <span className="flex-1 text-left">All Dashboards</span>
            <span className="text-xs">{dashboards.length}</span>
          </button>

          <button
            onClick={() => {
              onChangeView('favorites');
              onSelectFolder(null);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeView === 'favorites' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            <span>⭐</span>
            <span className="flex-1 text-left">Favorites</span>
            <span className="text-xs">{favoriteDashboards.length}</span>
          </button>

          <button
            onClick={() => {
              onChangeView('recent');
              onSelectFolder(null);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeView === 'recent' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            <span>🕐</span>
            <span className="flex-1 text-left">Recent</span>
            <span className="text-xs">{recentDashboards.length}</span>
          </button>
        </div>
      </div>

      {/* Folders */}
      <div className="flex-1 overflow-auto p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-semibold text-gray-600 uppercase">Folders</div>
        </div>

        {folders.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500 mb-3">No folders yet</p>
            <button
              onClick={() => handleCreateFolderClick()}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Create your first folder
            </button>
          </div>
        ) : (
          <FolderTree
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={(folderId) => {
              onSelectFolder(folderId);
              onChangeView('folder');
            }}
            onCreateFolder={handleCreateFolderClick}
            onEditFolder={handleEditFolderClick}
            onDeleteFolder={handleDeleteFolderClick}
          />
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t bg-gray-50">
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Total Dashboards:</span>
            <span className="font-semibold">{dashboards.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Folders:</span>
            <span className="font-semibold">{folders.length}</span>
          </div>
        </div>
      </div>

      {/* Create/Edit Folder Modal */}
      <CreateFolderModal
        isOpen={showCreateFolderModal}
        onClose={() => {
          setShowCreateFolderModal(false);
          setEditingFolder(undefined);
          setParentFolderIdForNew(null);
        }}
        onSave={handleSaveFolder}
        parentFolderId={parentFolderIdForNew}
        editFolder={editingFolder}
        allFolders={folders}
      />
    </div>
  );
};
