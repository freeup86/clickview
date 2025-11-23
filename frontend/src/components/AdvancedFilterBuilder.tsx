/**
 * Advanced Filter Builder Component
 *
 * Visual query builder with AND/OR logic for complex filtering.
 * Supports nested filter groups and multiple operators.
 */

import React, { useState } from 'react';
import { PlusIcon, TrashIcon, XIcon } from './icons';

export interface FilterCondition {
  id: string;
  field: string;
  operator: string;
  value: any;
}

export interface FilterGroup {
  id: string;
  logic: 'AND' | 'OR';
  conditions: FilterCondition[];
  groups?: FilterGroup[];
}

interface AdvancedFilterBuilderProps {
  fields: { name: string; label: string; type: string }[];
  initialFilter?: FilterGroup;
  onApply: (filter: FilterGroup) => void;
  onClose: () => void;
}

export const AdvancedFilterBuilder: React.FC<AdvancedFilterBuilderProps> = ({
  fields,
  initialFilter,
  onApply,
  onClose,
}) => {
  const [rootGroup, setRootGroup] = useState<FilterGroup>(
    initialFilter || {
      id: 'root',
      logic: 'AND',
      conditions: [],
      groups: [],
    }
  );

  const operators = [
    { value: 'equals', label: 'Equals', types: ['string', 'number', 'date'] },
    { value: 'not_equals', label: 'Not Equals', types: ['string', 'number', 'date'] },
    { value: 'contains', label: 'Contains', types: ['string'] },
    { value: 'not_contains', label: 'Not Contains', types: ['string'] },
    { value: 'starts_with', label: 'Starts With', types: ['string'] },
    { value: 'ends_with', label: 'Ends With', types: ['string'] },
    { value: 'greater_than', label: 'Greater Than', types: ['number', 'date'] },
    { value: 'less_than', label: 'Less Than', types: ['number', 'date'] },
    { value: 'between', label: 'Between', types: ['number', 'date'] },
    { value: 'in', label: 'In', types: ['string', 'number'] },
    { value: 'not_in', label: 'Not In', types: ['string', 'number'] },
    { value: 'is_null', label: 'Is Null', types: ['string', 'number', 'date'] },
    { value: 'is_not_null', label: 'Is Not Null', types: ['string', 'number', 'date'] },
  ];

  const addCondition = (groupId: string) => {
    const newCondition: FilterCondition = {
      id: `condition-${Date.now()}`,
      field: fields[0]?.name || '',
      operator: 'equals',
      value: '',
    };

    setRootGroup((prev) => updateGroup(prev, groupId, (group) => ({
      ...group,
      conditions: [...group.conditions, newCondition],
    })));
  };

  const removeCondition = (groupId: string, conditionId: string) => {
    setRootGroup((prev) => updateGroup(prev, groupId, (group) => ({
      ...group,
      conditions: group.conditions.filter((c) => c.id !== conditionId),
    })));
  };

  const updateCondition = (
    groupId: string,
    conditionId: string,
    updates: Partial<FilterCondition>
  ) => {
    setRootGroup((prev) => updateGroup(prev, groupId, (group) => ({
      ...group,
      conditions: group.conditions.map((c) =>
        c.id === conditionId ? { ...c, ...updates } : c
      ),
    })));
  };

  const addGroup = (parentGroupId: string) => {
    const newGroup: FilterGroup = {
      id: `group-${Date.now()}`,
      logic: 'AND',
      conditions: [],
      groups: [],
    };

    setRootGroup((prev) => updateGroup(prev, parentGroupId, (group) => ({
      ...group,
      groups: [...(group.groups || []), newGroup],
    })));
  };

  const removeGroup = (parentGroupId: string, groupId: string) => {
    setRootGroup((prev) => updateGroup(prev, parentGroupId, (group) => ({
      ...group,
      groups: (group.groups || []).filter((g) => g.id !== groupId),
    })));
  };

  const toggleGroupLogic = (groupId: string) => {
    setRootGroup((prev) => updateGroup(prev, groupId, (group) => ({
      ...group,
      logic: group.logic === 'AND' ? 'OR' : 'AND',
    })));
  };

  const updateGroup = (
    group: FilterGroup,
    targetId: string,
    updateFn: (group: FilterGroup) => FilterGroup
  ): FilterGroup => {
    if (group.id === targetId) {
      return updateFn(group);
    }

    return {
      ...group,
      groups: (group.groups || []).map((g) => updateGroup(g, targetId, updateFn)),
    };
  };

  const getFieldType = (fieldName: string) => {
    return fields.find((f) => f.name === fieldName)?.type || 'string';
  };

  const getAvailableOperators = (fieldType: string) => {
    return operators.filter((op) => op.types.includes(fieldType));
  };

  const renderCondition = (
    condition: FilterCondition,
    groupId: string,
    index: number,
    groupLogic: 'AND' | 'OR'
  ) => {
    const fieldType = getFieldType(condition.field);
    const availableOperators = getAvailableOperators(fieldType);
    const needsValue = !['is_null', 'is_not_null'].includes(condition.operator);

    return (
      <div key={condition.id} className="flex items-center gap-2">
        {/* Logic connector */}
        {index > 0 && (
          <span
            className={`text-xs font-semibold px-2 py-1 rounded ${
              groupLogic === 'AND'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-purple-100 text-purple-700'
            }`}
          >
            {groupLogic}
          </span>
        )}

        {/* Field */}
        <select
          value={condition.field}
          onChange={(e) =>
            updateCondition(groupId, condition.id, { field: e.target.value })
          }
          className="input flex-1"
        >
          {fields.map((field) => (
            <option key={field.name} value={field.name}>
              {field.label}
            </option>
          ))}
        </select>

        {/* Operator */}
        <select
          value={condition.operator}
          onChange={(e) =>
            updateCondition(groupId, condition.id, { operator: e.target.value })
          }
          className="input flex-1"
        >
          {availableOperators.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>

        {/* Value */}
        {needsValue && (
          <input
            type={fieldType === 'number' ? 'number' : fieldType === 'date' ? 'date' : 'text'}
            value={condition.value}
            onChange={(e) =>
              updateCondition(groupId, condition.id, { value: e.target.value })
            }
            placeholder="Value"
            className="input flex-1"
          />
        )}

        {/* Remove button */}
        <button
          onClick={() => removeCondition(groupId, condition.id)}
          className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
          title="Remove condition"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    );
  };

  const renderGroup = (group: FilterGroup, parentId?: string, depth: number = 0): React.ReactNode => {
    const isRoot = !parentId;

    return (
      <div
        key={group.id}
        className={`border rounded-lg p-4 ${
          depth > 0 ? 'ml-6 mt-2' : ''
        } ${
          group.logic === 'AND'
            ? 'border-blue-300 bg-blue-50'
            : 'border-purple-300 bg-purple-50'
        }`}
      >
        {/* Group header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleGroupLogic(group.id)}
              className={`px-3 py-1 rounded-lg font-semibold text-sm transition-colors ${
                group.logic === 'AND'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {group.logic}
            </button>
            <span className="text-sm text-gray-600">
              {group.conditions.length + (group.groups?.length || 0)} rule(s)
            </span>
          </div>

          {!isRoot && (
            <button
              onClick={() => parentId && removeGroup(parentId, group.id)}
              className="p-1 hover:bg-red-100 rounded text-red-600"
              title="Remove group"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Conditions */}
        <div className="space-y-2 mb-3">
          {group.conditions.map((condition, index) =>
            renderCondition(condition, group.id, index, group.logic)
          )}
        </div>

        {/* Nested groups */}
        {group.groups && group.groups.length > 0 && (
          <div className="space-y-2">
            {group.groups.map((subGroup) =>
              renderGroup(subGroup, group.id, depth + 1)
            )}
          </div>
        )}

        {/* Add buttons */}
        <div className="flex gap-2 mt-3 pt-3 border-t">
          <button
            onClick={() => addCondition(group.id)}
            className="btn-secondary text-sm flex items-center gap-1"
          >
            <PlusIcon className="w-4 h-4" />
            Add Condition
          </button>
          <button
            onClick={() => addGroup(group.id)}
            className="btn-secondary text-sm flex items-center gap-1"
          >
            <PlusIcon className="w-4 h-4" />
            Add Group
          </button>
        </div>
      </div>
    );
  };

  const handleApply = () => {
    onApply(rootGroup);
    onClose();
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
            <h2 className="text-2xl font-bold text-gray-900">Advanced Filter Builder</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            <p className="text-sm text-gray-600 mb-4">
              Build complex filters using AND/OR logic. Click the logic button to toggle between AND and OR.
            </p>
            {renderGroup(rootGroup)}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleApply} className="btn-primary">
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
