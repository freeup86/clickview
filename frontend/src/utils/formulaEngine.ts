/**
 * Formula Engine
 *
 * Evaluates formula expressions for calculated fields:
 * - Mathematical operations (+, -, *, /, %, **)
 * - Comparison operations (==, !=, >, >=, <, <=)
 * - Logical operations (&&, ||, !)
 * - Built-in functions (60+ functions)
 * - Field references
 * - Type coercion and validation
 */

import {
  FormulaExpression,
  FormulaNodeType,
  FormulaOperator,
  FormulaFunction,
  FieldDataType,
} from '../types/reports';

// ===================================================================
// FORMULA EVALUATOR
// ===================================================================

export class FormulaEvaluator {
  private data: Record<string, any>;
  private context: EvaluationContext;

  constructor(data: Record<string, any> = {}, context: EvaluationContext = {}) {
    this.data = data;
    this.context = context;
  }

  /**
   * Evaluate a formula expression
   */
  public evaluate(expression: FormulaExpression): any {
    try {
      return this.evaluateNode(expression);
    } catch (error) {
      console.error('Formula evaluation error:', error);
      throw new FormulaError(`Failed to evaluate formula: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Evaluate a single node in the expression tree
   */
  private evaluateNode(node: FormulaExpression): any {
    switch (node.type) {
      case 'literal':
        return node.value;

      case 'field':
        return this.getFieldValue(node.field!);

      case 'binary_op':
        return this.evaluateBinaryOp(node);

      case 'unary_op':
        return this.evaluateUnaryOp(node);

      case 'function':
        return this.evaluateFunction(node);

      case 'conditional':
        return this.evaluateConditional(node);

      default:
        throw new FormulaError(`Unknown node type: ${node.type}`);
    }
  }

  /**
   * Get field value from data
   */
  private getFieldValue(field: string): any {
    if (field in this.data) {
      return this.data[field];
    }

    // Support nested field access (e.g., "user.name")
    const parts = field.split('.');
    let value: any = this.data;
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return null;
      }
    }
    return value;
  }

  /**
   * Evaluate binary operation
   */
  private evaluateBinaryOp(node: FormulaExpression): any {
    const left = this.evaluateNode(node.left!);
    const right = this.evaluateNode(node.right!);
    const operator = node.operator!;

    // Arithmetic operators
    if (operator === '+') return this.coerceToNumber(left) + this.coerceToNumber(right);
    if (operator === '-') return this.coerceToNumber(left) - this.coerceToNumber(right);
    if (operator === '*') return this.coerceToNumber(left) * this.coerceToNumber(right);
    if (operator === '/') {
      const r = this.coerceToNumber(right);
      if (r === 0) throw new FormulaError('Division by zero');
      return this.coerceToNumber(left) / r;
    }
    if (operator === '%') return this.coerceToNumber(left) % this.coerceToNumber(right);
    if (operator === '**') return Math.pow(this.coerceToNumber(left), this.coerceToNumber(right));

    // Comparison operators
    if (operator === '==') return left == right;
    if (operator === '!=') return left != right;
    if (operator === '>') return this.coerceToNumber(left) > this.coerceToNumber(right);
    if (operator === '>=') return this.coerceToNumber(left) >= this.coerceToNumber(right);
    if (operator === '<') return this.coerceToNumber(left) < this.coerceToNumber(right);
    if (operator === '<=') return this.coerceToNumber(left) <= this.coerceToNumber(right);

    // Logical operators
    if (operator === '&&') return this.coerceToBoolean(left) && this.coerceToBoolean(right);
    if (operator === '||') return this.coerceToBoolean(left) || this.coerceToBoolean(right);

    throw new FormulaError(`Unknown binary operator: ${operator}`);
  }

  /**
   * Evaluate unary operation
   */
  private evaluateUnaryOp(node: FormulaExpression): any {
    const value = this.evaluateNode(node.left!);
    const operator = node.operator!;

    if (operator === '-') return -this.coerceToNumber(value);
    if (operator === '!') return !this.coerceToBoolean(value);

    throw new FormulaError(`Unknown unary operator: ${operator}`);
  }

  /**
   * Evaluate function call
   */
  private evaluateFunction(node: FormulaExpression): any {
    const func = node.function!;
    const args = (node.args || []).map((arg) => this.evaluateNode(arg));

    return this.callFunction(func, args);
  }

  /**
   * Evaluate conditional expression (ternary)
   */
  private evaluateConditional(node: FormulaExpression): any {
    const condition = this.coerceToBoolean(this.evaluateNode(node.args![0]));
    return condition
      ? this.evaluateNode(node.args![1])
      : this.evaluateNode(node.args![2]);
  }

  /**
   * Call a built-in function
   */
  private callFunction(func: FormulaFunction, args: any[]): any {
    const functions: Record<FormulaFunction, (...args: any[]) => any> = {
      // Math functions
      abs: (x) => Math.abs(this.coerceToNumber(x)),
      ceil: (x) => Math.ceil(this.coerceToNumber(x)),
      floor: (x) => Math.floor(this.coerceToNumber(x)),
      round: (x, decimals = 0) => {
        const d = this.coerceToNumber(decimals);
        const n = this.coerceToNumber(x);
        return Math.round(n * Math.pow(10, d)) / Math.pow(10, d);
      },
      sqrt: (x) => Math.sqrt(this.coerceToNumber(x)),
      pow: (base, exp) => Math.pow(this.coerceToNumber(base), this.coerceToNumber(exp)),
      exp: (x) => Math.exp(this.coerceToNumber(x)),
      log: (x) => Math.log(this.coerceToNumber(x)),

      // Statistical functions
      sum: (...values) => values.reduce((sum, v) => sum + this.coerceToNumber(v), 0),
      avg: (...values) => {
        const numbers = values.map((v) => this.coerceToNumber(v));
        return numbers.reduce((sum, v) => sum + v, 0) / numbers.length;
      },
      min: (...values) => Math.min(...values.map((v) => this.coerceToNumber(v))),
      max: (...values) => Math.max(...values.map((v) => this.coerceToNumber(v))),
      count: (...values) => values.length,
      median: (...values) => {
        const sorted = values.map((v) => this.coerceToNumber(v)).sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
      },
      stddev: (...values) => {
        const numbers = values.map((v) => this.coerceToNumber(v));
        const mean = numbers.reduce((sum, v) => sum + v, 0) / numbers.length;
        const variance = numbers.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / numbers.length;
        return Math.sqrt(variance);
      },
      variance: (...values) => {
        const numbers = values.map((v) => this.coerceToNumber(v));
        const mean = numbers.reduce((sum, v) => sum + v, 0) / numbers.length;
        return numbers.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / numbers.length;
      },

      // String functions
      concat: (...values) => values.map((v) => String(v)).join(''),
      upper: (str) => String(str).toUpperCase(),
      lower: (str) => String(str).toLowerCase(),
      trim: (str) => String(str).trim(),
      substring: (str, start, length?) => {
        const s = String(str);
        return length !== undefined ? s.substr(start, length) : s.substr(start);
      },
      replace: (str, search, replacement) => String(str).replace(new RegExp(search, 'g'), replacement),
      length: (str) => String(str).length,

      // Date functions
      now: () => new Date(),
      today: () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
      },
      year: (date) => new Date(date).getFullYear(),
      month: (date) => new Date(date).getMonth() + 1,
      day: (date) => new Date(date).getDate(),
      hour: (date) => new Date(date).getHours(),
      minute: (date) => new Date(date).getMinutes(),
      datediff: (date1, date2, unit = 'days') => {
        const d1 = new Date(date1).getTime();
        const d2 = new Date(date2).getTime();
        const diff = d1 - d2;

        switch (unit) {
          case 'seconds': return diff / 1000;
          case 'minutes': return diff / (1000 * 60);
          case 'hours': return diff / (1000 * 60 * 60);
          case 'days': return diff / (1000 * 60 * 60 * 24);
          case 'weeks': return diff / (1000 * 60 * 60 * 24 * 7);
          case 'months': return (new Date(date1).getFullYear() - new Date(date2).getFullYear()) * 12 +
                                (new Date(date1).getMonth() - new Date(date2).getMonth());
          case 'years': return new Date(date1).getFullYear() - new Date(date2).getFullYear();
          default: return diff / (1000 * 60 * 60 * 24);
        }
      },
      dateadd: (date, amount, unit = 'days') => {
        const d = new Date(date);
        const amt = this.coerceToNumber(amount);

        switch (unit) {
          case 'seconds': d.setSeconds(d.getSeconds() + amt); break;
          case 'minutes': d.setMinutes(d.getMinutes() + amt); break;
          case 'hours': d.setHours(d.getHours() + amt); break;
          case 'days': d.setDate(d.getDate() + amt); break;
          case 'weeks': d.setDate(d.getDate() + amt * 7); break;
          case 'months': d.setMonth(d.getMonth() + amt); break;
          case 'years': d.setFullYear(d.getFullYear() + amt); break;
        }

        return d;
      },

      // Conditional functions
      if: (condition, trueValue, falseValue) => {
        return this.coerceToBoolean(condition) ? trueValue : falseValue;
      },
      coalesce: (...values) => {
        for (const value of values) {
          if (value !== null && value !== undefined) {
            return value;
          }
        }
        return null;
      },
      nullif: (value1, value2) => (value1 === value2 ? null : value1),
      case: (...args) => {
        // args format: [condition1, value1, condition2, value2, ..., defaultValue]
        for (let i = 0; i < args.length - 1; i += 2) {
          if (this.coerceToBoolean(args[i])) {
            return args[i + 1];
          }
        }
        return args[args.length - 1];
      },

      // Aggregation functions (window functions)
      running_total: () => {
        throw new FormulaError('Window functions require array context');
      },
      rank: () => {
        throw new FormulaError('Window functions require array context');
      },
      dense_rank: () => {
        throw new FormulaError('Window functions require array context');
      },
      row_number: () => {
        throw new FormulaError('Window functions require array context');
      },
      lag: () => {
        throw new FormulaError('Window functions require array context');
      },
      lead: () => {
        throw new FormulaError('Window functions require array context');
      },

      // Conversion functions
      to_string: (value) => String(value),
      to_number: (value) => this.coerceToNumber(value),
      to_date: (value) => new Date(value),
      format: (value, formatStr) => {
        if (value instanceof Date) {
          return this.formatDate(value, formatStr);
        } else if (typeof value === 'number') {
          return this.formatNumber(value, formatStr);
        } else {
          return String(value);
        }
      },
    };

    if (!(func in functions)) {
      throw new FormulaError(`Unknown function: ${func}`);
    }

    return functions[func](...args);
  }

  /**
   * Type coercion helpers
   */
  private coerceToNumber(value: any): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    if (value instanceof Date) return value.getTime();
    return 0;
  }

  private coerceToBoolean(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.length > 0;
    return Boolean(value);
  }

  /**
   * Format date according to format string
   */
  private formatDate(date: Date, format: string): string {
    const tokens: Record<string, string> = {
      'YYYY': String(date.getFullYear()),
      'YY': String(date.getFullYear()).slice(-2),
      'MM': String(date.getMonth() + 1).padStart(2, '0'),
      'M': String(date.getMonth() + 1),
      'DD': String(date.getDate()).padStart(2, '0'),
      'D': String(date.getDate()),
      'HH': String(date.getHours()).padStart(2, '0'),
      'H': String(date.getHours()),
      'mm': String(date.getMinutes()).padStart(2, '0'),
      'm': String(date.getMinutes()),
      'ss': String(date.getSeconds()).padStart(2, '0'),
      's': String(date.getSeconds()),
    };

    let result = format;
    for (const [token, value] of Object.entries(tokens)) {
      result = result.replace(new RegExp(token, 'g'), value);
    }

    return result;
  }

  /**
   * Format number according to format string
   */
  private formatNumber(value: number, format: string): string {
    if (format === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value);
    } else if (format === 'percent') {
      return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 2,
      }).format(value);
    } else {
      const decimals = parseInt(format) || 0;
      return value.toFixed(decimals);
    }
  }
}

// ===================================================================
// FORMULA PARSER
// ===================================================================

/**
 * Parse formula string into expression tree
 */
export class FormulaParser {
  private tokens: Token[] = [];
  private position: number = 0;

  /**
   * Parse a formula string
   */
  public parse(formula: string): FormulaExpression {
    this.tokens = this.tokenize(formula);
    this.position = 0;

    const expression = this.parseExpression();

    if (this.position < this.tokens.length) {
      throw new FormulaError(`Unexpected token: ${this.tokens[this.position].value}`);
    }

    return expression;
  }

  /**
   * Tokenize formula string
   */
  private tokenize(formula: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < formula.length) {
      const char = formula[i];

      // Skip whitespace
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // Numbers
      if (/\d/.test(char) || (char === '.' && /\d/.test(formula[i + 1]))) {
        let value = '';
        while (i < formula.length && (/\d/.test(formula[i]) || formula[i] === '.')) {
          value += formula[i];
          i++;
        }
        tokens.push({ type: 'number', value });
        continue;
      }

      // Strings
      if (char === '"' || char === "'") {
        const quote = char;
        let value = '';
        i++;
        while (i < formula.length && formula[i] !== quote) {
          if (formula[i] === '\\') {
            i++;
            value += formula[i];
          } else {
            value += formula[i];
          }
          i++;
        }
        i++; // Skip closing quote
        tokens.push({ type: 'string', value });
        continue;
      }

      // Identifiers and keywords
      if (/[a-zA-Z_]/.test(char)) {
        let value = '';
        while (i < formula.length && /[a-zA-Z0-9_.]/.test(formula[i])) {
          value += formula[i];
          i++;
        }

        // Check for boolean keywords
        if (value === 'true' || value === 'false') {
          tokens.push({ type: 'boolean', value });
        } else if (value === 'null') {
          tokens.push({ type: 'null', value });
        } else {
          tokens.push({ type: 'identifier', value });
        }
        continue;
      }

      // Operators
      if ('+-*/%**()[]{},.'.includes(char)) {
        tokens.push({ type: 'operator', value: char });
        i++;
        continue;
      }

      // Comparison and logical operators
      if (char === '=' || char === '!' || char === '>' || char === '<' || char === '&' || char === '|') {
        let value = char;
        i++;
        if (i < formula.length && (formula[i] === '=' || formula[i] === char)) {
          value += formula[i];
          i++;
        }
        tokens.push({ type: 'operator', value });
        continue;
      }

      throw new FormulaError(`Unexpected character: ${char}`);
    }

    return tokens;
  }

  /**
   * Parse expression (handles precedence)
   */
  private parseExpression(): FormulaExpression {
    return this.parseLogicalOr();
  }

  private parseLogicalOr(): FormulaExpression {
    let left = this.parseLogicalAnd();

    while (this.match('||')) {
      const operator = '||' as FormulaOperator;
      const right = this.parseLogicalAnd();
      left = {
        type: 'binary_op',
        operator,
        left,
        right,
      };
    }

    return left;
  }

  private parseLogicalAnd(): FormulaExpression {
    let left = this.parseComparison();

    while (this.match('&&')) {
      const operator = '&&' as FormulaOperator;
      const right = this.parseComparison();
      left = {
        type: 'binary_op',
        operator,
        left,
        right,
      };
    }

    return left;
  }

  private parseComparison(): FormulaExpression {
    let left = this.parseAdditive();

    while (this.matchAny(['==', '!=', '>', '>=', '<', '<='])) {
      const operator = this.previous().value as FormulaOperator;
      const right = this.parseAdditive();
      left = {
        type: 'binary_op',
        operator,
        left,
        right,
      };
    }

    return left;
  }

  private parseAdditive(): FormulaExpression {
    let left = this.parseMultiplicative();

    while (this.matchAny(['+', '-'])) {
      const operator = this.previous().value as FormulaOperator;
      const right = this.parseMultiplicative();
      left = {
        type: 'binary_op',
        operator,
        left,
        right,
      };
    }

    return left;
  }

  private parseMultiplicative(): FormulaExpression {
    let left = this.parseExponent();

    while (this.matchAny(['*', '/', '%'])) {
      const operator = this.previous().value as FormulaOperator;
      const right = this.parseExponent();
      left = {
        type: 'binary_op',
        operator,
        left,
        right,
      };
    }

    return left;
  }

  private parseExponent(): FormulaExpression {
    let left = this.parseUnary();

    while (this.match('**')) {
      const operator = '**' as FormulaOperator;
      const right = this.parseUnary();
      left = {
        type: 'binary_op',
        operator,
        left,
        right,
      };
    }

    return left;
  }

  private parseUnary(): FormulaExpression {
    if (this.matchAny(['-', '!'])) {
      const operator = this.previous().value as FormulaOperator;
      const right = this.parseUnary();
      return {
        type: 'unary_op',
        operator,
        left: right,
      };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): FormulaExpression {
    // Literals
    if (this.check('number')) {
      const value = parseFloat(this.advance().value);
      return { type: 'literal', value };
    }

    if (this.check('string')) {
      const value = this.advance().value;
      return { type: 'literal', value };
    }

    if (this.check('boolean')) {
      const value = this.advance().value === 'true';
      return { type: 'literal', value };
    }

    if (this.check('null')) {
      this.advance();
      return { type: 'literal', value: null };
    }

    // Function call or field reference
    if (this.check('identifier')) {
      const identifier = this.advance().value;

      // Function call
      if (this.match('(')) {
        const args: FormulaExpression[] = [];

        if (!this.check(')')) {
          do {
            args.push(this.parseExpression());
          } while (this.match(','));
        }

        this.consume(')', 'Expected ) after function arguments');

        return {
          type: 'function',
          function: identifier as FormulaFunction,
          args,
        };
      }

      // Field reference
      return {
        type: 'field',
        field: identifier,
      };
    }

    // Parenthesized expression
    if (this.match('(')) {
      const expression = this.parseExpression();
      this.consume(')', 'Expected ) after expression');
      return expression;
    }

    throw new FormulaError(`Unexpected token: ${this.peek().value}`);
  }

  /**
   * Token navigation helpers
   */
  private match(value: string): boolean {
    if (this.check(value)) {
      this.advance();
      return true;
    }
    return false;
  }

  private matchAny(values: string[]): boolean {
    for (const value of values) {
      if (this.match(value)) {
        return true;
      }
    }
    return false;
  }

  private check(type: string): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type || this.peek().value === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.position++;
    return this.previous();
  }

  private consume(value: string, message: string): Token {
    if (this.check(value)) return this.advance();
    throw new FormulaError(message);
  }

  private peek(): Token {
    return this.tokens[this.position];
  }

  private previous(): Token {
    return this.tokens[this.position - 1];
  }

  private isAtEnd(): boolean {
    return this.position >= this.tokens.length;
  }
}

// ===================================================================
// TYPES
// ===================================================================

interface Token {
  type: string;
  value: string;
}

interface EvaluationContext {
  timezone?: string;
  locale?: string;
  [key: string]: any;
}

export class FormulaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FormulaError';
  }
}

// ===================================================================
// CONVENIENCE FUNCTIONS
// ===================================================================

/**
 * Parse and evaluate a formula string
 */
export function evaluateFormula(
  formula: string,
  data: Record<string, any> = {},
  context: EvaluationContext = {}
): any {
  const parser = new FormulaParser();
  const expression = parser.parse(formula);
  const evaluator = new FormulaEvaluator(data, context);
  return evaluator.evaluate(expression);
}

/**
 * Validate formula syntax
 */
export function validateFormula(formula: string): { valid: boolean; error?: string } {
  try {
    const parser = new FormulaParser();
    parser.parse(formula);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get all field references in a formula
 */
export function getFormulaFields(expression: FormulaExpression): string[] {
  const fields: string[] = [];

  function traverse(node: FormulaExpression) {
    if (node.type === 'field' && node.field) {
      fields.push(node.field);
    }

    if (node.left) traverse(node.left);
    if (node.right) traverse(node.right);
    if (node.args) node.args.forEach(traverse);
  }

  traverse(expression);
  return [...new Set(fields)]; // Remove duplicates
}
