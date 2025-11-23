/**
 * Add Calculated Field Modal
 *
 * Modal for creating new calculated fields using the formula builder.
 * Calculated fields can be used in widgets just like regular fields.
 */

import React, { useState } from 'react';
import { XIcon } from '../icons';
import { FormulaBuilder, Formula } from '../FormulaBuilder';
import { FormulaLibrary } from '../FormulaLibrary';
import { calculateFormula } from '../../utils/formulaUtils';

interface AddCalculatedFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (field: CalculatedField) => void;
  availableFields: Array<{ name: string; type: string; description?: string }>;
  sampleData?: Record<string, any>;
}

export interface CalculatedField extends Formula {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export const AddCalculatedFieldModal: React.FC<AddCalculatedFieldModalProps> = ({
  isOpen,
  onClose,
  onSave,
  availableFields,
  sampleData,
}) => {
  const [activeTab, setActiveTab] = useState<'builder' | 'library'>('library');
  const [formula, setFormula] = useState<Formula>({
    name: '',
    expression: '',
    description: '',
    returnType: 'number',
  });

  if (!isOpen) return null;

  const handleSave = () => {
    if (!formula.name.trim() || !formula.expression.trim()) {
      return;
    }

    const calculatedField: CalculatedField = {
      ...formula,
      id: `calc_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(calculatedField);
    handleClose();
  };

  const handleClose = () => {
    setFormula({
      name: '',
      expression: '',
      description: '',
      returnType: 'number',
    });
    setActiveTab('library');
    onClose();
  };

  const handleSelectFromLibrary = (libraryFormula: Formula) => {
    setFormula(libraryFormula);
    setActiveTab('builder');
  };

  const handleTestFormula = async (testFormula: Formula): Promise<{ success: boolean; result?: any; error?: string }> => {
    if (!sampleData) {
      return {
        success: false,
        error: 'No sample data available for testing',
      };
    }

    return calculateFormula(testFormula.expression, sampleData);
  };

  const canSave = formula.name.trim() && formula.expression.trim();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Add Calculated Field</h2>
              <p className="text-sm text-gray-600 mt-1">
                Create custom metrics and calculations for your dashboards
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('library')}
              className={`flex-1 px-6 py-3 font-medium transition-colors ${
                activeTab === 'library'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📚 Formula Library
            </button>
            <button
              onClick={() => setActiveTab('builder')}
              className={`flex-1 px-6 py-3 font-medium transition-colors ${
                activeTab === 'builder'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ⚙️ Custom Formula
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {activeTab === 'library' ? (
              <FormulaLibrary
                onSelectFormula={handleSelectFromLibrary}
                availableFields={availableFields.map((f) => f.name)}
              />
            ) : (
              <FormulaBuilder
                value={formula}
                onChange={setFormula}
                availableFields={availableFields}
                onTest={sampleData ? handleTestFormula : undefined}
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t bg-gray-50">
            <div className="text-sm text-gray-600">
              {activeTab === 'library' ? (
                <span>Select a formula template to customize</span>
              ) : (
                <span>
                  {formula.name ? (
                    <>Field name: <span className="font-mono font-semibold">{formula.name}</span></>
                  ) : (
                    'Enter a name and formula expression'
                  )}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleClose} className="btn-secondary">
                Cancel
              </button>
              {activeTab === 'builder' && (
                <button
                  onClick={handleSave}
                  disabled={!canSave}
                  className="btn-primary px-6"
                >
                  Save Calculated Field
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
