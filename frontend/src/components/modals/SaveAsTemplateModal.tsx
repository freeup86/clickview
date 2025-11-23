/**
 * Save As Template Modal
 *
 * Allows users to save their dashboard as a reusable template
 * with customizable name, description, category, tags, and visibility.
 */

import React, { useState } from 'react';
import { XIcon } from '../icons';

interface SaveAsTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (templateData: {
    name: string;
    description: string;
    category: string;
    tags: string[];
    isPublic: boolean;
    generateThumbnail: boolean;
  }) => void;
  dashboardName: string;
}

const CATEGORIES = [
  { id: 'productivity', name: 'Productivity', icon: '⚡' },
  { id: 'project-management', name: 'Project Management', icon: '📋' },
  { id: 'sales', name: 'Sales & CRM', icon: '💼' },
  { id: 'marketing', name: 'Marketing', icon: '📈' },
  { id: 'engineering', name: 'Engineering', icon: '⚙️' },
  { id: 'executive', name: 'Executive', icon: '👔' },
  { id: 'custom', name: 'Custom', icon: '🎨' },
];

const SUGGESTED_TAGS = [
  'productivity',
  'analytics',
  'reporting',
  'metrics',
  'kpi',
  'team',
  'project',
  'sales',
  'marketing',
  'finance',
  'operations',
  'executive',
];

export const SaveAsTemplateModal: React.FC<SaveAsTemplateModalProps> = ({
  isOpen,
  onClose,
  onSave,
  dashboardName,
}) => {
  const [name, setName] = useState(`${dashboardName} Template`);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('productivity');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [generateThumbnail, setGenerateThumbnail] = useState(true);

  if (!isOpen) return null;

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim(),
      category,
      tags,
      isPublic,
      generateThumbnail,
    });

    // Reset form
    setName('');
    setDescription('');
    setCategory('productivity');
    setTags([]);
    setTagInput('');
    setIsPublic(false);
    setGenerateThumbnail(true);
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
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Save as Template</h2>
              <p className="text-sm text-gray-600 mt-1">
                Create a reusable template from this dashboard
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6 space-y-5">
            {/* Name */}
            <div>
              <label className="label">
                Template Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Marketing Dashboard Template"
                className="input w-full"
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="label">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this template is for and what insights it provides..."
                className="input w-full resize-none"
                rows={3}
              />
              <div className="text-xs text-gray-500 mt-1">
                A clear description helps others understand when to use this template
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="label">
                Category *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                      category === cat.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="font-medium text-sm">{cat.name}</span>
                    {category === cat.id && (
                      <svg className="w-5 h-5 text-blue-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="label">
                Tags (Optional)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add tags..."
                  className="input flex-1"
                />
                <button
                  onClick={() => handleAddTag(tagInput)}
                  className="btn-secondary px-4"
                >
                  Add
                </button>
              </div>

              {/* Selected Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-blue-900"
                      >
                        <XIcon className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Suggested Tags */}
              <div className="text-xs text-gray-600 mb-2">Suggested tags:</div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_TAGS.filter((tag) => !tags.includes(tag)).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleAddTag(tag)}
                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3 border-t pt-5">
              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Make template public</div>
                    <div className="text-sm text-gray-600">
                      Allow other users in your organization to discover and use this template
                    </div>
                  </div>
                </label>
              </div>

              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generateThumbnail}
                    onChange={(e) => setGenerateThumbnail(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Generate thumbnail</div>
                    <div className="text-sm text-gray-600">
                      Automatically create a preview image of your dashboard layout
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <div className="text-blue-600 text-xl">ℹ️</div>
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">What gets saved?</p>
                  <ul className="space-y-1 text-blue-800">
                    <li>• Widget types, positions, and configurations</li>
                    <li>• Dashboard layout and styling</li>
                    <li>• Filter and aggregation settings</li>
                  </ul>
                  <p className="mt-2 text-blue-800">
                    Data connections and actual data values are NOT included.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || !description.trim()}
              className="btn-primary px-6"
            >
              Save Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
