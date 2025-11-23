/**
 * Calculated Fields Manager
 *
 * Manage calculated fields for a dashboard - view, edit, delete, and test formulas.
 */

import React, { useState } from 'react';
import { XIcon, PencilIcon, TrashIcon } from './icons';
import { CalculatedField } from './modals/AddCalculatedFieldModal';

interface CalculatedFieldsManagerProps {
  isOpen: boolean;
  onClose: () => void;
  calculatedFields: CalculatedField[];
  onEdit: (field: CalculatedField) => void;
  onDelete: (fieldId: string) => void;
  onAdd: () => void;
}

export const CalculatedFieldsManager: React.FC<CalculatedFieldsManagerProps> = ({
  isOpen,
  onClose,
  calculatedFields,
  onEdit,
  onDelete,
  onAdd,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredFields = calculatedFields.filter((field) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      field.name.toLowerCase().includes(query) ||
      field.expression.toLowerCase().includes(query) ||
      field.description?.toLowerCase().includes(query)
    );
  });

  const getReturnTypeIcon = (type: string) => {
    switch (type) {
      case 'number':
        return '🔢';
      case 'string':
        return '📝';
      case 'date':
        return '📅';
      case 'boolean':
        return '✓/✗';
      default:
        return '❓';
    }
  };

  const handleDelete = (field: CalculatedField) => {
    if (confirm(`Delete calculated field "${field.name}"?`)) {
      onDelete(field.id);
    }
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
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Calculated Fields</h2>
              <p className="text-sm text-gray-600 mt-1">
                {calculatedFields.length} field{calculatedFields.length !== 1 ? 's' : ''} defined
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Search and Add */}
          <div className="p-6 border-b bg-gray-50">
            <div className="flex gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search calculated fields..."
                className="input flex-1"
              />
              <button onClick={onAdd} className="btn-primary">
                + Add Calculated Field
              </button>
            </div>
          </div>

          {/* Fields List */}
          <div className="flex-1 overflow-auto p-6">
            {filteredFields.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 py-12">
                <svg
                  className="w-16 h-16 mb-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-lg mb-2">
                  {searchQuery ? 'No calculated fields match your search' : 'No calculated fields yet'}
                </p>
                {!searchQuery && (
                  <button onClick={onAdd} className="mt-4 btn-primary">
                    Create Your First Calculated Field
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFields.map((field) => (
                  <div
                    key={field.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getReturnTypeIcon(field.returnType || 'number')}</span>
                        <h3 className="font-semibold text-gray-900">{field.name}</h3>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                          {field.returnType || 'number'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onEdit(field)}
                          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(field)}
                          className="p-1.5 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>

                    {field.description && (
                      <p className="text-sm text-gray-600 mb-2">{field.description}</p>
                    )}

                    <div className="bg-gray-50 rounded p-2">
                      <code className="text-xs font-mono text-purple-700 break-all">
                        {field.expression}
                      </code>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>Created: {new Date(field.createdAt).toLocaleDateString()}</span>
                      {field.updatedAt !== field.createdAt && (
                        <span>Updated: {new Date(field.updatedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end p-6 border-t bg-gray-50">
            <button onClick={onClose} className="btn-primary">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
