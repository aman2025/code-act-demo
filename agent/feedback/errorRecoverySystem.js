/**
 * Error Recovery System - Implements error recovery through environmental feedback
 * Detects errors, analyzes patterns, and implements recovery strategies
 */

class ErrorRecoverySystem {
  constructor() {
    this.recoveryStrategies = new Map();
    this.errorPatterns = new Map();
    this.recoveryHistory = [];
    this.maxRecoveryAttempts = 3;
    
    this.initializeRecoveryStrategies();
  }

  /**
   * Initialize built-in recovery strategies
   */
  initializeRecoveryStrategies() {
    // Tool execution failure recovery
    this.recoveryStrategies.set('tool_execution_failed', {
      name: 'Tool Execution Recovery',
      priority: 0.9,
      strategy: this.recoverFromToolFailure.bind(this),
      conditions: ['tool_execution_error', 'tool_not_found', 'invalid_parameters']
    });

    // Parameter validation failure recovery
    this.recoveryStrategies.set('parameter_validation_failed', {
      name: 'Parameter Validation Recovery',
      priority: 0.8,
      strategy: this.recoverFromParameterFailure.bind(this),
      conditions: ['invalid_parameters', 'missing_parameters', 'parameter_type_error']
    });

    // Network/connectivity failure recovery
    this.recoveryStrategies.set('network_failure', {
      name: 'Network Failure Recovery',
      priority: 0.7,
      strategy: this.recoverFromNetworkFailure.bind(this),
      conditions: ['network_error', 'timeout_error', 'connection_failed']
    });

    // Strategy adaptation recovery
    this.recoveryStrategies.set('strategy_ineffective', {
      name: 'Strategy Adaptation Recovery',
      priority: 0.6,
      strategy: this.recoverFromStrategyFailure.bind(this),
      conditions: ['repeated_failures', 'no_progress', 'strategy_stagnation']
    });

    // Resource exhaustion recovery
    this.recoveryStrategies.set('resource_exhaustion', {
      name: 'Resource Exhaustion Recovery',
      priority: 0.5,
      strategy: this.recoverFromResourceExhaustion.bind(this),
      conditions: ['memory_limit', 'time_limit', 'iteration_limit']
    });
  }

  /**
   * Detect errors from environmental feedback
   * @param {Array} observations - Recent observations
   * @param {Object} currentState - Current agent state
   * @returns {Array} - Detected errors with context
   */
  detectErrorsFromFeedback(observations, currentState) {
    const detectedErrors = [];
    
    // Analyze recent observations for error patterns
    const recentErrors = observations.filter(obs => obs.type === 'error');
    
    recentErrors.forEach(errorObs => {
      const errorContext = this.analyzeErrorContext(errorObs, observations, currentState);
      const errorClassification = this.classifyError(errorObs, errorContext);
      
      detectedErrors.push({
        observation: errorObs,
        context: errorContext,
        classification: errorClassification,
        severity: this.assessErrorSeverity(errorObs, errorContext),
        recoverable: this.isErrorRecoverable(errorClassification),
        timestamp: errorObs.timestamp
      });
    });

    // Detect pattern-based errors (repeated failures, stagnation, etc.)
    const patternErrors = this.detectPatternBasedErrors(observations, currentState);
    detectedErrors.push(...patternErrors);

    return detectedErrors.sort((a, b) => b.severity - a.severity);
  }

  /**
   * Analyze error context from surrounding observations
   * @param {Object} errorObservation - Error observation
   * @param {Array} allObservations - All observations
   * @param {Object} currentState - Current agent state
   * @returns {Object} - Error context
   */
  analyzeErrorContext(errorObservation, allObservations, currentState) {
    const errorIndex = allObservations.indexOf(errorObservation);
    const contextWindow = 3;
    
    const precedingObservations = allObservations.slice(
      Math.max(0, errorIndex - contextWindow), 
      errorIndex
    );
    
    const followingObservations = allObservations.slice(
      errorIndex + 1, 
      Math.min(allObservations.length, errorIndex + contextWindow + 1)
    );

    return {
      precedingObservations,
      followingObservations,
      iteration: currentState.currentIteration,
      toolInvolved: errorObservation.toolName,
      errorData: errorObservation.data,
      groundTruth: errorObservation.groundTruth,
      relatedActions: this.findRelatedActions(errorObservation, currentState.actions)
    };
  }

  /**
   * Classify error type for recovery strategy selection
   * @param {Object} errorObservation - Error observation
   * @param {Object} errorContext - Error context
   * @returns {string} - Error classification
   */
  classifyError(errorObservation, errorContext) {
    // Tool-related errors
    if (errorObservation.toolName) {
      if (errorObservation.groundTruth?.toolFailed) {
        return 'tool_execution_failed';
      }
      if (errorObservation.data?.errorName === 'ValidationError') {
        return 'parameter_validation_failed';
      }
    }

    // Network-related errors
    if (errorObservation.data?.errorName === 'NetworkError' || 
        errorObservation.data?.errorName === 'TimeoutError') {
      return 'network_failure';
    }

    // Resource-related errors
    if (errorObservation.data?.context?.includes('limit') ||
        errorObservation.data?.context?.includes('exhausted')) {
      return 'resource_exhaustion';
    }

    // Pattern-based errors
    if (errorContext.precedingObservations.filter(obs => obs.type === 'error').length >= 2) {
      return 'strategy_ineffective';
    }

    return 'unknown_error';
  }

  /**
   * Assess error severity for prioritization
   * @param {Object} errorObservation - Error observation
   * @param {Object} errorContext - Error context
   * @returns {number} - Severity score (0-1)
   */
  assessErrorSeverity(errorObservation, errorContext) {
    let severity = 0.5; // Base severity

    // Increase severity for tool failures
    if (errorObservation.toolName) {
      severity += 0.2;
    }

    // Increase severity for repeated errors
    const recentErrorCount = errorContext.precedingObservations.filter(obs => obs.type === 'error').length;
    severity += recentErrorCount * 0.1;

    // Increase severity based on confidence
    if (errorObservation.confidence > 0.8) {
      severity += 0.1;
    }

    // Increase severity if error blocks progress
    if (errorContext.followingObservations.length === 0) {
      severity += 0.2;
    }

    return Math.min(1.0, severity);
  }

  /**
   * Check if error is recoverable
   * @param {string} errorClassification - Error classification
   * @returns {boolean} - Whether error is recoverable
   */
  isErrorRecoverable(errorClassification) {
    const recoverableErrors = [
      'tool_execution_failed',
      'parameter_validation_failed',
      'network_failure',
      'strategy_ineffective'
    ];
    
    return recoverableErrors.includes(errorClassification);
  }

  /**
   * Detect pattern-based errors from observation history
   * @param {Array} observations - All observations
   * @param {Object} currentState - Current agent state
   * @returns {Array} - Pattern-based errors
   */
  detectPatternBasedErrors(observations, currentState) {
    const patternErrors = [];

    // Detect repeated tool failures
    const toolFailures = this.detectRepeatedToolFailures(observations);
    if (toolFailures.length > 0) {
      patternErrors.push({
        classification: 'strategy_ineffective',
        context: { pattern: 'repeated_tool_failures', failures: toolFailures },
        severity: 0.8,
        recoverable: true,
        timestamp: new Date(),
        observation: {
          type: 'error',
          content: `Pattern detected: Repeated failures with tools ${toolFailures.join(', ')}`,
          data: { pattern: 'repeated_tool_failures', tools: toolFailures }
        }
      });
    }

    // Detect progress stagnation
    const stagnation = this.detectProgressStagnation(observations);
    if (stagnation.detected) {
      patternErrors.push({
        classification: 'strategy_ineffective',
        context: { pattern: 'progress_stagnation', details: stagnation },
        severity: 0.7,
        recoverable: true,
        timestamp: new Date(),
        observation: {
          type: 'error',
          content: 'Pattern detected: Progress stagnation with similar observations',
          data: { pattern: 'progress_stagnation', details: stagnation }
        }
      });
    }

    return patternErrors;
  }

  /**
   * Implement recovery strategies based on detected errors
   * @param {Array} detectedErrors - Detected errors
   * @param {Object} currentState - Current agent state
   * @returns {Object} - Recovery plan
   */
  implementRecoveryStrategies(detectedErrors, currentState) {
    const recoveryPlan = {
      strategies: [],
      totalErrors: detectedErrors.length,
      recoverableErrors: detectedErrors.filter(e => e.recoverable).length,
      prioritizedActions: [],
      confidenceAdjustment: 0,
      strategyChanges: []
    };

    // Process each recoverable error
    const recoverableErrors = detectedErrors.filter(e => e.recoverable);
    
    for (const error of recoverableErrors) {
      const strategy = this.recoveryStrategies.get(error.classification);
      
      if (strategy && this.canAttemptRecovery(error, currentState)) {
        const recoveryAction = strategy.strategy(error, currentState);
        
        if (recoveryAction) {
          recoveryPlan.strategies.push({
            errorClassification: error.classification,
            strategyName: strategy.name,
            action: recoveryAction,
            priority: strategy.priority,
            expectedOutcome: recoveryAction.expectedOutcome
          });

          // Add to prioritized actions
          recoveryPlan.prioritizedActions.push(recoveryAction);
        }
      }
    }

    // Sort strategies by priority
    recoveryPlan.strategies.sort((a, b) => b.priority - a.priority);
    recoveryPlan.prioritizedActions.sort((a, b) => b.priority - a.priority);

    // Calculate confidence adjustment
    recoveryPlan.confidenceAdjustment = this.calculateRecoveryConfidenceAdjustment(
      detectedErrors, 
      recoveryPlan.strategies
    );

    return recoveryPlan;
  }

  /**
   * Check if recovery can be attempted for this error
   * @param {Object} error - Detected error
   * @param {Object} currentState - Current agent state
   * @returns {boolean} - Whether recovery can be attempted
   */
  canAttemptRecovery(error, currentState) {
    // Check if we've exceeded max recovery attempts
    const errorType = error.classification;
    const recentRecoveries = this.recoveryHistory.filter(r => 
      r.errorType === errorType && 
      (new Date() - r.timestamp) < 300000 // 5 minutes
    );

    return recentRecoveries.length < this.maxRecoveryAttempts;
  }

  /**
   * Recovery strategy: Tool execution failure
   * @param {Object} error - Error details
   * @param {Object} currentState - Current agent state
   * @returns {Object} - Recovery action
   */
  recoverFromToolFailure(error, currentState) {
    const failedTool = error.observation.toolName;
    
    return {
      type: 'tool_recovery',
      description: `Recover from ${failedTool} failure by trying alternative approach`,
      priority: 0.9,
      actions: [
        {
          action: 'try_alternative_tool',
          details: `Find alternative to ${failedTool}`,
          parameters: { failedTool, errorContext: error.context }
        },
        {
          action: 'adjust_parameters',
          details: 'Modify parameters based on error feedback',
          parameters: { originalError: error.observation.data }
        }
      ],
      expectedOutcome: 'Tool execution succeeds with alternative approach',
      confidenceImpact: 0.1,
      learningOpportunity: true
    };
  }

  /**
   * Recovery strategy: Parameter validation failure
   * @param {Object} error - Error details
   * @param {Object} currentState - Current agent state
   * @returns {Object} - Recovery action
   */
  recoverFromParameterFailure(error, currentState) {
    return {
      type: 'parameter_recovery',
      description: 'Recover from parameter validation failure',
      priority: 0.8,
      actions: [
        {
          action: 'validate_and_correct_parameters',
          details: 'Analyze and correct parameter issues',
          parameters: { errorDetails: error.observation.data }
        },
        {
          action: 'request_parameter_clarification',
          details: 'Request clarification for ambiguous parameters',
          parameters: { validationError: error.observation }
        }
      ],
      expectedOutcome: 'Parameters validated and tool execution succeeds',
      confidenceImpact: 0.05,
      learningOpportunity: true
    };
  }

  /**
   * Recovery strategy: Network failure
   * @param {Object} error - Error details
   * @param {Object} currentState - Current agent state
   * @returns {Object} - Recovery action
   */
  recoverFromNetworkFailure(error, currentState) {
    return {
      type: 'network_recovery',
      description: 'Recover from network connectivity issues',
      priority: 0.7,
      actions: [
        {
          action: 'retry_with_backoff',
          details: 'Retry operation with exponential backoff',
          parameters: { retryCount: 3, backoffMultiplier: 2 }
        },
        {
          action: 'use_cached_data',
          details: 'Fall back to cached data if available',
          parameters: { cacheKey: error.context.toolInvolved }
        }
      ],
      expectedOutcome: 'Network operation succeeds or graceful degradation',
      confidenceImpact: -0.05,
      learningOpportunity: false
    };
  }

  /**
   * Recovery strategy: Strategy ineffectiveness
   * @param {Object} error - Error details
   * @param {Object} currentState - Current agent state
   * @returns {Object} - Recovery action
   */
  recoverFromStrategyFailure(error, currentState) {
    return {
      type: 'strategy_recovery',
      description: 'Adapt strategy based on repeated failures',
      priority: 0.6,
      actions: [
        {
          action: 'change_strategy',
          details: 'Switch to alternative problem-solving strategy',
          parameters: { currentStrategy: currentState.strategy, failurePattern: error.context.pattern }
        },
        {
          action: 'break_down_problem',
          details: 'Break complex problem into smaller parts',
          parameters: { originalQuery: currentState.originalQuery }
        }
      ],
      expectedOutcome: 'New strategy shows improved progress',
      confidenceImpact: -0.1,
      learningOpportunity: true
    };
  }

  /**
   * Recovery strategy: Resource exhaustion
   * @param {Object} error - Error details
   * @param {Object} currentState - Current agent state
   * @returns {Object} - Recovery action
   */
  recoverFromResourceExhaustion(error, currentState) {
    return {
      type: 'resource_recovery',
      description: 'Recover from resource limitations',
      priority: 0.5,
      actions: [
        {
          action: 'optimize_resource_usage',
          details: 'Reduce resource consumption',
          parameters: { resourceType: error.context.resourceType }
        },
        {
          action: 'prioritize_essential_operations',
          details: 'Focus on most important operations only',
          parameters: { currentPriorities: currentState.priorities }
        }
      ],
      expectedOutcome: 'Operations continue within resource limits',
      confidenceImpact: -0.15,
      learningOpportunity: true
    };
  }

  /**
   * Calculate confidence adjustment based on recovery strategies
   * @param {Array} detectedErrors - Detected errors
   * @param {Array} strategies - Recovery strategies
   * @returns {number} - Confidence adjustment
   */
  calculateRecoveryConfidenceAdjustment(detectedErrors, strategies) {
    let adjustment = 0;

    // Negative adjustment for errors
    adjustment -= detectedErrors.length * 0.05;

    // Positive adjustment for available recovery strategies
    adjustment += strategies.length * 0.03;

    // Additional adjustment based on strategy confidence
    const avgStrategyConfidence = strategies.reduce((sum, s) => 
      sum + (s.action.confidenceImpact || 0), 0) / Math.max(1, strategies.length);
    
    adjustment += avgStrategyConfidence;

    return Math.max(-0.3, Math.min(0.1, adjustment));
  }

  /**
   * Record recovery attempt for history tracking
   * @param {string} errorType - Type of error
   * @param {Object} recoveryAction - Recovery action taken
   * @param {boolean} success - Whether recovery was successful
   */
  recordRecoveryAttempt(errorType, recoveryAction, success) {
    this.recoveryHistory.push({
      errorType,
      recoveryAction: recoveryAction.type,
      success,
      timestamp: new Date(),
      details: recoveryAction
    });

    // Keep history limited to recent attempts
    if (this.recoveryHistory.length > 100) {
      this.recoveryHistory = this.recoveryHistory.slice(-50);
    }
  }

  /**
   * Find actions related to an error observation
   * @param {Object} errorObservation - Error observation
   * @param {Array} actions - All actions
   * @returns {Array} - Related actions
   */
  findRelatedActions(errorObservation, actions) {
    return actions.filter(action => 
      action.timestamp <= errorObservation.timestamp &&
      (action.toolName === errorObservation.toolName ||
       action.iteration === errorObservation.iteration)
    );
  }

  /**
   * Detect repeated tool failures
   * @param {Array} observations - All observations
   * @returns {Array} - Tools with repeated failures
   */
  detectRepeatedToolFailures(observations) {
    const toolFailures = {};
    
    observations.filter(obs => obs.type === 'error' && obs.toolName).forEach(obs => {
      if (!toolFailures[obs.toolName]) {
        toolFailures[obs.toolName] = 0;
      }
      toolFailures[obs.toolName]++;
    });

    return Object.entries(toolFailures)
      .filter(([tool, count]) => count >= 2)
      .map(([tool, count]) => tool);
  }

  /**
   * Detect progress stagnation patterns
   * @param {Array} observations - All observations
   * @returns {Object} - Stagnation detection result
   */
  detectProgressStagnation(observations) {
    const progressObservations = observations.filter(obs => obs.type === 'progress');
    
    if (progressObservations.length < 3) {
      return { detected: false };
    }

    const recentProgress = progressObservations.slice(-5);
    const uniqueContent = [...new Set(recentProgress.map(obs => obs.content))];
    
    // If most recent progress observations are very similar, it indicates stagnation
    const stagnationRatio = uniqueContent.length / recentProgress.length;
    
    return {
      detected: stagnationRatio < 0.6,
      stagnationRatio,
      recentProgressCount: recentProgress.length,
      uniqueProgressCount: uniqueContent.length
    };
  }

  /**
   * Get recovery system status
   * @returns {Object} - Recovery system status
   */
  getRecoveryStatus() {
    return {
      availableStrategies: Array.from(this.recoveryStrategies.keys()),
      recoveryHistory: this.recoveryHistory.slice(-10),
      maxRecoveryAttempts: this.maxRecoveryAttempts,
      recentRecoveries: this.recoveryHistory.filter(r => 
        (new Date() - r.timestamp) < 300000
      ).length
    };
  }
}

export default ErrorRecoverySystem;