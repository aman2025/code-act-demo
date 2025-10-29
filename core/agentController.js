/**
 * Agent Controller - Core agent loop infrastructure
 * Implements LLM-driven decision making with environmental feedback
 */

import AgentState from './agentState.js';
import StoppingConditions from './stoppingConditions.js';
import ObservationGenerator from './observationGenerator.js';
import FeedbackIntegrator from './feedbackIntegrator.js';
import ErrorRecoverySystem from './errorRecoverySystem.js';
import AutonomousOperationManager from './autonomousOperationManager.js';
import HumanInteractionManager from './humanInteractionManager.js';

class AgentController {
  constructor() {
    this.agentState = new AgentState();
    this.stoppingConditions = new StoppingConditions();
    this.observationGenerator = new ObservationGenerator();
    this.feedbackIntegrator = new FeedbackIntegrator();
    this.errorRecoverySystem = new ErrorRecoverySystem();
    this.autonomousOperationManager = new AutonomousOperationManager();
    this.humanInteractionManager = new HumanInteractionManager();
    this.isRunning = false;
  }

  /**
   * Initialize agent with fresh state
   * @param {string} query - User query
   * @param {Object} config - Configuration options
   */
  initializeAgent(query, config = {}) {
    this.agentState.initialize(query, config);
    this.isRunning = false;
    
    console.log('Agent initialized with fresh state');
  }

  /**
   * Main agent processing loop - LLM-driven decision making
   * @param {string} userQuery - The user's query to process
   * @param {Object} config - Configuration options
   * @returns {Promise<AgentResponse>} - Complete agent response
   */
  async processQuery(userQuery, config = {}) {
    try {
      // Initialize agent for this query
      this.initializeAgent(userQuery, config);
      this.isRunning = true;

      console.log(`Agent starting to process query: "${userQuery}"`);

      // Main agent loop - continue until stopping condition met
      while (this.shouldContinueLoop()) {
        this.agentState.incrementIteration();
        const currentState = this.agentState.getState();

        console.log(`Agent iteration ${currentState.currentIteration}/${currentState.maxIterations}`);

        // Step 1: Detect and handle errors from environmental feedback
        const errorRecoveryPlan = await this.detectAndRecoverFromErrors();

        // Step 2: Integrate environmental feedback into context (including recovery context)
        const feedbackContext = this.integrateFeedbackIntoContext();
        if (errorRecoveryPlan.strategies.length > 0) {
          feedbackContext.errorRecoveryPlan = errorRecoveryPlan;
        }

        // Step 3: Generate reasoning based on current context, environmental feedback, and error recovery
        const reasoning = await this.generateReasoning(feedbackContext);
        this.agentState.addReasoning(reasoning);

        // Step 4: Check for autonomous operation decision
        const autonomousDecision = this.autonomousOperationManager.shouldContinueAutonomously(
          this.agentState.getState(), 
          { feedbackContext, errorRecoveryPlan }
        );
        
        if (!autonomousDecision.shouldContinue) {
          console.log(`Agent requesting human input: ${autonomousDecision.reason}`);
          
          // Create human checkpoint
          const checkpoint = this.humanInteractionManager.createCheckpoint(
            autonomousDecision.trigger || 'autonomous_decision',
            this.agentState.getState(),
            { 
              decision: autonomousDecision,
              feedbackContext,
              errorRecoveryPlan 
            }
          );
          
          // Add checkpoint to agent state
          this.agentState.addHumanCheckpoint(autonomousDecision.reason, {
            checkpointId: checkpoint.id,
            trigger: autonomousDecision.trigger,
            confidence: autonomousDecision.confidence
          });
          
          // Create progress communication
          const progressComm = this.humanInteractionManager.createProgressCommunication(
            this.agentState.getState(),
            { needsInput: true, checkpoint: checkpoint }
          );
          
          console.log(`Human checkpoint created: ${checkpoint.id}`);
          break; // Exit loop to await human input
        }

        // Step 5: Check for blockers that require human intervention
        const blockerDetection = this.humanInteractionManager.detectBlocker(
          this.agentState.getState(),
          { feedbackContext, errorRecoveryPlan }
        );
        
        if (blockerDetection.hasBlocker) {
          console.log(`Blocker detected: ${blockerDetection.blocker.type}`);
          
          // Create human checkpoint for blocker
          const checkpoint = this.humanInteractionManager.createCheckpoint(
            blockerDetection.blocker.type,
            this.agentState.getState(),
            { 
              blocker: blockerDetection.blocker,
              recommendation: blockerDetection.recommendedAction
            }
          );
          
          // Add checkpoint to agent state
          this.agentState.addHumanCheckpoint(
            `Blocker: ${blockerDetection.blocker.description}`,
            {
              checkpointId: checkpoint.id,
              blockerType: blockerDetection.blocker.type,
              severity: blockerDetection.blocker.severity
            }
          );
          
          console.log(`Blocker checkpoint created: ${checkpoint.id}`);
          break; // Exit loop to await human input
        }

        // Step 6: Check stopping conditions
        const stoppingDecision = this.stoppingConditions.evaluate(this.agentState.getState());
        if (stoppingDecision.shouldStop) {
          console.log(`Agent stopping: ${stoppingDecision.reason}`);
          this.agentState.updateStatus('completed', stoppingDecision.reason);
          break;
        }

        // Step 7: Check for task completion (autonomous termination)
        const completionDetection = this.autonomousOperationManager.detectTaskCompletion(
          this.agentState.getState(),
          { feedbackContext, errorRecoveryPlan }
        );
        
        if (completionDetection.isComplete) {
          console.log(`Task completion detected: ${completionDetection.reason}`);
          this.agentState.updateStatus('completed', 'autonomous_completion');
          this.agentState.updateConfidence(completionDetection.confidence);
          break;
        }

        // Step 8: If continuing, plan next action based on environmental feedback and recovery plan
        const plannedAction = this.planNextAction(reasoning, feedbackContext);
        this.agentState.addAction(plannedAction);

        // Step 9: Execute tool if action is a tool call
        let toolExecutionResult = null;
        if (plannedAction.type === 'tool_call' && this.toolManager) {
          toolExecutionResult = await this.executeToolAction(plannedAction);
        }

        // Step 10: Create environmental observation for next iteration
        const observation = this.createEnvironmentalObservation(reasoning, plannedAction, feedbackContext, toolExecutionResult);
        this.agentState.addObservation(observation);

        // Step 10: Update confidence based on environmental feedback and error recovery
        this.updateConfidenceFromFeedback(feedbackContext);

        // Step 11: Create progress communication if enabled
        if (this.humanInteractionManager.progressCommunicationEnabled) {
          const progressComm = this.humanInteractionManager.createProgressCommunication(
            this.agentState.getState(),
            { 
              feedbackContext,
              autonomousDecision,
              completionDetection
            }
          );
        }
      }

      // Finalize agent state
      this.isRunning = false;
      const finalState = this.agentState.getState();
      
      if (finalState.status === 'processing') {
        this.agentState.updateStatus('max_iterations_reached');
      }

      // Generate final response
      return this.generateFinalResponse();

    } catch (error) {
      console.error('Agent processing error:', error);
      this.isRunning = false;
      this.agentState.addError(error, { phase: 'main_loop' });
      this.agentState.updateStatus('error', error.message);
      
      const currentState = this.agentState.getState();
      
      return {
        success: false,
        reasoning: currentState.reasoning.map(r => r.content),
        actions: currentState.actions,
        observations: currentState.observations,
        finalAnswer: 'I encountered an error while processing your request.',
        error: {
          type: 'agent_error',
          message: error.message,
          iteration: currentState.currentIteration
        },
        agentMode: true,
        iterations: currentState.currentIteration,
        strategy: currentState.strategy
      };
    }
  }

  /**
   * Integrate environmental feedback into reasoning context
   * @returns {Object} - Integrated feedback context
   */
  integrateFeedbackIntoContext() {
    const currentState = this.agentState.getState();
    const observations = currentState.observations;
    
    if (observations.length === 0) {
      return {
        feedbackSummary: { totalObservations: 0 },
        actionableInsights: [],
        environmentalState: { stability: 'unknown' },
        contextForLLM: 'No environmental feedback available yet.'
      };
    }

    return this.feedbackIntegrator.integrateObservationsIntoContext(observations, currentState);
  }

  /**
   * Generate reasoning for current iteration with environmental feedback
   * @param {Object} feedbackContext - Environmental feedback context
   * @returns {Promise<string>} - Reasoning content
   */
  async generateReasoning(feedbackContext) {
    const currentState = this.agentState.getState();
    const context = this.buildReasoningContext();
    
    // Enhanced reasoning logic that incorporates environmental feedback and error recovery
    if (currentState.currentIteration === 1) {
      return `I need to analyze the user's query: "${currentState.originalQuery}". Let me break this down and determine the best approach to help them.`;
    } else {
      const previousReasoning = currentState.reasoning[currentState.reasoning.length - 1];
      let reasoning = `Building on my previous analysis, environmental feedback, and error recovery:\n\n`;
      
      // Incorporate error recovery context first (highest priority)
      if (feedbackContext.errorRecoveryPlan && feedbackContext.errorRecoveryPlan.strategies.length > 0) {
        reasoning += `Error Recovery Context:\n`;
        reasoning += `- Detected ${feedbackContext.errorRecoveryPlan.totalErrors} errors, ${feedbackContext.errorRecoveryPlan.recoverableErrors} recoverable\n`;
        
        feedbackContext.errorRecoveryPlan.strategies.slice(0, 2).forEach((strategy, index) => {
          reasoning += `${index + 1}. ${strategy.strategyName}: ${strategy.action.description}\n`;
        });
        reasoning += '\n';
      }
      
      // Incorporate environmental feedback
      if (feedbackContext.contextForLLM) {
        reasoning += `${feedbackContext.contextForLLM}\n\n`;
      }
      
      // Add insights from feedback
      if (feedbackContext.actionableInsights.length > 0) {
        reasoning += `Key insights from environment:\n`;
        feedbackContext.actionableInsights.slice(0, 2).forEach((insight, index) => {
          reasoning += `${index + 1}. ${insight.reasoning}\n`;
        });
        reasoning += '\n';
      }
      
      reasoning += `Previous reasoning: ${previousReasoning.content.substring(0, 100)}...\n\n`;
      
      // Adaptive reasoning based on error recovery
      if (feedbackContext.errorRecoveryPlan && feedbackContext.errorRecoveryPlan.strategies.length > 0) {
        reasoning += `Given the error recovery strategies, I will adapt my approach to address the identified issues and implement the recommended recovery actions.`;
      } else {
        reasoning += `Based on this feedback, I should continue with my current approach while remaining alert to potential issues.`;
      }
      
      return reasoning;
    }
  }

  /**
   * Build context for reasoning
   * @returns {Object} - Context object for reasoning
   */
  buildReasoningContext() {
    const currentState = this.agentState.getState();
    return {
      query: currentState.originalQuery,
      iteration: currentState.currentIteration,
      previousReasoning: currentState.reasoning,
      previousActions: currentState.actions,
      observations: currentState.observations,
      confidence: currentState.confidence
    };
  }

  /**
   * Check if agent should continue the loop
   * @returns {boolean} - Whether to continue
   */
  shouldContinueLoop() {
    if (!this.isRunning) return false;
    return this.agentState.shouldContinue();
  }



  /**
   * Plan next action based on reasoning and environmental feedback
   * @param {string} reasoning - Current reasoning
   * @param {Object} feedbackContext - Environmental feedback context
   * @returns {Object} - Planned action
   */
  planNextAction(reasoning, feedbackContext) {
    const currentState = this.agentState.getState();
    
    // Prioritize error recovery actions if available
    if (feedbackContext.errorRecoveryPlan && feedbackContext.errorRecoveryPlan.prioritizedActions.length > 0) {
      const topRecoveryAction = feedbackContext.errorRecoveryPlan.prioritizedActions[0];
      
      return {
        type: 'error_recovery',
        description: topRecoveryAction.description,
        reasoning: reasoning.substring(0, 200) + '...',
        iteration: currentState.currentIteration,
        environmentallyInformed: true,
        errorRecoveryAction: topRecoveryAction,
        recoveryPriority: topRecoveryAction.priority,
        feedbackInfluence: feedbackContext.recommendedActions?.length || 0
      };
    }
    
    // If we have tool execution capabilities, try to select a tool
    if (this.enhancedAIService && this.toolManager) {
      // Use enhanced AI service to determine if we should use a tool
      const toolSelectionAction = this.planToolAction(reasoning, currentState);
      if (toolSelectionAction) {
        return toolSelectionAction;
      }
    }
    
    // Use environmental feedback to inform action planning
    let actionType = 'reasoning';
    let description = 'Continue analysis and reasoning';
    
    if (feedbackContext.recommendedActions && feedbackContext.recommendedActions.length > 0) {
      const topRecommendation = feedbackContext.recommendedActions[0];
      actionType = topRecommendation.action;
      description = topRecommendation.reasoning;
    }
    
    return {
      type: actionType,
      description: description,
      reasoning: reasoning.substring(0, 200) + '...',
      iteration: currentState.currentIteration,
      environmentallyInformed: true,
      feedbackInfluence: feedbackContext.recommendedActions?.length || 0
    };
  }

  /**
   * Plan tool action based on reasoning
   * @param {string} reasoning - Current reasoning
   * @param {Object} currentState - Current agent state
   * @returns {Object|null} - Tool action or null
   */
  planToolAction(reasoning, currentState) {
    const query = currentState.originalQuery.toLowerCase();
    
    // Simple tool selection logic based on query content
    if (query.includes('weather') || query.includes('temperature') || query.includes('forecast')) {
      return {
        type: 'tool_call',
        toolName: 'weather-service',
        parameters: this.extractWeatherParameters(query),
        description: 'Get weather information',
        reasoning: reasoning.substring(0, 200) + '...',
        iteration: currentState.currentIteration
      };
    }
    
    if (query.includes('area') && (query.includes('triangle') || query.includes('rectangle') || query.includes('circle'))) {
      return {
        type: 'tool_call',
        toolName: 'area-calculator',
        parameters: this.extractAreaParameters(query),
        description: 'Calculate geometric area',
        reasoning: reasoning.substring(0, 200) + '...',
        iteration: currentState.currentIteration
      };
    }
    
    if (query.includes('percentage') || query.includes('percent') || query.includes('%')) {
      return {
        type: 'tool_call',
        toolName: 'percentage-calculator',
        parameters: this.extractPercentageParameters(query),
        description: 'Calculate percentage',
        reasoning: reasoning.substring(0, 200) + '...',
        iteration: currentState.currentIteration
      };
    }
    
    if (query.includes('flight') || query.includes('flights')) {
      return {
        type: 'tool_call',
        toolName: 'flight-service',
        parameters: this.extractFlightParameters(query),
        description: 'Search for flights',
        reasoning: reasoning.substring(0, 200) + '...',
        iteration: currentState.currentIteration
      };
    }
    
    return null;
  }

  /**
   * Extract weather parameters from query
   * @param {string} query - User query
   * @returns {Object} - Weather parameters
   */
  extractWeatherParameters(query) {
    // Simple parameter extraction - in a full implementation, this would use NLP
    const locationMatch = query.match(/weather in ([^?]+)/i) || query.match(/weather for ([^?]+)/i);
    const location = locationMatch ? locationMatch[1].trim() : 'New York';
    
    return {
      location: location,
      units: 'celsius',
      include_forecast: false
    };
  }

  /**
   * Extract area calculation parameters from query
   * @param {string} query - User query
   * @returns {Object} - Area parameters
   */
  extractAreaParameters(query) {
    const params = { shape: 'triangle' };
    
    if (query.includes('triangle')) {
      params.shape = 'triangle';
      // Look for dimensions
      const sideMatch = query.match(/side length of (\d+(?:\.\d+)?)/i);
      if (sideMatch) {
        const side = parseFloat(sideMatch[1]);
        params.base = side;
        params.height = side * Math.sqrt(3) / 2; // For equilateral triangle
      } else {
        params.base = 5;
        params.height = 4;
      }
    } else if (query.includes('rectangle')) {
      params.shape = 'rectangle';
      params.width = 5;
      params.height = 3;
    } else if (query.includes('circle')) {
      params.shape = 'circle';
      params.radius = 3;
    }
    
    return params;
  }

  /**
   * Extract percentage parameters from query
   * @param {string} query - User query
   * @returns {Object} - Percentage parameters
   */
  extractPercentageParameters(query) {
    return {
      operation: 'what_percentage',
      value: 25,
      total: 100
    };
  }

  /**
   * Extract flight parameters from query
   * @param {string} query - User query
   * @returns {Object} - Flight parameters
   */
  extractFlightParameters(query) {
    return {
      from: 'NYC',
      to: 'LAX',
      date: '2024-12-15',
      passengers: 1
    };
  }

  /**
   * Execute a tool action
   * @param {Object} action - Action with tool execution details
   * @returns {Promise<Object>} - Tool execution result
   */
  async executeToolAction(action) {
    if (!this.toolManager || !action.toolName) {
      return {
        success: false,
        error: 'Tool manager not available or tool name missing'
      };
    }

    try {
      console.log(`Executing tool: ${action.toolName} with parameters:`, action.parameters);
      
      const result = await this.toolManager.executeToolWithObservations(
        action.toolName,
        action.parameters,
        { timeout: 10000 }
      );

      console.log(`Tool execution result:`, result.success ? 'Success' : 'Failed');
      
      return result;

    } catch (error) {
      console.error(`Tool execution error for ${action.toolName}:`, error);
      
      return {
        success: false,
        error: error.message,
        toolName: action.toolName
      };
    }
  }

  /**
   * Create environmental observation with ground truth feedback
   * @param {string} reasoning - Current reasoning
   * @param {Object} action - Planned action
   * @param {Object} feedbackContext - Environmental feedback context
   * @param {Object} toolExecutionResult - Tool execution result (optional)
   * @returns {Object} - Environmental observation
   */
  createEnvironmentalObservation(reasoning, action, feedbackContext, toolExecutionResult = null) {
    const currentState = this.agentState.getState();
    
    let observationContent = `Iteration ${currentState.currentIteration}: Environmental feedback integrated into reasoning and action planning`;
    
    // Add tool execution information if available
    if (toolExecutionResult && action.type === 'tool_call') {
      if (toolExecutionResult.success) {
        observationContent += `\nTool execution successful: ${action.toolName}`;
        if (toolExecutionResult.result && toolExecutionResult.result.data) {
          observationContent += `\nTool result: ${JSON.stringify(toolExecutionResult.result.data).substring(0, 200)}`;
        }
      } else {
        observationContent += `\nTool execution failed: ${action.toolName} - ${toolExecutionResult.error}`;
      }
    }
    
    // Create observation that captures environmental ground truth
    const observation = this.observationGenerator.createProgressObservation(
      observationContent,
      {
        reasoningLength: reasoning.length,
        actionType: action.type,
        toolExecution: toolExecutionResult ? {
          toolName: action.toolName,
          success: toolExecutionResult.success,
          hasResult: !!toolExecutionResult.result
        } : null,
        environmentalFeedback: {
          observationsProcessed: feedbackContext.feedbackSummary?.totalObservations || 0,
          insightsGenerated: feedbackContext.actionableInsights?.length || 0,
          environmentalState: feedbackContext.environmentalState?.stability || 'unknown',
          confidenceAdjustment: feedbackContext.confidenceAdjustment?.adjustment || 0
        }
      }
    );
    
    // Add ground truth about environmental integration
    observation.groundTruth = {
      ...observation.groundTruth,
      environmentalFeedbackIntegrated: true,
      feedbackQuality: feedbackContext.feedbackSummary?.totalObservations > 0 ? 'available' : 'limited',
      actionInfluencedByEnvironment: feedbackContext.recommendedActions?.length > 0,
      toolExecuted: toolExecutionResult !== null,
      toolSuccess: toolExecutionResult ? toolExecutionResult.success : false
    };
    
    return observation;
  }

  /**
   * Update confidence based on environmental feedback
   * @param {Object} feedbackContext - Environmental feedback context
   */
  updateConfidenceFromFeedback(feedbackContext) {
    const currentState = this.agentState.getState();
    
    // Base confidence calculation
    const progressFactor = currentState.currentIteration / currentState.maxIterations;
    const reasoningQuality = currentState.reasoning.length > 0 ? 0.3 : 0;
    let baseConfidence = Math.min(0.9, progressFactor * 0.5 + reasoningQuality);
    
    // Apply environmental feedback adjustment
    if (feedbackContext.confidenceAdjustment) {
      baseConfidence += feedbackContext.confidenceAdjustment.adjustment;
      baseConfidence = Math.max(0.1, Math.min(0.95, baseConfidence));
    }
    
    // Additional adjustment based on environmental state
    if (feedbackContext.environmentalState) {
      switch (feedbackContext.environmentalState.stability) {
        case 'stable':
          baseConfidence += 0.05;
          break;
        case 'unstable':
          baseConfidence -= 0.1;
          break;
        case 'somewhat_unstable':
          baseConfidence -= 0.05;
          break;
      }
    }
    
    const finalConfidence = Math.max(0.1, Math.min(0.95, baseConfidence));
    this.agentState.updateConfidence(finalConfidence);
    
    console.log(`Confidence updated to ${finalConfidence.toFixed(3)} based on environmental feedback`);
  }

  /**
   * Generate final response from agent state
   * @returns {Object} - Final agent response
   */
  generateFinalResponse() {
    const currentState = this.agentState.getState();
    
    // Compile final answer from reasoning
    const finalAnswer = this.compileFinalAnswer();
    
    // Extract tools used from actions
    const toolsUsed = currentState.actions
      .filter(action => action.type === 'tool_call' && action.toolName)
      .map(action => action.toolName);

    return {
      success: true,
      reasoning: currentState.reasoning.map(r => r.content),
      actions: currentState.actions,
      observations: currentState.observations,
      finalAnswer: finalAnswer,
      agentMode: true,
      iterations: currentState.currentIteration,
      toolsUsed: toolsUsed,
      finalConfidence: currentState.confidence,
      strategy: currentState.strategy,
      executionTime: currentState.executionTime,
      status: currentState.status,
      sessionId: currentState.sessionId
    };
  }

  /**
   * Compile final answer from reasoning chain
   * @returns {string} - Final answer
   */
  compileFinalAnswer() {
    const currentState = this.agentState.getState();
    
    if (currentState.reasoning.length === 0) {
      return "I wasn't able to generate a complete analysis for your query.";
    }

    // Look for tool execution results in observations
    const toolResults = currentState.observations
      .filter(obs => obs.data && obs.data.toolExecution && obs.data.toolExecution.success)
      .map(obs => obs.data.toolExecution);

    let answer = `Based on my analysis of "${currentState.originalQuery}":`;
    
    // Include tool results if available
    if (toolResults.length > 0) {
      answer += '\n\nResults from tool execution:';
      toolResults.forEach((toolResult, index) => {
        answer += `\n${index + 1}. ${toolResult.toolName}: `;
        // Extract meaningful result from the observation content
        const observation = currentState.observations.find(obs => 
          obs.data && obs.data.toolExecution && obs.data.toolExecution.toolName === toolResult.toolName
        );
        if (observation && observation.content.includes('Tool result:')) {
          const resultMatch = observation.content.match(/Tool result: (.+)/);
          if (resultMatch) {
            answer += resultMatch[1];
          }
        }
      });
    }

    const lastReasoning = currentState.reasoning[currentState.reasoning.length - 1];
    answer += `\n\nConclusion: ${lastReasoning.content}`;
    
    return answer;
  }

  /**
   * Reset agent to initial state
   */
  resetAgent() {
    this.agentState.reset();
    this.isRunning = false;
    console.log('Agent reset to initial state');
  }

  /**
   * Get current agent status
   * @returns {Object} - Agent status information
   */
  getAgentStatus() {
    const currentState = this.agentState.getState();
    return {
      isRunning: this.isRunning,
      currentIteration: currentState.currentIteration,
      maxIterations: currentState.maxIterations,
      status: currentState.status,
      confidence: currentState.confidence,
      startTime: currentState.startTime,
      lastUpdate: currentState.lastUpdate,
      sessionId: currentState.sessionId
    };
  }

  /**
   * Get agent summary for debugging
   * @returns {Object} - Agent summary
   */
  getAgentSummary() {
    return this.agentState.getSummary();
  }

  /**
   * Create progress assessment based on environmental responses
   * @returns {Object} - Progress assessment
   */
  createProgressAssessment() {
    const currentState = this.agentState.getState();
    return this.feedbackIntegrator.createProgressAssessment(currentState.observations, currentState);
  }

  /**
   * Get environmental feedback summary
   * @returns {Object} - Environmental feedback summary
   */
  getEnvironmentalFeedbackSummary() {
    const currentState = this.agentState.getState();
    const feedbackContext = this.integrateFeedbackIntoContext();
    
    return {
      totalObservations: currentState.observations.length,
      feedbackSummary: feedbackContext.feedbackSummary,
      environmentalState: feedbackContext.environmentalState,
      progressAssessment: this.createProgressAssessment(),
      lastFeedbackIntegration: new Date()
    };
  }

  /**
   * Detect and recover from errors using environmental feedback
   * @returns {Object} - Error recovery plan
   */
  async detectAndRecoverFromErrors() {
    const currentState = this.agentState.getState();
    const observations = currentState.observations;

    // Detect errors from environmental feedback
    const detectedErrors = this.errorRecoverySystem.detectErrorsFromFeedback(observations, currentState);

    if (detectedErrors.length === 0) {
      return {
        strategies: [],
        totalErrors: 0,
        recoverableErrors: 0,
        prioritizedActions: []
      };
    }

    console.log(`Detected ${detectedErrors.length} errors from environmental feedback`);

    // Implement recovery strategies
    const recoveryPlan = this.errorRecoverySystem.implementRecoveryStrategies(detectedErrors, currentState);

    // Apply confidence adjustment from error recovery
    if (recoveryPlan.confidenceAdjustment !== 0) {
      const currentConfidence = currentState.confidence;
      const newConfidence = Math.max(0.1, Math.min(0.95, currentConfidence + recoveryPlan.confidenceAdjustment));
      this.agentState.updateConfidence(newConfidence);
      
      console.log(`Confidence adjusted by ${recoveryPlan.confidenceAdjustment.toFixed(3)} due to error recovery`);
    }

    // Record recovery attempts
    recoveryPlan.strategies.forEach(strategy => {
      this.errorRecoverySystem.recordRecoveryAttempt(
        strategy.errorClassification,
        strategy.action,
        false // Will be updated when recovery is actually attempted
      );
    });

    return recoveryPlan;
  }

  /**
   * Execute error recovery action
   * @param {Object} recoveryAction - Recovery action to execute
   * @returns {Object} - Recovery result
   */
  async executeErrorRecovery(recoveryAction) {
    console.log(`Executing error recovery: ${recoveryAction.type}`);

    try {
      let recoveryResult = {
        success: false,
        action: recoveryAction.type,
        message: 'Recovery not implemented',
        observations: []
      };

      switch (recoveryAction.type) {
        case 'tool_recovery':
          recoveryResult = await this.executeToolRecovery(recoveryAction);
          break;
        case 'parameter_recovery':
          recoveryResult = await this.executeParameterRecovery(recoveryAction);
          break;
        case 'network_recovery':
          recoveryResult = await this.executeNetworkRecovery(recoveryAction);
          break;
        case 'strategy_recovery':
          recoveryResult = await this.executeStrategyRecovery(recoveryAction);
          break;
        case 'resource_recovery':
          recoveryResult = await this.executeResourceRecovery(recoveryAction);
          break;
        default:
          recoveryResult.message = `Unknown recovery type: ${recoveryAction.type}`;
      }

      // Create observation for recovery attempt
      const recoveryObservation = this.observationGenerator.createProgressObservation(
        `Error recovery attempted: ${recoveryAction.type} - ${recoveryResult.success ? 'Success' : 'Failed'}`,
        {
          recoveryType: recoveryAction.type,
          success: recoveryResult.success,
          message: recoveryResult.message,
          actions: recoveryAction.actions
        }
      );

      this.agentState.addObservation(recoveryObservation);

      return recoveryResult;

    } catch (error) {
      console.error('Error during recovery execution:', error);
      
      const errorObservation = this.observationGenerator.createErrorObservation(
        error,
        `error recovery execution for ${recoveryAction.type}`
      );
      
      this.agentState.addObservation(errorObservation);

      return {
        success: false,
        action: recoveryAction.type,
        message: `Recovery failed: ${error.message}`,
        error: error
      };
    }
  }

  /**
   * Execute tool recovery strategy
   * @param {Object} recoveryAction - Tool recovery action
   * @returns {Object} - Recovery result
   */
  async executeToolRecovery(recoveryAction) {
    // For now, simulate tool recovery by creating appropriate observations
    // In a full implementation, this would attempt alternative tools or parameter adjustments
    
    const actions = recoveryAction.actions || [];
    const results = [];

    for (const action of actions) {
      if (action.action === 'try_alternative_tool') {
        results.push({
          action: action.action,
          success: true,
          message: `Alternative tool strategy planned for ${action.parameters.failedTool}`
        });
      } else if (action.action === 'adjust_parameters') {
        results.push({
          action: action.action,
          success: true,
          message: 'Parameter adjustment strategy planned'
        });
      }
    }

    return {
      success: true,
      action: 'tool_recovery',
      message: 'Tool recovery strategies planned',
      results: results
    };
  }

  /**
   * Execute parameter recovery strategy
   * @param {Object} recoveryAction - Parameter recovery action
   * @returns {Object} - Recovery result
   */
  async executeParameterRecovery(recoveryAction) {
    return {
      success: true,
      action: 'parameter_recovery',
      message: 'Parameter validation and correction strategy planned',
      details: recoveryAction.actions
    };
  }

  /**
   * Execute network recovery strategy
   * @param {Object} recoveryAction - Network recovery action
   * @returns {Object} - Recovery result
   */
  async executeNetworkRecovery(recoveryAction) {
    return {
      success: true,
      action: 'network_recovery',
      message: 'Network retry and fallback strategies planned',
      details: recoveryAction.actions
    };
  }

  /**
   * Execute strategy recovery (change approach)
   * @param {Object} recoveryAction - Strategy recovery action
   * @returns {Object} - Recovery result
   */
  async executeStrategyRecovery(recoveryAction) {
    // Update agent strategy based on recovery action
    const currentState = this.agentState.getState();
    const newStrategy = this.determineNewStrategy(currentState.strategy, recoveryAction);
    
    // Update agent state with new strategy
    this.agentState.state.strategy = newStrategy;
    
    return {
      success: true,
      action: 'strategy_recovery',
      message: `Strategy changed from ${currentState.strategy} to ${newStrategy}`,
      oldStrategy: currentState.strategy,
      newStrategy: newStrategy
    };
  }

  /**
   * Execute resource recovery strategy
   * @param {Object} recoveryAction - Resource recovery action
   * @returns {Object} - Recovery result
   */
  async executeResourceRecovery(recoveryAction) {
    return {
      success: true,
      action: 'resource_recovery',
      message: 'Resource optimization strategies planned',
      details: recoveryAction.actions
    };
  }

  /**
   * Determine new strategy based on current strategy and failure patterns
   * @param {string} currentStrategy - Current strategy
   * @param {Object} recoveryAction - Recovery action details
   * @returns {string} - New strategy
   */
  determineNewStrategy(currentStrategy, recoveryAction) {
    const strategies = ['default', 'conservative', 'aggressive', 'exploratory', 'focused'];
    
    // Simple strategy rotation for MVP
    const currentIndex = strategies.indexOf(currentStrategy);
    const nextIndex = (currentIndex + 1) % strategies.length;
    
    return strategies[nextIndex];
  }

  /**
   * Process environmental feedback from external source
   * @param {Object} environmentalData - External environmental data
   * @returns {Object} - Processed feedback observation
   */
  processEnvironmentalFeedback(environmentalData) {
    let observation;
    
    switch (environmentalData.type) {
      case 'tool_execution':
        observation = this.observationGenerator.createEnvironmentalGroundTruthObservation(environmentalData);
        break;
      case 'state_change':
        observation = this.observationGenerator.createEnvironmentalStateChangeObservation(environmentalData);
        break;
      case 'validation':
        observation = this.observationGenerator.createValidationObservation(environmentalData);
        break;
      default:
        observation = this.observationGenerator.createEnvironmentObservation(
          environmentalData.description || 'Unknown environmental feedback',
          environmentalData
        );
    }
    
    this.agentState.addObservation(observation);
    console.log(`Environmental feedback processed: ${observation.type}`);
    
    return observation;
  }

  /**
   * Get error recovery system status
   * @returns {Object} - Error recovery status
   */
  getErrorRecoveryStatus() {
    return this.errorRecoverySystem.getRecoveryStatus();
  }

  /**
   * Set autonomous operation mode
   * @param {string} mode - Operation mode ('autonomous', 'supervised', 'manual')
   */
  setAutonomousMode(mode) {
    this.autonomousOperationManager.setOperationMode(mode);
    console.log(`Agent autonomous mode set to: ${mode}`);
  }

  /**
   * Set tool execution dependencies (called by integrated system)
   * @param {Object} toolManager - Tool manager instance
   * @param {Object} enhancedAIService - Enhanced AI service instance
   */
  setToolExecutionCapabilities(toolManager, enhancedAIService) {
    this.toolManager = toolManager;
    this.enhancedAIService = enhancedAIService;
    console.log('Agent controller configured with tool execution capabilities');
  }

  /**
   * Resume agent operation after human input
   * @param {string} checkpointId - Checkpoint ID to resolve
   * @param {Object} humanInput - Human input/guidance
   * @returns {Promise<Object>} - Continued processing result
   */
  async resumeAfterHumanInput(checkpointId, humanInput = {}) {
    try {
      // Resolve the checkpoint
      this.humanInteractionManager.resolveCheckpoint(checkpointId, humanInput);
      this.agentState.resolveHumanCheckpoint(humanInput);
      
      console.log(`Resuming agent operation after human input (checkpoint: ${checkpointId})`);
      
      // Apply human guidance if provided
      if (humanInput.guidance) {
        this.applyHumanGuidance(humanInput.guidance);
      }
      
      // Continue processing from current state
      return await this.continueProcessing();
      
    } catch (error) {
      console.error('Error resuming after human input:', error);
      this.agentState.addError(error, { phase: 'human_input_resume', checkpointId });
      throw error;
    }
  }

  /**
   * Continue processing from current state
   * @returns {Promise<Object>} - Processing result
   */
  async continueProcessing() {
    if (!this.agentState.shouldContinue()) {
      return this.generateFinalResponse();
    }
    
    this.isRunning = true;
    
    // Continue the main processing loop
    while (this.shouldContinueLoop()) {
      this.agentState.incrementIteration();
      const currentState = this.agentState.getState();

      console.log(`Agent continuing iteration ${currentState.currentIteration}/${currentState.maxIterations}`);

      // Follow the same processing steps as main loop
      const errorRecoveryPlan = await this.detectAndRecoverFromErrors();
      const feedbackContext = this.integrateFeedbackIntoContext();
      if (errorRecoveryPlan.strategies.length > 0) {
        feedbackContext.errorRecoveryPlan = errorRecoveryPlan;
      }

      const reasoning = await this.generateReasoning(feedbackContext);
      this.agentState.addReasoning(reasoning);

      // Check autonomous operation decision
      const autonomousDecision = this.autonomousOperationManager.shouldContinueAutonomously(
        this.agentState.getState(), 
        { feedbackContext, errorRecoveryPlan }
      );
      
      if (!autonomousDecision.shouldContinue) {
        // Create another checkpoint if needed
        const checkpoint = this.humanInteractionManager.createCheckpoint(
          autonomousDecision.trigger || 'autonomous_decision',
          this.agentState.getState(),
          { decision: autonomousDecision }
        );
        
        this.agentState.addHumanCheckpoint(autonomousDecision.reason, {
          checkpointId: checkpoint.id
        });
        
        break;
      }

      // Check stopping conditions
      const stoppingDecision = this.stoppingConditions.evaluate(this.agentState.getState());
      if (stoppingDecision.shouldStop) {
        console.log(`Agent stopping: ${stoppingDecision.reason}`);
        this.agentState.updateStatus('completed', stoppingDecision.reason);
        break;
      }

      // Check task completion
      const completionDetection = this.autonomousOperationManager.detectTaskCompletion(
        this.agentState.getState(),
        { feedbackContext, errorRecoveryPlan }
      );
      
      if (completionDetection.isComplete) {
        console.log(`Task completion detected: ${completionDetection.reason}`);
        this.agentState.updateStatus('completed', 'autonomous_completion');
        this.agentState.updateConfidence(completionDetection.confidence);
        break;
      }

      // Continue with action planning and observation
      const plannedAction = this.planNextAction(reasoning, feedbackContext);
      this.agentState.addAction(plannedAction);

      const observation = this.createEnvironmentalObservation(reasoning, plannedAction, feedbackContext);
      this.agentState.addObservation(observation);

      this.updateConfidenceFromFeedback(feedbackContext);
    }

    this.isRunning = false;
    return this.generateFinalResponse();
  }

  /**
   * Apply human guidance to agent state
   * @param {Object} guidance - Human guidance
   */
  applyHumanGuidance(guidance) {
    if (guidance.strategy) {
      this.agentState.state.strategy = guidance.strategy;
      console.log(`Strategy updated based on human guidance: ${guidance.strategy}`);
    }
    
    if (guidance.confidence) {
      this.agentState.updateConfidence(guidance.confidence);
      console.log(`Confidence updated based on human guidance: ${guidance.confidence}`);
    }
    
    if (guidance.maxIterations) {
      this.agentState.state.maxIterations = guidance.maxIterations;
      console.log(`Max iterations updated based on human guidance: ${guidance.maxIterations}`);
    }
    
    if (guidance.reasoning) {
      this.agentState.addReasoning(guidance.reasoning, { source: 'human_guidance' });
      console.log('Human reasoning guidance added to agent state');
    }
  }

  /**
   * Get current autonomous operation status
   * @returns {Object} - Autonomous operation status
   */
  getAutonomousOperationStatus() {
    const agentState = this.agentState.getState();
    const autonomousConfig = this.autonomousOperationManager.getConfiguration();
    
    return {
      operationMode: autonomousConfig.operationMode,
      isRunning: this.isRunning,
      awaitingHumanInput: agentState.awaitingHumanInput,
      checkpointCount: agentState.humanCheckpoints.length,
      decisionHistory: this.autonomousOperationManager.getDecisionHistory(),
      blockers: this.humanInteractionManager.getBlockers(),
      lastDecision: this.autonomousOperationManager.getDecisionHistory().slice(-1)[0] || null
    };
  }

  /**
   * Get human interaction status
   * @returns {Object} - Human interaction status
   */
  getHumanInteractionStatus() {
    return {
      checkpoints: this.humanInteractionManager.getCheckpoints(),
      blockers: this.humanInteractionManager.getBlockers(),
      communicationHistory: this.humanInteractionManager.getCommunicationHistory(),
      pendingCheckpoints: this.humanInteractionManager.getCheckpoints().filter(c => c.status === 'pending'),
      awaitingInput: this.agentState.getState().awaitingHumanInput
    };
  }

  /**
   * Configure autonomous operation parameters
   * @param {Object} config - Configuration options
   */
  configureAutonomousOperation(config = {}) {
    if (config.operationMode) {
      this.autonomousOperationManager.setOperationMode(config.operationMode);
    }
    
    if (config.thresholds) {
      this.autonomousOperationManager.configureThresholds(config.thresholds);
    }
    
    if (config.humanInteraction) {
      this.humanInteractionManager.configure(config.humanInteraction);
    }
    
    console.log('Autonomous operation configured:', config);
  }

  /**
   * Configure agent parameters
   * @param {Object} config - Configuration options
   */
  configure(config = {}) {
    // Handle autonomous operation configuration
    if (config.autonomous) {
      this.configureAutonomousOperation(config.autonomous);
    }
    
    // Configuration will be handled during initialization
    console.log('Agent configuration updated:', config);
  }
}

export default AgentController;