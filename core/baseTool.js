/**
 * Base Tool Class - Foundation for all agent tools
 * Provides common functionality and interface for tool implementations
 */

class BaseTool {
  constructor(name, description, category) {
    this.name = name;
    this.description = description;
    this.category = category;
    this.parameters = [];
    this.examples = [];
    this.version = '1.0.0';
    this.lastUsed = null;
    this.usageCount = 0;
  }

  /**
   * Execute the tool with given parameters
   * Must be implemented by subclasses
   * @param {Object} params - Tool parameters
   * @returns {Promise<ToolResult>} - Tool execution result
   */
  async execute(params) {
    throw new Error(`Tool '${this.name}' must implement execute method`);
  }

  /**
   * Validate parameters before execution
   * @param {Object} params - Parameters to validate
   * @returns {boolean} - Whether parameters are valid
   */
  validate(params) {
    if (!params || typeof params !== 'object') {
      return false;
    }

    // Check required parameters
    for (const param of this.parameters) {
      if (param.required && !(param.name in params)) {
        console.error(`Missing required parameter: ${param.name}`);
        return false;
      }

      // Type validation if parameter is provided
      if (param.name in params) {
        if (!this.validateParameterType(params[param.name], param.type)) {
          console.error(`Invalid type for parameter '${param.name}': expected ${param.type}`);
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Validate parameter type
   * @param {*} value - Value to validate
   * @param {string} expectedType - Expected type
   * @returns {boolean} - Whether type is valid
   */
  validateParameterType(value, expectedType) {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null;
      case 'array':
        return Array.isArray(value);
      default:
        return true; // Unknown type, allow it
    }
  }

  /**
   * Add parameter definition
   * @param {string} name - Parameter name
   * @param {string} type - Parameter type
   * @param {boolean} required - Whether parameter is required
   * @param {string} description - Parameter description
   * @param {*} defaultValue - Default value (optional)
   */
  addParameter(name, type, required, description, defaultValue = undefined) {
    const parameter = {
      name,
      type,
      required,
      description,
      defaultValue
    };

    this.parameters.push(parameter);
  }

  /**
   * Add usage example
   * @param {string} description - Example description
   * @param {Object} params - Example parameters
   * @param {*} expectedResult - Expected result
   */
  addExample(description, params, expectedResult) {
    this.examples.push({
      description,
      params,
      expectedResult
    });
  }

  /**
   * Get usage instructions for the tool
   * @returns {string} - Usage instructions
   */
  getUsageInstructions() {
    let instructions = `Tool: ${this.name}\n`;
    instructions += `Description: ${this.description}\n`;
    instructions += `Category: ${this.category}\n\n`;

    if (this.parameters.length > 0) {
      instructions += 'Parameters:\n';
      for (const param of this.parameters) {
        const required = param.required ? '(required)' : '(optional)';
        instructions += `  - ${param.name} (${param.type}) ${required}: ${param.description}\n`;
        if (param.defaultValue !== undefined) {
          instructions += `    Default: ${param.defaultValue}\n`;
        }
      }
      instructions += '\n';
    }

    if (this.examples.length > 0) {
      instructions += 'Examples:\n';
      for (const example of this.examples) {
        instructions += `  ${example.description}\n`;
        instructions += `  Parameters: ${JSON.stringify(example.params, null, 2)}\n`;
        instructions += `  Expected Result: ${JSON.stringify(example.expectedResult, null, 2)}\n\n`;
      }
    }

    return instructions;
  }

  /**
   * Update usage statistics
   */
  updateUsageStats() {
    this.usageCount++;
    this.lastUsed = new Date();
  }

  /**
   * Get tool metadata
   * @returns {Object} - Tool metadata
   */
  getMetadata() {
    return {
      name: this.name,
      description: this.description,
      category: this.category,
      version: this.version,
      parameterCount: this.parameters.length,
      exampleCount: this.examples.length,
      usageCount: this.usageCount,
      lastUsed: this.lastUsed
    };
  }

  /**
   * Create a successful tool result
   * @param {*} data - Result data
   * @param {string} message - Success message
   * @param {Object} metadata - Additional metadata
   * @returns {ToolResult} - Tool result object
   */
  createSuccessResult(data, message = 'Tool executed successfully', metadata = {}) {
    return {
      success: true,
      data,
      message,
      toolName: this.name,
      executionTime: 0, // Will be set by executor
      timestamp: new Date(),
      metadata: {
        version: this.version,
        ...metadata
      }
    };
  }

  /**
   * Create an error tool result
   * @param {string} message - Error message
   * @param {Error} error - Error object (optional)
   * @param {Object} metadata - Additional metadata
   * @returns {ToolResult} - Tool result object
   */
  createErrorResult(message, error = null, metadata = {}) {
    return {
      success: false,
      data: null,
      message,
      toolName: this.name,
      executionTime: 0, // Will be set by executor
      timestamp: new Date(),
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : null,
      metadata: {
        version: this.version,
        ...metadata
      }
    };
  }

  /**
   * Prepare parameters with defaults
   * @param {Object} params - Input parameters
   * @returns {Object} - Parameters with defaults applied
   */
  prepareParameters(params = {}) {
    const prepared = { ...params };

    // Apply default values for missing optional parameters
    for (const param of this.parameters) {
      if (!param.required && !(param.name in prepared) && param.defaultValue !== undefined) {
        prepared[param.name] = param.defaultValue;
      }
    }

    return prepared;
  }

  /**
   * Get parameter schema for documentation
   * @returns {Object} - Parameter schema
   */
  getParameterSchema() {
    const schema = {
      type: 'object',
      properties: {},
      required: []
    };

    for (const param of this.parameters) {
      schema.properties[param.name] = {
        type: param.type,
        description: param.description
      };

      if (param.defaultValue !== undefined) {
        schema.properties[param.name].default = param.defaultValue;
      }

      if (param.required) {
        schema.required.push(param.name);
      }
    }

    return schema;
  }
}

export default BaseTool;