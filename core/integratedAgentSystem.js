/**
 * Integrated Agent System - Complete agent system with guardrails
 * Connects LLM reasoning, tool execution, and feedback loops with safety controls
 */

import AgentController from './agentController.js';
import ToolManager from './toolManager.js';
import EnhancedAIService from './enhancedAIService.js';
import AgentResponseParser from './agentResponseParser.js';
import AgentPromptingSystem from './agentPromptingSystem.js';
import AgentMonitoringSystem from './agentMonitoringSystem.js';

class IntegratedAgentSystem {
  constructor() {
    this.agentController = new AgentController();
    this.toolManager = new ToolManager();
    this.enhancedAIService = null; // Will be initialized after toolManager
    this.responseParser = new AgentResponseParser();
    this.promptingSystem = null; // Will be initialized after toolManager
    this.monitoringSystem = new AgentMonitoringSystem();
    
    // Guardrails and safety controls
    this.costControls = {
      maxAPICallsPerSession: 20,
      maxExecutionTimeMs: 300000, // 5 minutes
      maxToolExecutionsPerSession: 50,
      currentAPICallCount: 0,
      currentToolExecutionCount: 0,
      sessionStartTime: null
    };
    
    this.safetyGuardrails = {
      maxIterationsPerQuery: 10,
      confidenceThreshold: 0.3,
      errorThreshold: 5,
      timeoutMs: 60000, // 1 minute per iteration
      enableLogging: true,
      enableMonitoring: true
    };
    
    this.initialized = false;
    this.sessionId = null;
  }

  /**
   * Initialize the integrated agent system
   * @param {Object} config - Configuration options
   */
  async initialize(config = {}) {
    if (this.initialized) {
      console.log('Integrated Agent System already initialized');
      return;
    }

    console.log('Initializing Integrated Agent System...');

    try {
      // Apply configuration
      this.applyConfiguration(config);

      // Initialize tool manager first
      await this.toolManager.initialize();

      // Initialize enhanced AI service with tool registry
      this.enhancedAIService = new EnhancedAIService(this.toolManager.toolRegistry);

      // Initialize prompting system with tool registry
      this.promptingSystem = new AgentPromptingSystem(this.toolManager.toolRegistry);

      // Configure agent controller with tool integration
      this.configureAgentControllerIntegration();
      
      // Set tool execution capabilities on agent controller
      this.agentController.setToolExecutionCapabilities(this.toolManager, this.enhancedAIService);

      this.initialized = true;
      this.sessionId = this.generateSessionId();
      this.costControls.sessionStartTime = new Date();

      // Start monitoring session
      this.monitoringSystem.startSession(this.sessionId, config);

      console.log(`Integrated Agent System initialized successfully (Session: ${this.sessionId})`);
      
      if (this.safetyGuardrails.enableLogging) {
        this.logSystemStatus();
      }

    } catch (error) {
      console.error('Failed to initialize Integrated Agent System:', error);
      throw error;
    }
  }

  /**
   * Apply configuration to system components
   * @param {Object} config - Configuration options
   */
  applyConfiguration(config) {
    // Apply cost control configuration
    if (config.costControls) {
      this.costControls = { ...this.costControls, ...config.costControls };
    }

    // Apply safety guardrail configuration
    if (config.safetyGuardrails) {
      this.safetyGuardrails = { ...this.safetyGuardrails, ...config.safetyGuardrails };
    }

    // Configure agent controller
    if (config.agent) {
      this.agentController.configure(config.agent);
    }

    console.log('Configuration applied to Integrated Agent System');
  }

  /**
   * Configure agent controller with tool integration
   */
  configureAgentControllerIntegration() {
    // Override agent controller methods to integrate with tools and guardrails
    const originalProcessQuery = this.agentController.processQuery.bind(this.agentController);
    
    this.agentController.processQuery = async (userQuery, config = {}) => {
      return await this.processQueryWithGuardrails(userQuery, config, originalProcessQuery);
    };

    console.log('Agent controller configured with tool integration and guardrails');
  }

  /**
   * Process query with integrated system and guardrails
   * @param {string} userQuery - User query
   * @param {Object} config - Configuration options
   * @param {Function} originalProcessQuery - Original process query method
   * @returns {Promise<Object>} - Enhanced agent response
   */
  async processQueryWithGuardrails(userQuery, config, originalProcessQuery) {
    if (!this.initialized) {
      throw new Error('Integrated Agent System not initialized. Call initialize() first.');
    }

    // Check cost controls before processing
    const costCheck = this.checkCostControls();
    if (!costCheck.allowed) {
      return this.createCostLimitResponse(costCheck.reason);
    }

    // Apply safety guardrails to config
    const safeConfig = this.applySafetyGuardrails(config);

    const startTime = Date.now();
    const queryId = this.generateQueryId();
    let response = null;

    // Start monitoring query
    this.monitoringSystem.startQuery(this.sessionId, queryId, userQuery, safeConfig);

    try {
      // Increment API call count
      this.costControls.currentAPICallCount++;

      // Log query processing start
      if (this.safetyGuardrails.enableLogging) {
        console.log(`Processing query with integrated system: "${userQuery.substring(0, 100)}..."`);
      }

      // Enhanced query processing with tool integration
      response = await this.processQueryWithToolIntegration(userQuery, safeConfig, originalProcessQuery);

      // Post-process response with monitoring
      response = await this.postProcessResponse(response, startTime);

      // Complete monitoring query
      this.monitoringSystem.completeQuery(this.sessionId, queryId, response);

      return response;

    } catch (error) {
      console.error('Integrated system processing error:', error);
      
      // Record error in monitoring
      this.monitoringSystem.recordError(this.sessionId, queryId, {
        type: 'integrated_system_error',
        message: error.message,
        phase: 'query_processing',
        stack: error.stack
      });

      // Create safe error response
      const errorResponse = this.createSafeErrorResponse(error, startTime);
      
      // Complete monitoring query with error
      this.monitoringSystem.completeQuery(this.sessionId, queryId, errorResponse);
      
      return errorResponse;
    }
  }

  /**
   * Process query with tool integration
   * @param {string} userQuery - User query
   * @param {Object} safeConfig - Safe configuration
   * @param {Function} originalProcessQuery - Original process query method
   * @returns {Promise<Object>} - Enhanced response
   */
  async processQueryWithToolIntegration(userQuery, safeConfig, originalProcessQuery) {
    // Create enhanced prompting context
    const promptingContext = await this.createPromptingContext(userQuery);

    // Override agent reasoning generation to include tool awareness
    const originalGenerateReasoning = this.agentController.generateReasoning.bind(this.agentController);
    
    this.agentController.generateReasoning = async (feedbackContext) => {
      return await this.generateToolAwareReasoning(feedbackContext, promptingContext);
    };

    // Override action planning to include tool execution
    const originalPlanNextAction = this.agentController.planNextAction.bind(this.agentController);
    
    this.agentController.planNextAction = (reasoning, feedbackContext) => {
      return this.planToolAwareAction(reasoning, feedbackContext, promptingContext);
    };

    // Process with original method but enhanced capabilities
    const response = await originalProcessQuery(userQuery, safeConfig);

    // Restore original methods
    this.agentController.generateReasoning = originalGenerateReasoning;
    this.agentController.planNextAction = originalPlanNextAction;

    return response;
  }

  /**
   * Create prompting context with tool awareness
   * @param {string} userQuery - User query
   * @returns {Promise<Object>} - Prompting context
   */
  async createPromptingContext(userQuery) {
    const availableTools = this.toolManager.getAvailableTools();
    const toolDocumentation = availableTools.map(tool => 
      this.toolManager.getToolDocumentation(tool.name)
    );

    return {
      userQuery,
      availableTools,
      toolDocumentation,
      systemCapabilities: this.getSystemCapabilities(),
      safetyConstraints: this.safetyGuardrails
    };
  }

  /**
   * Generate tool-aware reasoning
   * @param {Object} feedbackContext - Feedback context
   * @param {Object} promptingContext - Prompting context
   * @returns {Promise<string>} - Enhanced reasoning
   */
  async generateToolAwareReasoning(feedbackContext, promptingContext) {
    try {
      // Create enhanced prompt with tool awareness
      const prompt = this.promptingSystem.createToolAwareReasoningPrompt(
        promptingContext,
        feedbackContext
      );

      // Generate reasoning with enhanced AI service
      const reasoning = await this.enhancedAIService.generateAgentReasoning({
        prompt,
        context: feedbackContext,
        tools: promptingContext.availableTools
      });

      return reasoning;

    } catch (error) {
      console.error('Tool-aware reasoning generation failed:', error);
      
      // Fallback to basic reasoning
      return `I need to analyze the query: "${promptingContext.userQuery}". Let me consider the available tools and determine the best approach.`;
    }
  }

  /**
   * Plan tool-aware action
   * @param {string} reasoning - Current reasoning
   * @param {Object} feedbackContext - Feedback context
   * @param {Object} promptingContext - Prompting context
   * @returns {Object} - Enhanced action plan
   */
  planToolAwareAction(reasoning, feedbackContext, promptingContext) {
    try {
      // Parse reasoning for tool usage intent
      const toolIntent = this.responseParser.parseToolSelection(reasoning);

      if (toolIntent && toolIntent.toolName) {
        // Check if we can execute the tool
        const canExecute = this.canExecuteTool(toolIntent.toolName, toolIntent.parameters);
        
        if (canExecute.allowed) {
          return {
            type: 'tool_execution',
            toolName: toolIntent.toolName,
            parameters: toolIntent.parameters,
            reasoning: reasoning.substring(0, 200) + '...',
            environmentallyInformed: true,
            toolAware: true,
            executionPlan: canExecute.plan
          };
        } else {
          return {
            type: 'tool_blocked',
            reason: canExecute.reason,
            alternativeAction: 'continue_reasoning',
            reasoning: reasoning.substring(0, 200) + '...',
            environmentallyInformed: true,
            toolAware: true
          };
        }
      }

      // Default action planning
      return {
        type: 'reasoning',
        description: 'Continue analysis with tool awareness',
        reasoning: reasoning.substring(0, 200) + '...',
        environmentallyInformed: true,
        toolAware: true,
        availableTools: promptingContext.availableTools.length
      };

    } catch (error) {
      console.error('Tool-aware action planning failed:', error);
      
      return {
        type: 'error_recovery',
        description: 'Fallback to basic reasoning due to planning error',
        reasoning: reasoning.substring(0, 200) + '...',
        error: error.message
      };
    }
  }

  /**
   * Check if tool can be executed within guardrails
   * @param {string} toolName - Tool name
   * @param {Object} parameters - Tool parameters
   * @returns {Object} - Execution permission and plan
   */
  canExecuteTool(toolName, parameters) {
    // Check tool execution count
    if (this.costControls.currentToolExecutionCount >= this.costControls.maxToolExecutionsPerSession) {
      return {
        allowed: false,
        reason: 'Tool execution limit reached for this session'
      };
    }

    // Check if tool exists
    if (!this.toolManager.hasTools(toolName)) {
      return {
        allowed: false,
        reason: `Tool '${toolName}' not found`
      };
    }

    // Validate parameters
    const toolDoc = this.toolManager.getToolDocumentation(toolName);
    if (toolDoc && !this.validateToolParameters(parameters, toolDoc.parameters)) {
      return {
        allowed: false,
        reason: 'Invalid tool parameters'
      };
    }

    return {
      allowed: true,
      plan: {
        toolName,
        parameters,
        expectedExecutionTime: this.estimateExecutionTime(toolName),
        safetyChecks: ['parameter_validation', 'timeout_protection', 'error_handling']
      }
    };
  }

  /**
   * Execute tool with integrated system
   * @param {string} toolName - Tool name
   * @param {Object} parameters - Tool parameters
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} - Execution result with observations
   */
  async executeToolWithIntegration(toolName, parameters, options = {}) {
    if (!this.initialized) {
      throw new Error('Integrated Agent System not initialized');
    }

    // Apply safety timeout
    const safeOptions = {
      ...options,
      timeout: Math.min(options.timeout || 30000, this.safetyGuardrails.timeoutMs)
    };

    try {
      // Increment tool execution count
      this.costControls.currentToolExecutionCount++;

      // Execute with tool manager
      const result = await this.toolManager.executeToolWithObservations(
        toolName,
        parameters,
        safeOptions
      );

      // Log execution if enabled
      if (this.safetyGuardrails.enableLogging) {
        console.log(`Tool executed: ${toolName} - ${result.success ? 'Success' : 'Failed'}`);
      }

      return result;

    } catch (error) {
      console.error(`Integrated tool execution failed: ${toolName}`, error);
      throw error;
    }
  }

  /**
   * Check cost controls
   * @returns {Object} - Cost control check result
   */
  checkCostControls() {
    const now = Date.now();
    const sessionDuration = now - this.costControls.sessionStartTime.getTime();

    // Check session duration
    if (sessionDuration > this.costControls.maxExecutionTimeMs) {
      return {
        allowed: false,
        reason: 'Maximum session duration exceeded'
      };
    }

    // Check API call count
    if (this.costControls.currentAPICallCount >= this.costControls.maxAPICallsPerSession) {
      return {
        allowed: false,
        reason: 'Maximum API calls per session exceeded'
      };
    }

    // Check tool execution count
    if (this.costControls.currentToolExecutionCount >= this.costControls.maxToolExecutionsPerSession) {
      return {
        allowed: false,
        reason: 'Maximum tool executions per session exceeded'
      };
    }

    return { allowed: true };
  }

  /**
   * Apply safety guardrails to configuration
   * @param {Object} config - Original configuration
   * @returns {Object} - Safe configuration
   */
  applySafetyGuardrails(config) {
    const safeConfig = { ...config };

    // Limit max iterations
    if (!safeConfig.maxIterations || safeConfig.maxIterations > this.safetyGuardrails.maxIterationsPerQuery) {
      safeConfig.maxIterations = this.safetyGuardrails.maxIterationsPerQuery;
    }

    // Ensure minimum confidence threshold
    if (!safeConfig.confidenceThreshold || safeConfig.confidenceThreshold < this.safetyGuardrails.confidenceThreshold) {
      safeConfig.confidenceThreshold = this.safetyGuardrails.confidenceThreshold;
    }

    // Apply autonomous operation safety
    if (!safeConfig.autonomous) {
      safeConfig.autonomous = {};
    }
    
    safeConfig.autonomous.operationMode = safeConfig.autonomous.operationMode || 'supervised';
    safeConfig.autonomous.thresholds = {
      ...safeConfig.autonomous.thresholds,
      maxIterationsBeforeHuman: Math.min(
        safeConfig.autonomous.thresholds?.maxIterationsBeforeHuman || 3,
        5
      )
    };

    return safeConfig;
  }

  /**
   * Post-process response with monitoring
   * @param {Object} response - Agent response
   * @param {number} startTime - Processing start time
   * @returns {Promise<Object>} - Enhanced response
   */
  async postProcessResponse(response, startTime) {
    const processingTime = Date.now() - startTime;

    // Add system metadata
    response.systemMetadata = {
      sessionId: this.sessionId,
      processingTimeMs: processingTime,
      apiCallsUsed: this.costControls.currentAPICallCount,
      toolExecutionsUsed: this.costControls.currentToolExecutionCount,
      systemVersion: '1.0.0',
      guardrailsApplied: true
    };

    // Add cost control status
    response.costControlStatus = {
      apiCallsRemaining: this.costControls.maxAPICallsPerSession - this.costControls.currentAPICallCount,
      toolExecutionsRemaining: this.costControls.maxToolExecutionsPerSession - this.costControls.currentToolExecutionCount,
      sessionTimeRemaining: this.costControls.maxExecutionTimeMs - (Date.now() - this.costControls.sessionStartTime.getTime())
    };

    // Log completion if enabled
    if (this.safetyGuardrails.enableLogging) {
      console.log(`Query processed in ${processingTime}ms with ${response.iterations || 0} iterations`);
    }

    return response;
  }

  /**
   * Create cost limit response
   * @param {string} reason - Limit reason
   * @returns {Object} - Cost limit response
   */
  createCostLimitResponse(reason) {
    return {
      success: false,
      reasoning: [`I've reached the ${reason.toLowerCase()} for this session. Please start a new session to continue.`],
      actions: [],
      observations: [],
      finalAnswer: `I'm unable to process your request because I've reached the ${reason.toLowerCase()}. This is a safety measure to prevent excessive resource usage.`,
      error: {
        type: 'cost_limit_exceeded',
        message: reason
      },
      agentMode: true,
      iterations: 0,
      costLimitExceeded: true,
      systemMetadata: {
        sessionId: this.sessionId,
        costControlStatus: this.getCostControlStatus()
      }
    };
  }

  /**
   * Create safe error response
   * @param {Error} error - Error object
   * @param {number} startTime - Processing start time
   * @returns {Object} - Safe error response
   */
  createSafeErrorResponse(error, startTime) {
    const processingTime = Date.now() - startTime;

    return {
      success: false,
      reasoning: ['An error occurred while processing your request.'],
      actions: [],
      observations: [],
      finalAnswer: 'I encountered an error while processing your request. Please try again with a different approach.',
      error: {
        type: 'integrated_system_error',
        message: error.message,
        processingTime: processingTime
      },
      agentMode: true,
      iterations: 0,
      systemMetadata: {
        sessionId: this.sessionId,
        processingTimeMs: processingTime,
        errorOccurred: true
      }
    };
  }

  /**
   * Get system capabilities
   * @returns {Object} - System capabilities
   */
  getSystemCapabilities() {
    return {
      toolExecution: this.initialized,
      availableTools: this.toolManager.getAvailableTools().map(t => t.name),
      reasoningCapabilities: ['multi_step', 'tool_aware', 'error_recovery'],
      safetyFeatures: ['cost_controls', 'guardrails', 'monitoring', 'timeout_protection'],
      maxIterations: this.safetyGuardrails.maxIterationsPerQuery,
      sessionLimits: {
        maxAPICallsPerSession: this.costControls.maxAPICallsPerSession,
        maxToolExecutionsPerSession: this.costControls.maxToolExecutionsPerSession,
        maxExecutionTimeMs: this.costControls.maxExecutionTimeMs
      }
    };
  }

  /**
   * Validate tool parameters
   * @param {Object} parameters - Parameters to validate
   * @param {Array} parameterSchema - Parameter schema
   * @returns {boolean} - Whether parameters are valid
   */
  validateToolParameters(parameters, parameterSchema) {
    if (!parameterSchema || !Array.isArray(parameterSchema)) {
      return true; // No schema to validate against
    }

    for (const param of parameterSchema) {
      if (param.required && !(param.name in parameters)) {
        return false;
      }
      
      if (param.name in parameters) {
        const value = parameters[param.name];
        
        // Basic type checking
        if (param.type === 'number' && typeof value !== 'number') {
          return false;
        }
        if (param.type === 'string' && typeof value !== 'string') {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Estimate tool execution time
   * @param {string} toolName - Tool name
   * @returns {number} - Estimated execution time in ms
   */
  estimateExecutionTime(toolName) {
    const estimates = {
      'area-calculator': 100,
      'percentage-calculator': 100,
      'weather-service': 500,
      'flight-service': 1000
    };

    return estimates[toolName] || 500;
  }

  /**
   * Get cost control status
   * @returns {Object} - Cost control status
   */
  getCostControlStatus() {
    const now = Date.now();
    const sessionDuration = now - this.costControls.sessionStartTime.getTime();

    return {
      apiCallsUsed: this.costControls.currentAPICallCount,
      apiCallsRemaining: this.costControls.maxAPICallsPerSession - this.costControls.currentAPICallCount,
      toolExecutionsUsed: this.costControls.currentToolExecutionCount,
      toolExecutionsRemaining: this.costControls.maxToolExecutionsPerSession - this.costControls.currentToolExecutionCount,
      sessionDurationMs: sessionDuration,
      sessionTimeRemainingMs: this.costControls.maxExecutionTimeMs - sessionDuration
    };
  }

  /**
   * Log system status
   */
  logSystemStatus() {
    const status = {
      initialized: this.initialized,
      sessionId: this.sessionId,
      toolManager: this.toolManager.getStatus(),
      costControls: this.getCostControlStatus(),
      safetyGuardrails: this.safetyGuardrails
    };

    console.log('Integrated Agent System Status:', JSON.stringify(status, null, 2));
  }

  /**
   * Generate session ID
   * @returns {string} - Session ID
   */
  generateSessionId() {
    return `ias_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Reset system for new session
   */
  resetSession() {
    this.sessionId = this.generateSessionId();
    this.costControls.currentAPICallCount = 0;
    this.costControls.currentToolExecutionCount = 0;
    this.costControls.sessionStartTime = new Date();
    
    // Reset agent controller
    this.agentController.resetAgent();
    
    console.log(`New session started: ${this.sessionId}`);
  }

  /**
   * Get comprehensive system status
   * @returns {Object} - Complete system status
   */
  getSystemStatus() {
    return {
      initialized: this.initialized,
      sessionId: this.sessionId,
      agentController: this.agentController.getAgentStatus(),
      toolManager: this.toolManager.getStatus(),
      costControls: this.getCostControlStatus(),
      safetyGuardrails: this.safetyGuardrails,
      systemCapabilities: this.getSystemCapabilities(),
      monitoring: {
        sessionMetrics: this.sessionId ? this.monitoringSystem.getSessionMetrics(this.sessionId) : null,
        globalMetrics: this.monitoringSystem.getGlobalMetrics(),
        recentAlerts: this.monitoringSystem.getRecentAlerts(10)
      }
    };
  }

  /**
   * Shutdown system gracefully
   */
  async shutdown() {
    console.log('Shutting down Integrated Agent System...');
    
    // End monitoring session
    if (this.sessionId) {
      this.monitoringSystem.endSession(this.sessionId);
    }
    
    // Cancel any active tool executions
    const activeExecutions = this.toolManager.getActiveExecutions();
    for (const [executionId] of activeExecutions) {
      this.toolManager.cancelExecution(executionId);
    }
    
    // Reset components
    this.toolManager.reset();
    this.agentController.resetAgent();
    
    this.initialized = false;
    this.sessionId = null;
    
    console.log('Integrated Agent System shutdown complete');
  }

  /**
   * Generate query ID
   * @returns {string} - Query ID
   */
  generateQueryId() {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default IntegratedAgentSystem;