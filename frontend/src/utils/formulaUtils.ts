/**
 * Formula Utilities
 *
 * Utilities for formula validation, parsing, and evaluation
 */

export interface FormulaVariable {
  name: string;
  value: any;
  type: string;
}

/**
 * Parse field references from formula expression
 * Extracts all {field_name} references
 */
export function parseFieldReferences(expression: string): string[] {
  const regex = /\{([^}]+)\}/g;
  const matches: string[] = [];
  let match;

  while ((match = regex.exec(expression)) !== null) {
    matches.push(match[1]);
  }

  return [...new Set(matches)]; // Remove duplicates
}

/**
 * Validate formula syntax
 */
export function validateFormula(expression: string): { valid: boolean; error?: string } {
  if (!expression || !expression.trim()) {
    return { valid: false, error: 'Formula cannot be empty' };
  }

  // Check for balanced parentheses
  let openParens = 0;
  for (const char of expression) {
    if (char === '(') openParens++;
    if (char === ')') openParens--;
    if (openParens < 0) {
      return { valid: false, error: 'Unmatched closing parenthesis' };
    }
  }
  if (openParens > 0) {
    return { valid: false, error: 'Unmatched opening parenthesis' };
  }

  // Check for balanced quotes
  let inString = false;
  let escapeNext = false;
  for (const char of expression) {
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
    }
  }
  if (inString) {
    return { valid: false, error: 'Unclosed string literal' };
  }

  // Check for balanced curly braces (field references)
  let openBraces = 0;
  for (const char of expression) {
    if (char === '{') openBraces++;
    if (char === '}') openBraces--;
    if (openBraces < 0) {
      return { valid: false, error: 'Unmatched closing brace in field reference' };
    }
  }
  if (openBraces > 0) {
    return { valid: false, error: 'Unclosed field reference {field_name}' };
  }

  return { valid: true };
}

/**
 * Substitute field values into formula expression
 */
export function substituteFieldValues(
  expression: string,
  fieldValues: Record<string, any>
): string {
  let substituted = expression;

  // Replace each {field_name} with its value
  const fieldRefs = parseFieldReferences(expression);
  for (const fieldName of fieldRefs) {
    const value = fieldValues[fieldName];
    if (value === undefined || value === null) {
      throw new Error(`Field "${fieldName}" is not available`);
    }

    // Convert value to string representation for formula
    let valueStr: string;
    if (typeof value === 'string') {
      valueStr = `"${value.replace(/"/g, '\\"')}"`;
    } else if (value instanceof Date) {
      valueStr = `"${value.toISOString()}"`;
    } else {
      valueStr = String(value);
    }

    // Replace all occurrences of this field
    const regex = new RegExp(`\\{${fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}`, 'g');
    substituted = substituted.replace(regex, valueStr);
  }

  return substituted;
}

/**
 * Evaluate mathematical expression (basic implementation)
 * In production, use a proper expression evaluator library
 */
export function evaluateExpression(expression: string): any {
  try {
    // This is a simplified version. In production, use a library like mathjs or create a proper parser
    // For now, we'll use a safe eval approach with limited scope

    // Replace function calls with JavaScript equivalents
    let jsExpression = expression
      .replace(/SUM\(([^)]+)\)/g, (_, arg) => `sumArray(${arg})`)
      .replace(/AVG\(([^)]+)\)/g, (_, arg) => `avgArray(${arg})`)
      .replace(/MIN\(([^)]+)\)/g, (_, arg) => `Math.min(${arg})`)
      .replace(/MAX\(([^)]+)\)/g, (_, arg) => `Math.max(${arg})`)
      .replace(/COUNT\(([^)]+)\)/g, (_, arg) => `countArray(${arg})`)
      .replace(/ROUND\(([^,]+),\s*(\d+)\)/g, (_, num, decimals) => `round(${num}, ${decimals})`)
      .replace(/ABS\(([^)]+)\)/g, (_, arg) => `Math.abs(${arg})`)
      .replace(/CEIL\(([^)]+)\)/g, (_, arg) => `Math.ceil(${arg})`)
      .replace(/FLOOR\(([^)]+)\)/g, (_, arg) => `Math.floor(${arg})`)
      .replace(/TODAY\(\)/g, () => `new Date().toISOString().split('T')[0]`)
      .replace(/NOW\(\)/g, () => `new Date().toISOString()`)
      .replace(/IF\(([^,]+),\s*([^,]+),\s*([^)]+)\)/g, (_, cond, trueVal, falseVal) => `(${cond} ? ${trueVal} : ${falseVal})`)
      .replace(/AND\(([^,]+),\s*([^)]+)\)/g, (_, a, b) => `(${a} && ${b})`)
      .replace(/OR\(([^,]+),\s*([^)]+)\)/g, (_, a, b) => `(${a} || ${b})`)
      .replace(/NOT\(([^)]+)\)/g, (_, arg) => `!(${arg})`);

    // Helper functions
    const sumArray = (...args: number[]) => args.reduce((sum, val) => sum + val, 0);
    const avgArray = (...args: number[]) => sumArray(...args) / args.length;
    const countArray = (...args: any[]) => args.length;
    const round = (num: number, decimals: number) => {
      const factor = Math.pow(10, decimals);
      return Math.round(num * factor) / factor;
    };

    // Create a function with limited scope (safer than eval)
    const evaluator = new Function(
      'sumArray',
      'avgArray',
      'countArray',
      'round',
      'Math',
      'Date',
      `return ${jsExpression}`
    );

    return evaluator(sumArray, avgArray, countArray, round, Math, Date);
  } catch (error) {
    throw new Error(`Formula evaluation failed: ${(error as Error).message}`);
  }
}

/**
 * Calculate formula result from data
 */
export function calculateFormula(
  expression: string,
  fieldValues: Record<string, any>
): { success: boolean; result?: any; error?: string } {
  try {
    // Validate formula
    const validation = validateFormula(expression);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Substitute field values
    const substituted = substituteFieldValues(expression, fieldValues);

    // Evaluate the expression
    const result = evaluateExpression(substituted);

    return { success: true, result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Get formula field dependencies
 */
export function getFormulaDependencies(expression: string): string[] {
  return parseFieldReferences(expression);
}

/**
 * Format formula for display
 */
export function formatFormula(expression: string): string {
  // Add syntax highlighting markers or formatting
  return expression
    .replace(/\{([^}]+)\}/g, '<span class="field-ref">{$1}</span>')
    .replace(/\b(SUM|AVG|MIN|MAX|COUNT|IF|AND|OR|NOT|TODAY|NOW)\b/g, '<span class="function">$1</span>')
    .replace(/"([^"]+)"/g, '<span class="string">"$1"</span>');
}

/**
 * Suggest field name corrections (fuzzy matching)
 */
export function suggestFieldCorrections(
  fieldName: string,
  availableFields: string[]
): string[] {
  const normalizedInput = fieldName.toLowerCase();

  return availableFields
    .filter((field) => {
      const normalized = field.toLowerCase();
      // Check if field contains the input or input contains the field
      return normalized.includes(normalizedInput) || normalizedInput.includes(normalized);
    })
    .sort((a, b) => {
      // Sort by similarity (simpler fields first)
      const diffA = Math.abs(a.length - fieldName.length);
      const diffB = Math.abs(b.length - fieldName.length);
      return diffA - diffB;
    })
    .slice(0, 5); // Return top 5 suggestions
}
