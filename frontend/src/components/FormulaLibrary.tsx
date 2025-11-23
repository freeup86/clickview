/**
 * Formula Library Component
 *
 * Pre-built formula templates for common calculations
 * Users can browse and apply formulas quickly.
 */

import React, { useState } from 'react';
import { Formula } from './FormulaBuilder';

interface FormulaTemplate {
  id: string;
  name: string;
  category: string;
  expression: string;
  description: string;
  returnType: 'number' | 'string' | 'date' | 'boolean';
  requiredFields: string[];
  example: string;
  icon: string;
}

interface FormulaLibraryProps {
  onSelectFormula: (formula: Formula) => void;
  availableFields: string[];
}

const FORMULA_TEMPLATES: FormulaTemplate[] = [
  // Productivity & Performance
  {
    id: 'completion-rate',
    name: 'Completion Rate',
    category: 'Productivity',
    expression: '({completed_tasks} / {total_tasks}) * 100',
    description: 'Percentage of tasks completed',
    returnType: 'number',
    requiredFields: ['completed_tasks', 'total_tasks'],
    example: '(45 / 60) * 100 = 75%',
    icon: '📊',
  },
  {
    id: 'velocity',
    name: 'Team Velocity',
    category: 'Productivity',
    expression: 'SUM({story_points}) / {sprint_duration}',
    description: 'Average points completed per day',
    returnType: 'number',
    requiredFields: ['story_points', 'sprint_duration'],
    example: 'SUM(50) / 10 = 5 points/day',
    icon: '⚡',
  },
  {
    id: 'efficiency',
    name: 'Efficiency Score',
    category: 'Productivity',
    expression: '({actual_hours} / {estimated_hours}) * 100',
    description: 'How efficiently time was used',
    returnType: 'number',
    requiredFields: ['actual_hours', 'estimated_hours'],
    example: '(35 / 40) * 100 = 87.5%',
    icon: '⏱️',
  },

  // Time Tracking
  {
    id: 'days-overdue',
    name: 'Days Overdue',
    category: 'Time',
    expression: 'IF({due_date} < TODAY(), DATEDIFF(TODAY(), {due_date}, "days"), 0)',
    description: 'Number of days past due date',
    returnType: 'number',
    requiredFields: ['due_date'],
    example: 'DATEDIFF(TODAY(), 2024-01-01) = 15 days',
    icon: '📅',
  },
  {
    id: 'time-remaining',
    name: 'Time Remaining',
    category: 'Time',
    expression: 'DATEDIFF({due_date}, TODAY(), "days")',
    description: 'Days until due date',
    returnType: 'number',
    requiredFields: ['due_date'],
    example: 'DATEDIFF(2024-12-31, TODAY()) = 30 days',
    icon: '⏳',
  },
  {
    id: 'age-in-days',
    name: 'Age in Days',
    category: 'Time',
    expression: 'DATEDIFF(TODAY(), {created_date}, "days")',
    description: 'How many days since creation',
    returnType: 'number',
    requiredFields: ['created_date'],
    example: 'DATEDIFF(TODAY(), 2024-01-01) = 90 days',
    icon: '🕐',
  },

  // Financial
  {
    id: 'budget-variance',
    name: 'Budget Variance',
    category: 'Financial',
    expression: '{budget} - {actual_cost}',
    description: 'Difference between budget and actual',
    returnType: 'number',
    requiredFields: ['budget', 'actual_cost'],
    example: '10000 - 8500 = 1500',
    icon: '💰',
  },
  {
    id: 'roi',
    name: 'Return on Investment',
    category: 'Financial',
    expression: '(({revenue} - {cost}) / {cost}) * 100',
    description: 'ROI percentage',
    returnType: 'number',
    requiredFields: ['revenue', 'cost'],
    example: '((15000 - 10000) / 10000) * 100 = 50%',
    icon: '📈',
  },
  {
    id: 'burn-rate',
    name: 'Burn Rate',
    category: 'Financial',
    expression: '{total_spent} / {days_elapsed}',
    description: 'Average daily spending',
    returnType: 'number',
    requiredFields: ['total_spent', 'days_elapsed'],
    example: '50000 / 30 = 1666.67 per day',
    icon: '🔥',
  },

  // Status & Flags
  {
    id: 'is-overdue',
    name: 'Is Overdue',
    category: 'Status',
    expression: 'IF(AND({due_date} < TODAY(), {status} != "completed"), "Yes", "No")',
    description: 'Check if task is overdue',
    returnType: 'string',
    requiredFields: ['due_date', 'status'],
    example: 'Returns "Yes" or "No"',
    icon: '⚠️',
  },
  {
    id: 'priority-label',
    name: 'Priority Label',
    category: 'Status',
    expression: 'IF({priority} >= 4, "High", IF({priority} >= 2, "Medium", "Low"))',
    description: 'Convert priority number to label',
    returnType: 'string',
    requiredFields: ['priority'],
    example: 'Priority 5 = "High"',
    icon: '🎯',
  },
  {
    id: 'health-score',
    name: 'Health Score',
    category: 'Status',
    expression: 'IF({completion_rate} > 80, "Healthy", IF({completion_rate} > 50, "At Risk", "Critical"))',
    description: 'Project health indicator',
    returnType: 'string',
    requiredFields: ['completion_rate'],
    example: '85% = "Healthy"',
    icon: '❤️',
  },

  // Aggregations
  {
    id: 'average-time',
    name: 'Average Time Per Task',
    category: 'Analytics',
    expression: 'AVG({time_spent})',
    description: 'Mean time spent on tasks',
    returnType: 'number',
    requiredFields: ['time_spent'],
    example: 'AVG(3, 5, 4, 6) = 4.5 hours',
    icon: '📊',
  },
  {
    id: 'total-points',
    name: 'Total Story Points',
    category: 'Analytics',
    expression: 'SUM({story_points})',
    description: 'Sum of all story points',
    returnType: 'number',
    requiredFields: ['story_points'],
    example: 'SUM(3, 5, 8, 13) = 29 points',
    icon: '➕',
  },
  {
    id: 'task-count',
    name: 'Task Count',
    category: 'Analytics',
    expression: 'COUNT({task_id})',
    description: 'Number of tasks',
    returnType: 'number',
    requiredFields: ['task_id'],
    example: 'COUNT(...) = 42 tasks',
    icon: '🔢',
  },
];

const CATEGORIES = [
  { id: 'all', name: 'All', icon: '📋' },
  { id: 'Productivity', name: 'Productivity', icon: '⚡' },
  { id: 'Time', name: 'Time', icon: '⏱️' },
  { id: 'Financial', name: 'Financial', icon: '💰' },
  { id: 'Status', name: 'Status', icon: '🎯' },
  { id: 'Analytics', name: 'Analytics', icon: '📊' },
];

export const FormulaLibrary: React.FC<FormulaLibraryProps> = ({
  onSelectFormula,
  availableFields,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFormulas = FORMULA_TEMPLATES.filter((template) => {
    // Category filter
    if (selectedCategory !== 'all' && template.category !== selectedCategory) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.expression.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const handleSelectTemplate = (template: FormulaTemplate) => {
    onSelectFormula({
      name: template.name,
      expression: template.expression,
      description: template.description,
      returnType: template.returnType,
    });
  };

  const getMissingFields = (template: FormulaTemplate): string[] => {
    return template.requiredFields.filter((field) => !availableFields.includes(field));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Formula Library</h3>
        <p className="text-sm text-gray-600">
          Choose from pre-built formulas or customize them for your needs
        </p>
      </div>

      {/* Search */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search formulas..."
        className="input w-full"
      />

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              selectedCategory === category.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>{category.icon}</span>
            <span className="text-sm font-medium">{category.name}</span>
          </button>
        ))}
      </div>

      {/* Formula Grid */}
      {filteredFormulas.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No formulas found matching your criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto pr-2">
          {filteredFormulas.map((template) => {
            const missingFields = getMissingFields(template);
            const canUse = missingFields.length === 0;

            return (
              <button
                key={template.id}
                onClick={() => canUse && handleSelectTemplate(template)}
                disabled={!canUse}
                className={`text-left p-4 rounded-lg border-2 transition-all ${
                  canUse
                    ? 'border-gray-200 hover:border-blue-500 hover:shadow-md cursor-pointer'
                    : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{template.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 mb-1">{template.name}</div>
                    <div className="text-sm text-gray-600 mb-2">{template.description}</div>
                    <div className="bg-gray-50 rounded px-2 py-1 mb-2">
                      <code className="text-xs font-mono text-purple-700">{template.expression}</code>
                    </div>
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">Example:</span> {template.example}
                    </div>
                    {!canUse && missingFields.length > 0 && (
                      <div className="mt-2 text-xs text-orange-600 flex items-center gap-1">
                        <span>⚠️</span>
                        <span>Missing fields: {missingFields.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Footer Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
        <div className="font-semibold text-blue-900 mb-1">💡 Tip</div>
        <div className="text-blue-800">
          After selecting a formula, you can customize the expression to match your specific field names and requirements.
        </div>
      </div>
    </div>
  );
};
