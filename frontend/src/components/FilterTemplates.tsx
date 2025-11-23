/**
 * Filter Templates Component
 *
 * Manage and apply saved filter templates for quick filtering.
 * Supports saving, loading, updating, and deleting templates.
 */

import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, PencilIcon, XIcon } from './icons';

export interface FilterTemplate {
  id: string;
  name: string;
  description?: string;
  filters: any;
  createdAt: string;
  updatedAt: string;
  isGlobal?: boolean; // Available to all users
}

interface FilterTemplatesProps {
  currentFilters?: any;
  onApplyTemplate: (filters: any) => void;
  onSaveAsNew: (name: string, description?: string) => void;
}

export const FilterTemplates: React.FC<FilterTemplatesProps> = ({
  currentFilters,
  onApplyTemplate,
  onSaveAsNew,
}) => {
  const [templates, setTemplates] = useState<FilterTemplate[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<FilterTemplate | null>(null);

  useEffect(() => {
    // Load templates from localStorage
    const savedTemplates = localStorage.getItem('filterTemplates');
    if (savedTemplates) {
      try {
        setTemplates(JSON.parse(savedTemplates));
      } catch (error) {
        console.error('Failed to load filter templates:', error);
      }
    }
  }, []);

  const saveTemplates = (updatedTemplates: FilterTemplate[]) => {
    setTemplates(updatedTemplates);
    localStorage.setItem('filterTemplates', JSON.stringify(updatedTemplates));
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    const newTemplate: FilterTemplate = {
      id: editingTemplate?.id || `template-${Date.now()}`,
      name: templateName,
      description: templateDescription,
      filters: currentFilters,
      createdAt: editingTemplate?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let updatedTemplates: FilterTemplate[];
    if (editingTemplate) {
      updatedTemplates = templates.map((t) => (t.id === editingTemplate.id ? newTemplate : t));
    } else {
      updatedTemplates = [...templates, newTemplate];
    }

    saveTemplates(updatedTemplates);
    setShowSaveDialog(false);
    setTemplateName('');
    setTemplateDescription('');
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      const updatedTemplates = templates.filter((t) => t.id !== templateId);
      saveTemplates(updatedTemplates);
    }
  };

  const handleEditTemplate = (template: FilterTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateDescription(template.description || '');
    setShowSaveDialog(true);
  };

  const handleApplyTemplate = (template: FilterTemplate) => {
    onApplyTemplate(template.filters);
  };

  // Preset templates (always available)
  const presetTemplates: FilterTemplate[] = [
    {
      id: 'preset-today',
      name: 'Today',
      description: 'Tasks for today',
      filters: {
        dateRange: 'today',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isGlobal: true,
    },
    {
      id: 'preset-this-week',
      name: 'This Week',
      description: 'Tasks for this week',
      filters: {
        dateRange: 'this_week',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isGlobal: true,
    },
    {
      id: 'preset-last-7-days',
      name: 'Last 7 Days',
      description: 'Tasks from the last 7 days',
      filters: {
        dateRange: 'last_7_days',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isGlobal: true,
    },
    {
      id: 'preset-last-30-days',
      name: 'Last 30 Days',
      description: 'Tasks from the last 30 days',
      filters: {
        dateRange: 'last_30_days',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isGlobal: true,
    },
    {
      id: 'preset-overdue',
      name: 'Overdue',
      description: 'Overdue tasks',
      filters: {
        status: ['open', 'in_progress'],
        dateRange: 'overdue',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isGlobal: true,
    },
    {
      id: 'preset-high-priority',
      name: 'High Priority',
      description: 'Urgent and high priority tasks',
      filters: {
        priority: ['urgent', 'high'],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isGlobal: true,
    },
  ];

  const allTemplates = [...presetTemplates, ...templates];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900">Filter Templates</h4>
        <button
          onClick={() => {
            setEditingTemplate(null);
            setTemplateName('');
            setTemplateDescription('');
            setShowSaveDialog(true);
          }}
          className="btn-secondary text-sm flex items-center gap-1"
        >
          <PlusIcon className="w-4 h-4" />
          Save Current Filters
        </button>
      </div>

      {/* Quick Presets */}
      <div>
        <h5 className="text-sm font-medium text-gray-700 mb-2">Quick Filters</h5>
        <div className="flex flex-wrap gap-2">
          {presetTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => handleApplyTemplate(template)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title={template.description}
            >
              {template.name}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Templates */}
      {templates.length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-gray-700 mb-2">My Templates</h5>
          <div className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <button
                    onClick={() => handleApplyTemplate(template)}
                    className="text-left w-full"
                  >
                    <div className="font-medium text-gray-900">{template.name}</div>
                    {template.description && (
                      <div className="text-xs text-gray-600 mt-0.5">{template.description}</div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      Updated {new Date(template.updatedAt).toLocaleDateString()}
                    </div>
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEditTemplate(template)}
                    className="p-2 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
                    title="Edit template"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
                    title="Delete template"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Template Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setShowSaveDialog(false)}
          />

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingTemplate ? 'Edit Template' : 'Save Filter Template'}
                </h3>
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label">Template Name *</label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g., My Active Tasks"
                    className="input"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="label">Description (optional)</label>
                  <textarea
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="e.g., All active tasks assigned to me with high priority"
                    className="input"
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-4">
                  <button
                    onClick={() => setShowSaveDialog(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button onClick={handleSaveTemplate} className="btn-primary">
                    {editingTemplate ? 'Update' : 'Save'} Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
