/**
 * Percentage Calculator Tool - Performs various percentage calculations
 * Supports percentage calculation, percentage increase/decrease, and percentage of value
 */

import BaseTool from '../base/baseTool.js';

class PercentageCalculator extends BaseTool {
  constructor() {
    super(
      'percentage-calculator',
      'Performs percentage calculations including what percentage one number is of another, percentage increases/decreases, and calculating percentage of a value',
      'math'
    );

    this.setupParameters();
    this.setupExamples();
  }

  /**
   * Setup tool parameters
   */
  setupParameters() {
    this.addParameter(
      'operation',
      'string',
      true,
      'Type of percentage operation (percentage_of, percentage_increase, percentage_decrease, what_percentage)',
      'percentage_of'
    );

    this.addParameter(
      'value',
      'number',
      true,
      'The primary value for calculation'
    );

    this.addParameter(
      'total',
      'number',
      false,
      'The total value (required for what_percentage operation)'
    );

    this.addParameter(
      'percentage',
      'number',
      false,
      'The percentage value (required for percentage_of operation)'
    );

    this.addParameter(
      'original_value',
      'number',
      false,
      'The original value (required for percentage_increase/decrease operations)'
    );

    this.addParameter(
      'new_value',
      'number',
      false,
      'The new value (required for percentage_increase/decrease operations)'
    );

    this.addParameter(
      'precision',
      'number',
      false,
      'Number of decimal places for result (default: 2)',
      2
    );
  }

  /**
   * Setup usage examples
   */
  setupExamples() {
    this.addExample(
      'Calculate what percentage 25 is of 100',
      { operation: 'what_percentage', value: 25, total: 100 },
      { result: 25, operation: 'what_percentage', formula: '(value / total) × 100' }
    );

    this.addExample(
      'Calculate 15% of 200',
      { operation: 'percentage_of', percentage: 15, value: 200 },
      { result: 30, operation: 'percentage_of', formula: '(percentage / 100) × value' }
    );

    this.addExample(
      'Calculate percentage increase from 50 to 75',
      { operation: 'percentage_increase', original_value: 50, new_value: 75 },
      { result: 50, operation: 'percentage_increase', formula: '((new - original) / original) × 100' }
    );
  }

  /**
   * Execute percentage calculation
   * @param {Object} params - Calculation parameters
   * @returns {Promise<ToolResult>} - Calculation result
   */
  async execute(params) {
    try {
      const preparedParams = this.prepareParameters(params);
      const { operation, precision } = preparedParams;

      // Validate operation parameter
      const validOperations = ['percentage_of', 'percentage_increase', 'percentage_decrease', 'what_percentage'];
      if (!validOperations.includes(operation)) {
        return this.createErrorResult(
          `Invalid operation '${operation}'. Supported operations: ${validOperations.join(', ')}`
        );
      }

      let result;

      switch (operation) {
        case 'what_percentage':
          result = await this.calculateWhatPercentage(preparedParams);
          break;
        case 'percentage_of':
          result = await this.calculatePercentageOf(preparedParams);
          break;
        case 'percentage_increase':
          result = await this.calculatePercentageChange(preparedParams, 'increase');
          break;
        case 'percentage_decrease':
          result = await this.calculatePercentageChange(preparedParams, 'decrease');
          break;
        default:
          return this.createErrorResult(`Unsupported operation: ${operation}`);
      }

      if (result.error) {
        return this.createErrorResult(result.error);
      }

      // Apply precision formatting
      const formattedResult = Number(result.value.toFixed(precision));

      const calculationResult = {
        result: formattedResult,
        operation: operation,
        formula: result.formula,
        inputs: result.inputs,
        precision: precision,
        explanation: result.explanation
      };

      return this.createSuccessResult(
        calculationResult,
        `Successfully calculated ${operation}: ${formattedResult}${result.unit || ''}`
      );

    } catch (error) {
      return this.createErrorResult(
        `Percentage calculation failed: ${error.message}`,
        error
      );
    }
  }

  /**
   * Calculate what percentage one number is of another
   * @param {Object} params - Calculation parameters
   * @returns {Object} - Calculation result
   */
  async calculateWhatPercentage(params) {
    const { value, total } = params;

    // Validate required parameters
    if (value === undefined || value === null) {
      return { error: 'What percentage calculation requires value parameter' };
    }
    if (total === undefined || total === null) {
      return { error: 'What percentage calculation requires total parameter' };
    }

    // Validate parameter values
    if (typeof value !== 'number') {
      return { error: 'Value must be a number' };
    }
    if (typeof total !== 'number' || total === 0) {
      return { error: 'Total must be a non-zero number' };
    }

    const percentage = (value / total) * 100;

    return {
      value: percentage,
      formula: '(value / total) × 100',
      inputs: { value, total },
      unit: '%',
      explanation: `${value} is ${percentage.toFixed(2)}% of ${total}`
    };
  }

  /**
   * Calculate percentage of a value
   * @param {Object} params - Calculation parameters
   * @returns {Object} - Calculation result
   */
  async calculatePercentageOf(params) {
    const { percentage, value } = params;

    // Validate required parameters
    if (percentage === undefined || percentage === null) {
      return { error: 'Percentage of calculation requires percentage parameter' };
    }
    if (value === undefined || value === null) {
      return { error: 'Percentage of calculation requires value parameter' };
    }

    // Validate parameter values
    if (typeof percentage !== 'number') {
      return { error: 'Percentage must be a number' };
    }
    if (typeof value !== 'number') {
      return { error: 'Value must be a number' };
    }

    const result = (percentage / 100) * value;

    return {
      value: result,
      formula: '(percentage / 100) × value',
      inputs: { percentage, value },
      explanation: `${percentage}% of ${value} is ${result.toFixed(2)}`
    };
  }

  /**
   * Calculate percentage increase or decrease
   * @param {Object} params - Calculation parameters
   * @param {string} changeType - 'increase' or 'decrease'
   * @returns {Object} - Calculation result
   */
  async calculatePercentageChange(params, changeType) {
    const { original_value, new_value } = params;

    // Validate required parameters
    if (original_value === undefined || original_value === null) {
      return { error: `Percentage ${changeType} calculation requires original_value parameter` };
    }
    if (new_value === undefined || new_value === null) {
      return { error: `Percentage ${changeType} calculation requires new_value parameter` };
    }

    // Validate parameter values
    if (typeof original_value !== 'number' || original_value === 0) {
      return { error: 'Original value must be a non-zero number' };
    }
    if (typeof new_value !== 'number') {
      return { error: 'New value must be a number' };
    }

    const change = new_value - original_value;
    const percentageChange = (change / Math.abs(original_value)) * 100;

    // Determine if it's actually an increase or decrease
    const actualChangeType = change >= 0 ? 'increase' : 'decrease';
    const absolutePercentageChange = Math.abs(percentageChange);

    return {
      value: absolutePercentageChange,
      formula: '((new_value - original_value) / |original_value|) × 100',
      inputs: { original_value, new_value },
      unit: '%',
      changeType: actualChangeType,
      absoluteChange: Math.abs(change),
      explanation: `Change from ${original_value} to ${new_value} is a ${absolutePercentageChange.toFixed(2)}% ${actualChangeType}`
    };
  }

  /**
   * Get available operations
   * @returns {Object} - Available operations with descriptions
   */
  getOperations() {
    return {
      what_percentage: 'Calculate what percentage one number is of another',
      percentage_of: 'Calculate a percentage of a given value',
      percentage_increase: 'Calculate percentage increase between two values',
      percentage_decrease: 'Calculate percentage decrease between two values'
    };
  }

  /**
   * Validate operation-specific parameters
   * @param {Object} params - Parameters to validate
   * @returns {boolean} - Whether parameters are valid for the operation
   */
  validate(params) {
    // First run base validation
    if (!super.validate(params)) {
      return false;
    }

    const { operation } = params;
    if (!operation) {
      console.error('Operation parameter is required');
      return false;
    }

    // Operation-specific validation
    switch (operation) {
      case 'what_percentage':
        if (params.value === undefined || params.total === undefined) {
          console.error('What percentage operation requires value and total parameters');
          return false;
        }
        break;
      case 'percentage_of':
        if (params.percentage === undefined || params.value === undefined) {
          console.error('Percentage of operation requires percentage and value parameters');
          return false;
        }
        break;
      case 'percentage_increase':
      case 'percentage_decrease':
        if (params.original_value === undefined || params.new_value === undefined) {
          console.error('Percentage change operations require original_value and new_value parameters');
          return false;
        }
        break;
      default:
        console.error(`Unsupported operation: ${operation}`);
        return false;
    }

    return true;
  }

  /**
   * Get calculation formulas
   * @returns {Object} - Available formulas
   */
  getFormulas() {
    return {
      what_percentage: '(value / total) × 100',
      percentage_of: '(percentage / 100) × value',
      percentage_change: '((new_value - original_value) / |original_value|) × 100'
    };
  }
}

export default PercentageCalculator;