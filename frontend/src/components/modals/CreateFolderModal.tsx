/**
 * Create Folder Modal
 *
 * Modal for creating and editing dashboard folders
 * with name, icon, color, and parent selection.
 */

import React, { useState, useEffect } from 'react';
import { XIcon } from '../icons';
import { Folder } from '../folders/FolderTree';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (folderData: {
    name: string;
    parentId: string | null;
    icon: string;
    color: string;
  }) => void;
  parentFolderId?: string | null;
  editFolder?: Folder;
  allFolders?: Folder[];
}

const FOLDER_ICONS = [
  '📁', '📂', '📊', '📈', '📉', '📋', '📌', '🎯',
  '💼', '🏢', '🏭', '🏪', '🎨', '🔧', '⚙️', '🔬',
  '💡', '⚡', '🚀', '🎓', '📚', '🗂️', '📦', '🎁',
];

const FOLDER_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Gray', value: '#6B7280' },
];

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  parentFolderId = null,
  editFolder,
  allFolders = [],
}) => {
  const [name, setName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(parentFolderId);
  const [selectedIcon, setSelectedIcon] = useState('📁');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');

  useEffect(() => {
    if (editFolder) {
      setName(editFolder.name);
      setSelectedParentId(editFolder.parentId);
      setSelectedIcon(editFolder.icon || '📁');
      setSelectedColor(editFolder.color || '#3B82F6');
    } else {
      setName('');
      setSelectedParentId(parentFolderId);
      setSelectedIcon('📁');
      setSelectedColor('#3B82F6');
    }
  }, [editFolder, parentFolderId, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      parentId: selectedParentId,
      icon: selectedIcon,
      color: selectedColor,
    });

    handleClose();
  };

  const handleClose = () => {
    setName('');
    setSelectedParentId(null);
    setSelectedIcon('📁');
    setSelectedColor('#3B82F6');
    onClose();
  };

  // Filter out the folder being edited and its descendants to prevent circular references
  const availableFolders = allFolders.filter((folder) => {
    if (editFolder && folder.id === editFolder.id) return false;
    // Could add logic here to filter out descendants
    return true;
  });

  const canSave = name.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">
              {editFolder ? 'Edit Folder' : 'Create New Folder'}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Folder Name */}
            <div>
              <label className="label">Folder Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Marketing Dashboards"
                className="input w-full"
                autoFocus
              />
            </div>

            {/* Parent Folder */}
            <div>
              <label className="label">Parent Folder (Optional)</label>
              <select
                value={selectedParentId || ''}
                onChange={(e) => setSelectedParentId(e.target.value || null)}
                className="input w-full"
              >
                <option value="">None (Root Level)</option>
                {availableFolders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.icon} {folder.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Icon Selection */}
            <div>
              <label className="label">Folder Icon</label>
              <div className="grid grid-cols-8 gap-2 p-3 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                {FOLDER_ICONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setSelectedIcon(icon)}
                    className={`text-2xl p-2 rounded hover:bg-gray-100 transition-colors ${
                      selectedIcon === icon ? 'bg-blue-100 ring-2 ring-blue-500' : ''
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selection */}
            <div>
              <label className="label">Folder Color</label>
              <div className="flex gap-2 flex-wrap">
                {FOLDER_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setSelectedColor(color.value)}
                    className={`w-10 h-10 rounded-lg border-2 transition-all ${
                      selectedColor === color.value
                        ? 'border-gray-900 scale-110'
                        : 'border-gray-200 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-xs font-semibold text-gray-600 mb-2">Preview</div>
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ backgroundColor: `${selectedColor}15` }}
              >
                <span className="text-xl">{selectedIcon}</span>
                <span className="font-medium" style={{ color: selectedColor }}>
                  {name || 'Folder Name'}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
            <button onClick={handleClose} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleSave} disabled={!canSave} className="btn-primary px-6">
              {editFolder ? 'Save Changes' : 'Create Folder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
