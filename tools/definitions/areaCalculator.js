/**
 * Area Calculator Tool - Calculates areas for various geometric shapes
 * Supports triangle, rectangle, and circle calculations
 */

import BaseTool from '../base/baseTool.js';

class AreaCalculator extends BaseTool {
  constructor() {
    super(
      'area-calculator',
      'Calculates the area of geometric shapes including triangles, rectangles, and circles',
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
      'shape',
      'string',
      true,
      'The geometric shape to calculate area for (triangle, rectangle, circle)',
      'rectangle'
    );

    this.addParameter(
      'base',
      'number',
      false,
      'Base dimension for triangle or width for rectangle (required for triangle and rectangle)'
    );

    this.addParameter(
      'height',
      'number',
      false,
      'Height dimension for triangle and rectangle (required for triangle and rectangle)'
    );

    this.addParameter(
      'width',
      'number',
      false,
      'Width dimension for rectangle (alternative to base)'
    );

    this.addParameter(
      'radius',
      'number',
      false,
      'Radius for circle calculation (required for circle)'
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
      'Calculate triangle area',
      { shape: 'triangle', base: 10, height: 8 },
      { area: 40, shape: 'triangle', formula: '(base × height) / 2' }
    );

    this.addExample(
      'Calculate rectangle area',
      { shape: 'rectangle', width: 12, height: 5 },
      { area: 60, shape: 'rectangle', formula: 'width × height' }
    );

    this.addExample(
      'Calculate circle area',
      { shape: 'circle', radius: 7 },
      { area: 153.94, shape: 'circle', formula: 'π × radius²' }
    );
  }

  /**
   * Execute area calculation
   * @param {Object} params - Calculation parameters
   * @returns {Promise<ToolResult>} - Calculation result
   */
  async execute(params) {
    try {
      const preparedParams = this.prepareParameters(params);
      const { shape, precision } = preparedParams;

      // Validate shape parameter
      const validShapes = ['triangle', 'rectangle', 'circle'];
      if (!validShapes.includes(shape.toLowerCase())) {
        return this.createErrorResult(
          `Invalid shape '${shape}'. Supported shapes: ${validShapes.join(', ')}`
        );
      }

      let result;
      const normalizedShape = shape.toLowerCase();

      switch (normalizedShape) {
        case 'triangle':
          result = await this.calculateTriangle(preparedParams);
          break;
        case 'rectangle':
          result = await this.calculateRectangle(preparedParams);
          break;
        case 'circle':
          result = await this.calculateCircle(preparedParams);
          break;
        default:
          return this.createErrorResult(`Unsupported shape: ${shape}`);
      }

      if (result.error) {
        return this.createErrorResult(result.error);
      }

      // Apply precision formatting
      const formattedArea = Number(result.area.toFixed(precision));

      const calculationResult = {
        area: formattedArea,
        shape: normalizedShape,
        formula: result.formula,
        dimensions: result.dimensions,
        units: 'square units',
        precision: precision
      };

      return this.createSuccessResult(
        calculationResult,
        `Successfully calculated ${normalizedShape} area: ${formattedArea} square units`
      );

    } catch (error) {
      return this.createErrorResult(
        `Area calculation failed: ${error.message}`,
        error
      );
    }
  }

  /**
   * Calculate triangle area
   * @param {Object} params - Triangle parameters
   * @returns {Object} - Calculation result
   */
  async calculateTriangle(params) {
    const { base, height } = params;

    // Validate required parameters
    if (base === undefined || base === null) {
      return { error: 'Triangle calculation requires base parameter' };
    }
    if (height === undefined || height === null) {
      return { error: 'Triangle calculation requires height parameter' };
    }

    // Validate parameter values
    if (typeof base !== 'number' || base <= 0) {
      return { error: 'Base must be a positive number' };
    }
    if (typeof height !== 'number' || height <= 0) {
      return { error: 'Height must be a positive number' };
    }

    const area = (base * height) / 2;

    return {
      area,
      formula: '(base × height) / 2',
      dimensions: { base, height }
    };
  }

  /**
   * Calculate rectangle area
   * @param {Object} params - Rectangle parameters
   * @returns {Object} - Calculation result
   */
  async calculateRectangle(params) {
    let { width, height, base } = params;

    // Allow base as alternative to width
    if (width === undefined && base !== undefined) {
      width = base;
    }

    // Validate required parameters
    if (width === undefined || width === null) {
      return { error: 'Rectangle calculation requires width (or base) parameter' };
    }
    if (height === undefined || height === null) {
      return { error: 'Rectangle calculation requires height parameter' };
    }

    // Validate parameter values
    if (typeof width !== 'number' || width <= 0) {
      return { error: 'Width must be a positive number' };
    }
    if (typeof height !== 'number' || height <= 0) {
      return { error: 'Height must be a positive number' };
    }

    const area = width * height;

    return {
      area,
      formula: 'width × height',
      dimensions: { width, height }
    };
  }

  /**
   * Calculate circle area
   * @param {Object} params - Circle parameters
   * @returns {Object} - Calculation result
   */
  async calculateCircle(params) {
    const { radius } = params;

    // Validate required parameters
    if (radius === undefined || radius === null) {
      return { error: 'Circle calculation requires radius parameter' };
    }

    // Validate parameter values
    if (typeof radius !== 'number' || radius <= 0) {
      return { error: 'Radius must be a positive number' };
    }

    const area = Math.PI * radius * radius;

    return {
      area,
      formula: 'π × radius²',
      dimensions: { radius }
    };
  }

  /**
   * Get calculation formulas
   * @returns {Object} - Available formulas
   */
  getFormulas() {
    return {
      triangle: '(base × height) / 2',
      rectangle: 'width × height',
      circle: 'π × radius²'
    };
  }

  /**
   * Get supported shapes
   * @returns {string[]} - Array of supported shapes
   */
  getSupportedShapes() {
    return ['triangle', 'rectangle', 'circle'];
  }

  /**
   * Validate shape-specific parameters
   * @param {Object} params - Parameters to validate
   * @returns {boolean} - Whether parameters are valid for the shape
   */
  validate(params) {
    // First run base validation
    if (!super.validate(params)) {
      return false;
    }

    const { shape } = params;
    if (!shape) {
      console.error('Shape parameter is required');
      return false;
    }

    const normalizedShape = shape.toLowerCase();
    
    // Shape-specific validation
    switch (normalizedShape) {
      case 'triangle':
        if (!params.base || !params.height) {
          console.error('Triangle requires base and height parameters');
          return false;
        }
        break;
      case 'rectangle':
        const hasWidth = params.width !== undefined;
        const hasBase = params.base !== undefined;
        if ((!hasWidth && !hasBase) || !params.height) {
          console.error('Rectangle requires width (or base) and height parameters');
          return false;
        }
        break;
      case 'circle':
        if (!params.radius) {
          console.error('Circle requires radius parameter');
          return false;
        }
        break;
      default:
        console.error(`Unsupported shape: ${shape}`);
        return false;
    }

    return true;
  }
}

export default AreaCalculator;