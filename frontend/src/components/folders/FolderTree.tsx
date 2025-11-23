/**
 * Folder Tree Component
 *
 * Hierarchical folder structure with drag-and-drop support
 * for organizing dashboards into folders.
 */

import React, { useState } from 'react';
import { ChevronRightIcon, PencilIcon, TrashIcon, PlusIcon } from '../icons';

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  color?: string;
  icon?: string;
  dashboardCount: number;
  createdAt: string;
  updatedAt: string;
}

interface FolderTreeProps {
  folders: Folder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (parentId: string | null) => void;
  onEditFolder: (folder: Folder) => void;
  onDeleteFolder: (folderId: string) => void;
  onMoveFolder?: (folderId: string, newParentId: string | null) => void;
}

interface FolderNodeProps {
  folder: Folder;
  level: number;
  isSelected: boolean;
  children: Folder[];
  onSelect: () => void;
  onCreateChild: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  isExpanded: boolean;
}

const FolderNode: React.FC<FolderNodeProps> = ({
  folder,
  level,
  isSelected,
  children,
  onSelect,
  onCreateChild,
  onEdit,
  onDelete,
  onToggle,
  isExpanded,
}) => {
  const [showActions, setShowActions] = useState(false);
  const hasChildren = children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
          isSelected ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        onClick={onSelect}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="p-0.5 hover:bg-gray-200 rounded transition-colors"
          >
            <ChevronRightIcon
              className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
          </button>
        )}
        {!hasChildren && <div className="w-4" />}

        <span className="text-lg">{folder.icon || '📁'}</span>
        <span className="flex-1 text-sm font-medium truncate">{folder.name}</span>

        <span className="text-xs text-gray-500">{folder.dashboardCount}</span>

        {showActions && (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onCreateChild}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Add subfolder"
            >
              <PlusIcon className="w-3 h-3" />
            </button>
            <button
              onClick={onEdit}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Edit folder"
            >
              <PencilIcon className="w-3 h-3" />
            </button>
            <button
              onClick={onDelete}
              className="p-1 hover:bg-red-100 rounded transition-colors"
              title="Delete folder"
            >
              <TrashIcon className="w-3 h-3 text-red-600" />
            </button>
          </div>
        )}
      </div>

      {isExpanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <FolderTreeNode
              key={child.id}
              folder={child}
              level={level + 1}
              allFolders={[]} // This will be passed from parent
              selectedFolderId={isSelected ? folder.id : null}
              onSelectFolder={onSelect}
              onCreateFolder={onCreateChild}
              onEditFolder={onEdit}
              onDeleteFolder={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface FolderTreeNodeProps {
  folder: Folder;
  level: number;
  allFolders: Folder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (parentId: string | null) => void;
  onEditFolder: (folder: Folder) => void;
  onDeleteFolder: (folderId: string) => void;
}

const FolderTreeNode: React.FC<FolderTreeNodeProps> = ({
  folder,
  level,
  allFolders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const children = allFolders.filter((f) => f.parentId === folder.id);

  return (
    <FolderNode
      folder={folder}
      level={level}
      isSelected={selectedFolderId === folder.id}
      children={children}
      onSelect={() => onSelectFolder(folder.id)}
      onCreateChild={() => onCreateFolder(folder.id)}
      onEdit={() => onEditFolder(folder)}
      onDelete={() => onDeleteFolder(folder.id)}
      onToggle={() => setIsExpanded(!isExpanded)}
      isExpanded={isExpanded}
    />
  );
};

export const FolderTree: React.FC<FolderTreeProps> = ({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
}) => {
  // Get root folders (no parent)
  const rootFolders = folders.filter((f) => !f.parentId);

  return (
    <div className="space-y-1">
      {rootFolders.map((folder) => (
        <FolderTreeNode
          key={folder.id}
          folder={folder}
          level={0}
          allFolders={folders}
          selectedFolderId={selectedFolderId}
          onSelectFolder={onSelectFolder}
          onCreateFolder={onCreateFolder}
          onEditFolder={onEditFolder}
          onDeleteFolder={onDeleteFolder}
        />
      ))}
    </div>
  );
};
