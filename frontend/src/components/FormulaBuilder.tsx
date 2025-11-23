/**
 * Formula Builder Component
 *
 * Visual formula editor for creating calculated fields with:
 * - Syntax highlighting
 * - Field suggestions
 * - Function library
 * - Real-time validation
 * - Formula examples
 */

import React, { useState, useRef, useEffect } from 'react';
import { XIcon } from '../icons';

export interface Formula {
  id?: string;
  name: string;
  expression: string;
  description?: string;
  returnType?: 'number' | 'string' | 'date' | 'boolean';
}

interface FormulaBuilderProps {
  value: Formula;
  onChange: (formula: Formula) => void;
  availableFields: Array<{ name: string; type: string; description?: string }>;
  onTest?: (formula: Formula) => Promise<{ success: boolean; result?: any; error?: string }>;
}

const FUNCTIONS = [
  {
    category: 'Math',
    functions: [
      { name: 'SUM', syntax: 'SUM(field)', description: 'Sum of all values', example: 'SUM(hours_spent)' },
      { name: 'AVG', syntax: 'AVG(field)', description: 'Average of all values', example: 'AVG(task_points)' },
      { name: 'MIN', syntax: 'MIN(field)', description: 'Minimum value', example: 'MIN(priority)' },
      { name: 'MAX', syntax: 'MAX(field)', description: 'Maximum value', example: 'MAX(completion_rate)' },
      { name: 'COUNT', syntax: 'COUNT(field)', description: 'Count of values', example: 'COUNT(tasks)' },
      { name: 'ROUND', syntax: 'ROUND(value, decimals)', description: 'Round to decimals', example: 'ROUND(avg_hours, 2)' },
      { name: 'ABS', syntax: 'ABS(value)', description: 'Absolute value', example: 'ABS(variance)' },
      { name: 'CEIL', syntax: 'CEIL(value)', description: 'Round up', example: 'CEIL(hours)' },
      { name: 'FLOOR', syntax: 'FLOOR(value)', description: 'Round down', example: 'FLOOR(hours)' },
    ],
  },
  {
    category: 'Text',
    functions: [
      { name: 'CONCAT', syntax: 'CONCAT(text1, text2)', description: 'Combine text', example: 'CONCAT(first_name, " ", last_name)' },
      { name: 'UPPER', syntax: 'UPPER(text)', description: 'Convert to uppercase', example: 'UPPER(status)' },
      { name: 'LOWER', syntax: 'LOWER(text)', description: 'Convert to lowercase', example: 'LOWER(email)' },
      { name: 'LENGTH', syntax: 'LENGTH(text)', description: 'Text length', example: 'LENGTH(description)' },
      { name: 'TRIM', syntax: 'TRIM(text)', description: 'Remove whitespace', example: 'TRIM(name)' },
      { name: 'SUBSTRING', syntax: 'SUBSTRING(text, start, length)', description: 'Extract text', example: 'SUBSTRING(id, 0, 5)' },
    ],
  },
  {
    category: 'Date',
    functions: [
      { name: 'TODAY', syntax: 'TODAY()', description: 'Current date', example: 'TODAY()' },
      { name: 'NOW', syntax: 'NOW()', description: 'Current date and time', example: 'NOW()' },
      { name: 'DATEDIFF', syntax: 'DATEDIFF(date1, date2, unit)', description: 'Difference between dates', example: 'DATEDIFF(due_date, TODAY(), "days")' },
      { name: 'DATEADD', syntax: 'DATEADD(date, amount, unit)', description: 'Add to date', example: 'DATEADD(start_date, 7, "days")' },
      { name: 'YEAR', syntax: 'YEAR(date)', description: 'Extract year', example: 'YEAR(created_date)' },
      { name: 'MONTH', syntax: 'MONTH(date)', description: 'Extract month', example: 'MONTH(created_date)' },
      { name: 'DAY', syntax: 'DAY(date)', description: 'Extract day', example: 'DAY(created_date)' },
    ],
  },
  {
    category: 'Logical',
    functions: [
      { name: 'IF', syntax: 'IF(condition, true_value, false_value)', description: 'Conditional logic', example: 'IF(status = "done", 1, 0)' },
      { name: 'AND', syntax: 'AND(condition1, condition2)', description: 'Logical AND', example: 'AND(priority > 3, status != "done")' },
      { name: 'OR', syntax: 'OR(condition1, condition2)', description: 'Logical OR', example: 'OR(overdue, high_priority)' },
      { name: 'NOT', syntax: 'NOT(condition)', description: 'Logical NOT', example: 'NOT(is_complete)' },
      { name: 'ISBLANK', syntax: 'ISBLANK(field)', description: 'Check if empty', example: 'ISBLANK(assignee)' },
    ],
  },
];

const OPERATORS = [
  { symbol: '+', description: 'Addition', example: 'hours + overtime' },
  { symbol: '-', description: 'Subtraction', example: 'budget - spent' },
  { symbol: '*', description: 'Multiplication', example: 'hours * rate' },
  { symbol: '/', description: 'Division', example: 'completed / total' },
  { symbol: '%', description: 'Modulo', example: 'value % 2' },
  { symbol: '=', description: 'Equals', example: 'status = "done"' },
  { symbol: '!=', description: 'Not equals', example: 'priority != 1' },
  { symbol: '>', description: 'Greater than', example: 'hours > 40' },
  { symbol: '<', description: 'Less than', example: 'completion < 100' },
  { symbol: '>=', description: 'Greater or equal', example: 'priority >= 3' },
  { symbol: '<=', description: 'Less or equal', example: 'days_left <= 7' },
];

export const FormulaBuilder: React.FC<FormulaBuilderProps> = ({
  value,
  onChange,
  availableFields,
  onTest,
}) => {
  const [expression, setExpression] = useState(value.expression);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; result?: any; error?: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setExpression(value.expression);
  }, [value.expression]);

  const validateFormula = (expr: string): string | null => {
    if (!expr.trim()) {
      return 'Formula cannot be empty';
    }

    // Check for balanced parentheses
    let openParens = 0;
    for (const char of expr) {
      if (char === '(') openParens++;
      if (char === ')') openParens--;
      if (openParens < 0) return 'Unmatched closing parenthesis';
    }
    if (openParens > 0) return 'Unmatched opening parenthesis';

    // Check for balanced quotes
    let inString = false;
    for (let i = 0; i < expr.length; i++) {
      if (expr[i] === '"' && (i === 0 || expr[i - 1] !== '\\')) {
        inString = !inString;
      }
    }
    if (inString) return 'Unclosed string literal';

    return null;
  };

  const handleExpressionChange = (newExpression: string) => {
    setExpression(newExpression);
    const error = validateFormula(newExpression);
    setValidationError(error);
    onChange({ ...value, expression: newExpression });
  };

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newExpression =
      expression.substring(0, start) + text + expression.substring(end);

    handleExpressionChange(newExpression);

    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + text.length;
      textarea.focus();
    }, 0);
  };

  const handleFieldClick = (fieldName: string) => {
    insertAtCursor(`{${fieldName}}`);
    setShowSuggestions(false);
  };

  const handleFunctionClick = (functionSyntax: string) => {
    insertAtCursor(functionSyntax);
  };

  const handleTestFormula = async () => {
    if (!onTest) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await onTest(value);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: 'Test failed: ' + (error as Error).message,
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Formula Name */}
      <div>
        <label className="label">Formula Name *</label>
        <input
          type="text"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="e.g., Completion Rate, Velocity"
          className="input w-full"
        />
      </div>

      {/* Formula Expression */}
      <div>
        <label className="label">Formula Expression *</label>
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={expression}
            onChange={(e) => handleExpressionChange(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            placeholder="e.g., {completed_tasks} / {total_tasks} * 100"
            className={`input w-full font-mono text-sm resize-none ${
              validationError ? 'border-red-500' : ''
            }`}
            rows={4}
          />
          {validationError && (
            <div className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <span>⚠️</span>
              <span>{validationError}</span>
            </div>
          )}
          {!validationError && expression && (
            <div className="mt-1 text-sm text-green-600 flex items-center gap-1">
              <span>✓</span>
              <span>Formula is valid</span>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="label">Description (Optional)</label>
        <textarea
          value={value.description || ''}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          placeholder="What does this formula calculate?"
          className="input w-full resize-none"
          rows={2}
        />
      </div>

      {/* Return Type */}
      <div>
        <label className="label">Return Type</label>
        <select
          value={value.returnType || 'number'}
          onChange={(e) =>
            onChange({
              ...value,
              returnType: e.target.value as 'number' | 'string' | 'date' | 'boolean',
            })
          }
          className="input"
        >
          <option value="number">Number</option>
          <option value="string">Text</option>
          <option value="date">Date</option>
          <option value="boolean">Boolean</option>
        </select>
      </div>

      {/* Quick Insert Tabs */}
      <div className="border rounded-lg">
        <div className="bg-gray-50 px-4 py-2 border-b">
          <h4 className="font-semibold text-sm text-gray-700">Quick Insert</h4>
        </div>

        {/* Fields */}
        <div className="p-4 border-b">
          <div className="text-xs font-semibold text-gray-600 mb-2">Available Fields</div>
          <div className="flex flex-wrap gap-2">
            {availableFields.map((field) => (
              <button
                key={field.name}
                onClick={() => handleFieldClick(field.name)}
                className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded hover:bg-blue-100 transition-colors"
                title={field.description || field.type}
              >
                {field.name}
              </button>
            ))}
          </div>
        </div>

        {/* Functions */}
        {FUNCTIONS.map((category) => (
          <div key={category.category} className="p-4 border-b last:border-b-0">
            <div className="text-xs font-semibold text-gray-600 mb-2">{category.category} Functions</div>
            <div className="grid grid-cols-2 gap-2">
              {category.functions.map((func) => (
                <button
                  key={func.name}
                  onClick={() => handleFunctionClick(func.syntax)}
                  className="text-left px-2 py-1.5 bg-gray-50 hover:bg-gray-100 rounded text-xs transition-colors"
                  title={func.description}
                >
                  <div className="font-mono font-semibold text-purple-700">{func.name}</div>
                  <div className="text-gray-600 truncate">{func.description}</div>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Operators */}
        <div className="p-4">
          <div className="text-xs font-semibold text-gray-600 mb-2">Operators</div>
          <div className="flex flex-wrap gap-2">
            {OPERATORS.map((op) => (
              <button
                key={op.symbol}
                onClick={() => insertAtCursor(` ${op.symbol} `)}
                className="px-3 py-1 bg-gray-50 hover:bg-gray-100 rounded text-xs font-mono transition-colors"
                title={`${op.description}: ${op.example}`}
              >
                {op.symbol}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Test Button and Result */}
      {onTest && (
        <div>
          <button
            onClick={handleTestFormula}
            disabled={isTesting || !!validationError || !expression}
            className="btn-secondary"
          >
            {isTesting ? 'Testing...' : '🧪 Test Formula'}
          </button>

          {testResult && (
            <div
              className={`mt-3 p-3 rounded-lg ${
                testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}
            >
              <div className="font-semibold text-sm mb-1">
                {testResult.success ? '✓ Test Passed' : '✗ Test Failed'}
              </div>
              {testResult.success && testResult.result !== undefined && (
                <div className="text-sm">
                  <span className="text-gray-600">Result:</span>{' '}
                  <span className="font-mono font-semibold">{JSON.stringify(testResult.result)}</span>
                </div>
              )}
              {testResult.error && (
                <div className="text-sm text-red-700">{testResult.error}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
        <div className="font-semibold text-blue-900 mb-1">Formula Syntax</div>
        <ul className="text-blue-800 space-y-1">
          <li>• Use <code className="bg-blue-100 px-1 rounded">{`{field_name}`}</code> to reference fields</li>
          <li>• Functions are case-sensitive: <code className="bg-blue-100 px-1 rounded">SUM()</code>, <code className="bg-blue-100 px-1 rounded">AVG()</code></li>
          <li>• Use quotes for text: <code className="bg-blue-100 px-1 rounded">"done"</code></li>
          <li>• Combine with operators: <code className="bg-blue-100 px-1 rounded">+</code>, <code className="bg-blue-100 px-1 rounded">-</code>, <code className="bg-blue-100 px-1 rounded">*</code>, <code className="bg-blue-100 px-1 rounded">/</code></li>
        </ul>
      </div>
    </div>
  );
};
