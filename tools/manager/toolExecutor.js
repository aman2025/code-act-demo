/**
 * Tool Executor - Executes tools and captures environmental feedback
 * Provides ground truth feedback from tool execution results
 */

class ToolExecutor {
  constructor(toolRegistry) {
    this.toolRegistry = toolRegistry;
    this.executionHistory = [];
    this.activeExecutions = new Map();
    this.maxExecutionTime = 30000; // 30 seconds default timeout
  }

  /**
   * Execute a tool with parameters and capture environmental feedback
   * @param {string} toolName - Name of tool to execute
   * @param {Object} params - Tool parameters
   * @param {Object} options - Execution options
   * @returns {Promise<ToolExecutionResult>} - Execution result with feedback
   */
  async executeToolWithFeedback(toolName, params = {}, options = {}) {
    const executionId = this.generateExecutionId();
    const startTime = Date.now();

    try {
      // Get tool from registry
      const tool = this.toolRegistry.getTool(toolName);
      if (!tool) {
        return this.createExecutionResult(executionId, false, null, 
          `Tool '${toolName}' not found in registry`, startTime);
      }

      // Validate parameters
      if (!tool.validate(params)) {
        return this.createExecutionResult(executionId, false, null, 
          `Parameter validation failed for tool '${toolName}'`, startTime);
      }

      // Prepare parameters with defaults
      const preparedParams = tool.prepareParameters(params);

      // Track active execution
      this.activeExecutions.set(executionId, {
        toolName,
        params: preparedParams,
        startTime,
        timeout: options.timeout || this.maxExecutionTime
      });

      console.log(`Executing tool: ${toolName} (${executionId})`);

      // Execute tool with timeout
      const toolResult = await this.executeWithTimeout(
        tool, 
        preparedParams, 
        options.timeout || this.maxExecutionTime
      );

      // Update tool usage statistics
      tool.updateUsageStats();

      // Remove from active executions
      this.activeExecutions.delete(executionId);

      // Create execution result with environmental feedback
      const executionResult = this.createExecutionResult(
        executionId, 
        toolResult.success, 
        toolResult, 
        toolResult.message, 
        startTime
      );

      // Generate environmental feedback
      const environmentalFeedback = this.generateEnvironmentalFeedback(
        toolName, 
        preparedParams, 
        toolResult, 
        executionResult
      );

      executionResult.environmentalFeedback = environmentalFeedback;

      // Store in execution history
      this.executionHistory.push(executionResult);

      // Limit history size
      if (this.executionHistory.length > 100) {
        this.executionHistory = this.executionHistory.slice(-100);
      }

      console.log(`Tool execution completed: ${toolName} (${executionId}) - ${toolResult.success ? 'SUCCESS' : 'FAILED'}`);

      return executionResult;

    } catch (error) {
      // Remove from active executions
      this.activeExecutions.delete(executionId);

      console.error(`Tool execution error: ${toolName} (${executionId})`, error);

      const executionResult = this.createExecutionResult(
        executionId, 
        false, 
        null, 
        `Tool execution failed: ${error.message}`, 
        startTime,
        error
      );

      // Generate error feedback
      const environmentalFeedback = this.generateErrorFeedback(
        toolName, 
        params, 
        error, 
        executionResult
      );

      executionResult.environmentalFeedback = environmentalFeedback;

      // Store in execution history
      this.executionHistory.push(executionResult);

      return executionResult;
    }
  }

  /**
   * Execute tool with timeout protection
   * @param {Tool} tool - Tool instance
   * @param {Object} params - Tool parameters
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<ToolResult>} - Tool result
   */
  async executeWithTimeout(tool, params, timeout) {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Tool execution timeout after ${timeout}ms`));
      }, timeout);

      try {
        const result = await tool.execute(params);
        clearTimeout(timeoutId);
        
        // Ensure result has proper structure
        if (!result || typeof result !== 'object') {
          resolve(tool.createErrorResult('Tool returned invalid result format'));
        } else {
          resolve(result);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        resolve(tool.createErrorResult(`Tool execution error: ${error.message}`, error));
      }
    });
  }

  /**
   * Generate environmental feedback from tool execution
   * @param {string} toolName - Tool name
   * @param {Object} params - Tool parameters
   * @param {ToolResult} toolResult - Tool execution result
   * @param {ToolExecutionResult} executionResult - Execution result
   * @returns {Object} - Environmental feedback
   */
  generateEnvironmentalFeedback(toolName, params, toolResult, executionResult) {
    const feedback = {
      type: 'tool_execution',
      toolName,
      executionId: executionResult.executionId,
      success: toolResult.success,
      timestamp: new Date(),
      groundTruth: this.extractGroundTruth(toolResult),
      observations: []
    };

    // Add success observations
    if (toolResult.success) {
      feedback.observations.push({
        type: 'success',
        message: `Tool '${toolName}' executed successfully`,
        data: toolResult.data,
        confidence: 1.0
      });

      // Add data-specific observations
      if (toolResult.data !== null && toolResult.data !== undefined) {
        feedback.observations.push({
          type: 'data_available',
          message: `Tool produced result data of type: ${typeof toolResult.data}`,
          dataType: typeof toolResult.data,
          dataSize: this.calculateDataSize(toolResult.data),
          confidence: 1.0
        });
      }

      // Add performance observations
      feedback.observations.push({
        type: 'performance',
        message: `Tool execution completed in ${executionResult.executionTime}ms`,
        executionTime: executionResult.executionTime,
        confidence: 1.0
      });
    } else {
      // Add failure observations
      feedback.observations.push({
        type: 'failure',
        message: `Tool '${toolName}' execution failed: ${toolResult.message}`,
        error: toolResult.error,
        confidence: 1.0
      });
    }

    // Add parameter observations
    feedback.observations.push({
      type: 'parameters',
      message: `Tool called with ${Object.keys(params).length} parameters`,
      parameterCount: Object.keys(params).length,
      parameters: params,
      confidence: 1.0
    });

    return feedback;
  }

  /**
   * Generate environmental feedback for errors
   * @param {string} toolName - Tool name
   * @param {Object} params - Tool parameters
   * @param {Error} error - Error object
   * @param {ToolExecutionResult} executionResult - Execution result
   * @returns {Object} - Environmental feedback
   */
  generateErrorFeedback(toolName, params, error, executionResult) {
    return {
      type: 'tool_execution_error',
      toolName,
      executionId: executionResult.executionId,
      success: false,
      timestamp: new Date(),
      groundTruth: {
        error: true,
        errorType: error.name,
        errorMessage: error.message
      },
      observations: [
        {
          type: 'execution_error',
          message: `Tool execution failed with error: ${error.message}`,
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack
          },
          confidence: 1.0
        },
        {
          type: 'environment_state',
          message: 'Tool execution environment encountered an error',
          toolAvailable: this.toolRegistry.getTool(toolName) !== null,
          confidence: 1.0
        }
      ]
    };
  }

  /**
   * Extract ground truth from tool result
   * @param {ToolResult} toolResult - Tool result
   * @returns {Object} - Ground truth data
   */
  extractGroundTruth(toolResult) {
    return {
      success: toolResult.success,
      hasData: toolResult.data !== null && toolResult.data !== undefined,
      dataType: typeof toolResult.data,
      message: toolResult.message,
      timestamp: toolResult.timestamp,
      toolName: toolResult.toolName
    };
  }

  /**
   * Calculate data size for observations
   * @param {*} data - Data to measure
   * @returns {number} - Data size estimate
   */
  calculateDataSize(data) {
    if (data === null || data === undefined) return 0;
    
    try {
      return JSON.stringify(data).length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Create execution result object
   * @param {string} executionId - Execution ID
   * @param {boolean} success - Whether execution succeeded
   * @param {ToolResult} toolResult - Tool result
   * @param {string} message - Execution message
   * @param {number} startTime - Start time
   * @param {Error} error - Error object (optional)
   * @returns {ToolExecutionResult} - Execution result
   */
  createExecutionResult(executionId, success, toolResult, message, startTime, error = null) {
    const endTime = Date.now();
    
    return {
      executionId,
      success,
      toolResult,
      message,
      executionTime: endTime - startTime,
      timestamp: new Date(),
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : null
    };
  }

  /**
   * Generate unique execution ID
   * @returns {string} - Execution ID
   */
  generateExecutionId() {
    return 'exec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }

  /**
   * Get execution history
   * @param {number} limit - Maximum number of results to return
   * @returns {ToolExecutionResult[]} - Execution history
   */
  getExecutionHistory(limit = 50) {
    return this.executionHistory.slice(-limit);
  }

  /**
   * Get active executions
   * @returns {Object} - Active executions map
   */
  getActiveExecutions() {
    return new Map(this.activeExecutions);
  }

  /**
   * Cancel active execution
   * @param {string} executionId - Execution ID to cancel
   * @returns {boolean} - Whether execution was cancelled
   */
  cancelExecution(executionId) {
    if (this.activeExecutions.has(executionId)) {
      this.activeExecutions.delete(executionId);
      console.log(`Execution cancelled: ${executionId}`);
      return true;
    }
    return false;
  }

  /**
   * Get executor statistics
   * @returns {Object} - Executor statistics
   */
  getStatistics() {
    const history = this.executionHistory;
    const successful = history.filter(exec => exec.success).length;
    const failed = history.filter(exec => !exec.success).length;
    
    const avgExecutionTime = history.length > 0 
      ? history.reduce((sum, exec) => sum + exec.executionTime, 0) / history.length 
      : 0;

    return {
      totalExecutions: history.length,
      successfulExecutions: successful,
      failedExecutions: failed,
      successRate: history.length > 0 ? (successful / history.length) * 100 : 0,
      averageExecutionTime: Math.round(avgExecutionTime),
      activeExecutions: this.activeExecutions.size
    };
  }

  /**
   * Clear execution history
   */
  clearHistory() {
    this.executionHistory = [];
    console.log('Execution history cleared');
  }

  /**
   * Set maximum execution timeout
   * @param {number} timeout - Timeout in milliseconds
   */
  setMaxExecutionTime(timeout) {
    this.maxExecutionTime = timeout;
    console.log(`Max execution time set to ${timeout}ms`);
  }
}

export default ToolExecutor;