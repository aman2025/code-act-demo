/**
 * Tool Manager - Manages tool registration and initialization
 * Coordinates between ToolRegistry, ToolExecutor, and ObservationGenerator
 */

import ToolRegistry from './toolRegistry.js';
import ToolExecutor from './toolExecutor.js';
import ObservationGenerator from './observationGenerator.js';
import AreaCalculator from '../tools/areaCalculator.js';
import PercentageCalculator from '../tools/percentageCalculator.js';
import { WeatherService, FlightService } from '../tools/mockServices.js';

class ToolManager {
  constructor() {
    this.toolRegistry = new ToolRegistry();
    this.toolExecutor = new ToolExecutor(this.toolRegistry);
    this.observationGenerator = new ObservationGenerator();
    this.initialized = false;
  }

  /**
   * Initialize the tool manager and register all tools
   */
  async initialize() {
    if (this.initialized) {
      console.log('Tool Manager already initialized');
      return;
    }

    console.log('Initializing Tool Manager...');

    try {
      // Initialize registry
      this.toolRegistry.initialize();

      // Register all preset tools
      await this.registerPresetTools();

      this.initialized = true;
      console.log('Tool Manager initialized successfully');
      
      // Log registered tools
      const stats = this.toolRegistry.getStatistics();
      console.log(`Registered ${stats.totalTools} tools across ${stats.totalCategories} categories`);

    } catch (error) {
      console.error('Failed to initialize Tool Manager:', error);
      throw error;
    }
  }

  /**
   * Register all preset tools
   */
  async registerPresetTools() {
    console.log('Registering preset tools...');

    try {
      // Register calculation tools
      const areaCalculator = new AreaCalculator();
      this.toolRegistry.registerTool(areaCalculator);

      const percentageCalculator = new PercentageCalculator();
      this.toolRegistry.registerTool(percentageCalculator);

      // Register mock services
      const weatherService = new WeatherService();
      this.toolRegistry.registerTool(weatherService);

      const flightService = new FlightService();
      this.toolRegistry.registerTool(flightService);

      console.log('All preset tools registered successfully');

    } catch (error) {
      console.error('Error registering preset tools:', error);
      throw error;
    }
  }

  /**
   * Execute a tool and generate observations
   * @param {string} toolName - Name of tool to execute
   * @param {Object} params - Tool parameters
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} - Execution result with observations
   */
  async executeToolWithObservations(toolName, params = {}, options = {}) {
    if (!this.initialized) {
      throw new Error('Tool Manager not initialized. Call initialize() first.');
    }

    try {
      // Execute tool with environmental feedback
      const executionResult = await this.toolExecutor.executeToolWithFeedback(
        toolName, 
        params, 
        options
      );

      // Generate observations from execution result
      const observations = this.generateObservationsFromExecution(executionResult);

      return {
        executionResult,
        observations,
        success: executionResult.success,
        toolName: toolName,
        executionId: executionResult.executionId
      };

    } catch (error) {
      console.error(`Tool execution failed: ${toolName}`, error);
      
      // Create error observation
      const errorObservation = this.observationGenerator.createErrorObservation(
        error, 
        `tool execution: ${toolName}`
      );

      return {
        executionResult: null,
        observations: [errorObservation],
        success: false,
        toolName: toolName,
        error: error.message
      };
    }
  }

  /**
   * Generate observations from tool execution result
   * @param {Object} executionResult - Tool execution result
   * @returns {Array} - Array of observations
   */
  generateObservationsFromExecution(executionResult) {
    const observations = [];

    try {
      if (executionResult.success && executionResult.toolResult) {
        // Create success observation
        const successObs = this.observationGenerator.createSuccessObservation(
          executionResult.toolResult,
          { executionId: executionResult.executionId }
        );
        observations.push(successObs);

        // Create performance observation
        const performanceObs = this.observationGenerator.createPerformanceObservation(
          executionResult.executionTime,
          `tool execution: ${executionResult.toolResult.toolName}`
        );
        observations.push(performanceObs);

        // Create data observation if tool returned data
        if (executionResult.toolResult.data !== null && executionResult.toolResult.data !== undefined) {
          const dataObs = this.observationGenerator.createDataObservation(
            executionResult.toolResult.data,
            executionResult.toolResult.toolName,
            { executionId: executionResult.executionId }
          );
          observations.push(dataObs);
        }

      } else {
        // Create error observation
        const errorObs = this.observationGenerator.createErrorObservation(
          executionResult.toolResult || new Error(executionResult.message),
          'tool execution',
          { executionId: executionResult.executionId }
        );
        observations.push(errorObs);
      }

      // Create tool feedback observation if environmental feedback exists
      if (executionResult.environmentalFeedback) {
        const feedbackObs = this.observationGenerator.createToolFeedbackObservation(
          executionResult.environmentalFeedback
        );
        observations.push(feedbackObs);
      }

    } catch (error) {
      console.error('Error generating observations:', error);
      
      // Fallback error observation
      const fallbackObs = this.observationGenerator.createErrorObservation(
        error,
        'observation generation'
      );
      observations.push(fallbackObs);
    }

    return observations;
  }

  /**
   * Get available tools
   * @param {string} category - Optional category filter
   * @returns {Array} - Array of available tools
   */
  getAvailableTools(category = null) {
    if (!this.initialized) {
      console.warn('Tool Manager not initialized');
      return [];
    }

    return this.toolRegistry.getAvailableTools(category);
  }

  /**
   * Search for tools
   * @param {string} query - Search query
   * @returns {Array} - Array of matching tools
   */
  searchTools(query) {
    if (!this.initialized) {
      console.warn('Tool Manager not initialized');
      return [];
    }

    return this.toolRegistry.searchTools(query);
  }

  /**
   * Get tool documentation
   * @param {string} toolName - Name of the tool
   * @returns {Object|null} - Tool documentation
   */
  getToolDocumentation(toolName) {
    if (!this.initialized) {
      console.warn('Tool Manager not initialized');
      return null;
    }

    return this.toolRegistry.getToolDocumentation(toolName);
  }

  /**
   * Get tool execution history
   * @param {number} limit - Maximum number of results
   * @returns {Array} - Execution history
   */
  getExecutionHistory(limit = 50) {
    if (!this.initialized) {
      console.warn('Tool Manager not initialized');
      return [];
    }

    return this.toolExecutor.getExecutionHistory(limit);
  }

  /**
   * Get tool manager statistics
   * @returns {Object} - Combined statistics
   */
  getStatistics() {
    if (!this.initialized) {
      return {
        initialized: false,
        tools: { totalTools: 0, totalCategories: 0 },
        execution: { totalExecutions: 0, successRate: 0 }
      };
    }

    return {
      initialized: this.initialized,
      tools: this.toolRegistry.getStatistics(),
      execution: this.toolExecutor.getStatistics()
    };
  }

  /**
   * Register a custom tool
   * @param {BaseTool} tool - Tool instance to register
   */
  registerCustomTool(tool) {
    if (!this.initialized) {
      throw new Error('Tool Manager not initialized. Call initialize() first.');
    }

    this.toolRegistry.registerTool(tool);
    console.log(`Custom tool registered: ${tool.name}`);
  }

  /**
   * Remove a tool from registry
   * @param {string} toolName - Name of tool to remove
   * @returns {boolean} - Whether tool was removed
   */
  removeTool(toolName) {
    if (!this.initialized) {
      console.warn('Tool Manager not initialized');
      return false;
    }

    return this.toolRegistry.removeTool(toolName);
  }

  /**
   * Get tool categories
   * @returns {Array} - Array of category names
   */
  getCategories() {
    if (!this.initialized) {
      console.warn('Tool Manager not initialized');
      return [];
    }

    return this.toolRegistry.getCategories();
  }

  /**
   * Check if a tool exists
   * @param {string} toolName - Name of the tool
   * @returns {boolean} - Whether tool exists
   */
  hasTools(toolName) {
    if (!this.initialized) {
      return false;
    }

    return this.toolRegistry.getTool(toolName) !== null;
  }

  /**
   * Get active executions
   * @returns {Map} - Active executions
   */
  getActiveExecutions() {
    if (!this.initialized) {
      return new Map();
    }

    return this.toolExecutor.getActiveExecutions();
  }

  /**
   * Cancel an active execution
   * @param {string} executionId - Execution ID to cancel
   * @returns {boolean} - Whether execution was cancelled
   */
  cancelExecution(executionId) {
    if (!this.initialized) {
      return false;
    }

    return this.toolExecutor.cancelExecution(executionId);
  }

  /**
   * Set maximum execution timeout
   * @param {number} timeout - Timeout in milliseconds
   */
  setMaxExecutionTime(timeout) {
    if (!this.initialized) {
      console.warn('Tool Manager not initialized');
      return;
    }

    this.toolExecutor.setMaxExecutionTime(timeout);
  }

  /**
   * Clear execution history
   */
  clearExecutionHistory() {
    if (!this.initialized) {
      console.warn('Tool Manager not initialized');
      return;
    }

    this.toolExecutor.clearHistory();
  }

  /**
   * Reset tool manager
   */
  reset() {
    if (this.initialized) {
      this.toolRegistry.clear();
      this.toolExecutor.clearHistory();
      this.initialized = false;
      console.log('Tool Manager reset');
    }
  }

  /**
   * Get tool manager status
   * @returns {Object} - Status information
   */
  getStatus() {
    return {
      initialized: this.initialized,
      registryStatus: this.toolRegistry.getStatus(),
      executorStats: this.initialized ? this.toolExecutor.getStatistics() : null,
      activeExecutions: this.initialized ? this.toolExecutor.getActiveExecutions().size : 0
    };
  }
}

export default ToolManager;