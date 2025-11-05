/**
 * Human Interaction Manager
 * Handles checkpoints, blocker detection, and communication with humans
 */

class HumanInteractionManager {
  constructor() {
    this.checkpoints = [];
    this.blockers = [];
    this.communicationHistory = [];
    this.interactionMode = 'checkpoint'; // 'checkpoint', 'continuous', 'on_demand'
    this.blockerDetectionEnabled = true;
    this.progressCommunicationEnabled = true;
  }

  /**
   * Create a human checkpoint
   * @param {string} reason - Reason for checkpoint
   * @param {Object} agentState - Current agent state
   * @param {Object} context - Additional context
   * @returns {Object} - Checkpoint object
   */
  createCheckpoint(reason, agentState, context = {}) {
    const checkpoint = {
      id: this.generateCheckpointId(),
      timestamp: new Date(),
      iteration: agentState.currentIteration,
      reason: reason,
      agentState: this.sanitizeStateForHuman(agentState),
      context: context,
      status: 'pending', // 'pending', 'resolved', 'skipped'
      humanResponse: null,
      resolutionTime: null,
      priority: this.determineCheckpointPriority(reason, agentState)
    };

    this.checkpoints.push(checkpoint);
    
    console.log(`Human checkpoint created: ${reason} (ID: ${checkpoint.id})`);
    
    return checkpoint;
  }

  /**
   * Detect if agent has encountered a blocker
   * @param {Object} agentState - Current agent state
   * @param {Object} context - Additional context
   * @returns {Object} - Blocker detection result
   */
  detectBlocker(agentState, context = {}) {
    const blockerChecks = [
      this.checkRepeatedFailures(agentState),
      this.checkLowConfidenceStagnation(agentState),
      this.checkResourceExhaustion(agentState),
      this.checkComplexityOverload(agentState, context),
      this.checkAmbiguousRequirements(agentState, context),
      this.checkSafetyConstraints(agentState, context)
    ];

    const detectedBlockers = blockerChecks.filter(check => check.isBlocker);
    
    if (detectedBlockers.length > 0) {
      const primaryBlocker = this.selectPrimaryBlocker(detectedBlockers);
      this.recordBlocker(primaryBlocker, agentState);
      
      return {
        hasBlocker: true,
        blocker: primaryBlocker,
        allBlockers: detectedBlockers,
        recommendedAction: this.getBlockerRecommendation(primaryBlocker)
      };
    }

    return {
      hasBlocker: false,
      blocker: null,
      allBlockers: [],
      recommendedAction: null
    };
  }

  /**
   * Check for repeated failures pattern
   * @param {Object} agentState - Current agent state
   * @returns {Object} - Repeated failures check result
   */
  checkRepeatedFailures(agentState) {
    const errors = agentState.errors || [];
    const recentErrors = errors.slice(-3);
    
    if (recentErrors.length >= 2) {
      // Check for similar error types
      const errorTypes = recentErrors.map(error => error.type);
      const uniqueTypes = new Set(errorTypes);
      
      if (uniqueTypes.size === 1) {
        return {
          isBlocker: true,
          type: 'repeated_failures',
          severity: 'high',
          description: `Repeated ${errorTypes[0]} errors (${recentErrors.length} times)`,
          evidence: recentErrors.map(e => e.message),
          recommendation: 'Human intervention needed to resolve recurring issue'
        };
      }
    }

    return { isBlocker: false, type: 'repeated_failures' };
  }

  /**
   * Check for low confidence with stagnation
   * @param {Object} agentState - Current agent state
   * @returns {Object} - Low confidence stagnation check result
   */
  checkLowConfidenceStagnation(agentState) {
    const confidence = agentState.confidence || 0;
    const reasoning = agentState.reasoning || [];
    
    if (confidence < 0.4 && reasoning.length >= 3) {
      // Check if confidence has been consistently low
      const recentReasoning = reasoning.slice(-3);
      const avgConfidence = recentReasoning.reduce((sum, r) => sum + (r.confidence || 0), 0) / recentReasoning.length;
      
      if (avgConfidence < 0.5) {
        return {
          isBlocker: true,
          type: 'low_confidence_stagnation',
          severity: 'medium',
          description: `Consistently low confidence (${(avgConfidence * 100).toFixed(1)}%) with limited progress`,
          evidence: {
            currentConfidence: confidence,
            averageConfidence: avgConfidence,
            reasoningSteps: reasoning.length
          },
          recommendation: 'Human guidance needed to clarify approach or requirements'
        };
      }
    }

    return { isBlocker: false, type: 'low_confidence_stagnation' };
  }

  /**
   * Check for resource exhaustion
   * @param {Object} agentState - Current agent state
   * @returns {Object} - Resource exhaustion check result
   */
  checkResourceExhaustion(agentState) {
    const executionTime = agentState.executionTime || 0;
    const maxTime = 5 * 60 * 1000; // 5 minutes
    const timeRatio = executionTime / maxTime;
    
    const metrics = agentState.metrics || {};
    const llmCalls = metrics.llmCalls || 0;
    const maxLLMCalls = 20;
    const llmRatio = llmCalls / maxLLMCalls;
    
    if (timeRatio > 0.8 || llmRatio > 0.8) {
      return {
        isBlocker: true,
        type: 'resource_exhaustion',
        severity: 'high',
        description: 'Approaching resource limits',
        evidence: {
          executionTime: Math.round(executionTime / 1000),
          maxTime: Math.round(maxTime / 1000),
          llmCalls: llmCalls,
          maxLLMCalls: maxLLMCalls
        },
        recommendation: 'Human decision needed on whether to continue or modify approach'
      };
    }

    return { isBlocker: false, type: 'resource_exhaustion' };
  }

  /**
   * Check for complexity overload
   * @param {Object} agentState - Current agent state
   * @param {Object} context - Additional context
   * @returns {Object} - Complexity overload check result
   */
  checkComplexityOverload(agentState, context) {
    const query = agentState.originalQuery || '';
    const reasoning = agentState.reasoning || [];
    const actions = agentState.actions || [];
    
    // Calculate complexity indicators
    const queryComplexity = this.calculateQueryComplexity(query);
    const reasoningComplexity = reasoning.length > 5 ? 0.3 : 0;
    const actionComplexity = actions.length > 8 ? 0.2 : 0;
    
    const totalComplexity = queryComplexity + reasoningComplexity + actionComplexity;
    
    if (totalComplexity > 0.8 && agentState.confidence < 0.6) {
      return {
        isBlocker: true,
        type: 'complexity_overload',
        severity: 'medium',
        description: 'Task complexity exceeds agent capabilities',
        evidence: {
          queryComplexity: queryComplexity,
          reasoningSteps: reasoning.length,
          actionCount: actions.length,
          totalComplexity: totalComplexity
        },
        recommendation: 'Human assistance needed to break down complex task'
      };
    }

    return { isBlocker: false, type: 'complexity_overload' };
  }

  /**
   * Check for ambiguous requirements
   * @param {Object} agentState - Current agent state
   * @param {Object} context - Additional context
   * @returns {Object} - Ambiguous requirements check result
   */
  checkAmbiguousRequirements(agentState, context) {
    const query = agentState.originalQuery || '';
    const reasoning = agentState.reasoning || [];
    
    // Look for ambiguity indicators in query
    const ambiguityIndicators = [
      /\b(maybe|perhaps|possibly|might|could be)\b/i,
      /\b(or|either|alternatively)\b/i,
      /\?.*\?/,  // Multiple questions
      /\b(unclear|ambiguous|not sure)\b/i
    ];
    
    const hasAmbiguityIndicators = ambiguityIndicators.some(pattern => pattern.test(query));
    
    // Check if agent is expressing uncertainty in reasoning
    const uncertaintyInReasoning = reasoning.some(r => 
      /\b(uncertain|unclear|not sure|don't know|ambiguous)\b/i.test(r.content)
    );
    
    if (hasAmbiguityIndicators || (uncertaintyInReasoning && agentState.confidence < 0.5)) {
      return {
        isBlocker: true,
        type: 'ambiguous_requirements',
        severity: 'medium',
        description: 'Requirements or query contains ambiguities',
        evidence: {
          hasAmbiguityIndicators: hasAmbiguityIndicators,
          uncertaintyInReasoning: uncertaintyInReasoning,
          confidence: agentState.confidence
        },
        recommendation: 'Human clarification needed to resolve ambiguities'
      };
    }

    return { isBlocker: false, type: 'ambiguous_requirements' };
  }

  /**
   * Check for safety constraints
   * @param {Object} agentState - Current agent state
   * @param {Object} context - Additional context
   * @returns {Object} - Safety constraints check result
   */
  checkSafetyConstraints(agentState, context) {
    const query = agentState.originalQuery || '';
    const actions = agentState.actions || [];
    
    // Check for potentially unsafe query patterns
    const unsafePatterns = [
      /\b(delete|remove|destroy|erase)\b/i,
      /\b(system|admin|root|sudo)\b/i,
      /\b(password|credential|secret|token)\b/i,
      /\b(execute|run|eval|script)\b/i,
      /\b(hack|exploit|bypass|crack)\b/i
    ];
    
    const hasUnsafePattern = unsafePatterns.some(pattern => pattern.test(query));
    
    // Check for risky actions
    const riskyActionTypes = ['system_call', 'file_operation', 'network_request', 'code_execution'];
    const hasRiskyActions = actions.some(action => riskyActionTypes.includes(action.type));
    
    if (hasUnsafePattern || hasRiskyActions) {
      return {
        isBlocker: true,
        type: 'safety_constraints',
        severity: 'high',
        description: 'Potential safety concerns detected',
        evidence: {
          hasUnsafePattern: hasUnsafePattern,
          hasRiskyActions: hasRiskyActions,
          riskyActions: actions.filter(a => riskyActionTypes.includes(a.type))
        },
        recommendation: 'Human review required for safety validation'
      };
    }

    return { isBlocker: false, type: 'safety_constraints' };
  }

  /**
   * Select primary blocker from detected blockers
   * @param {Array} blockers - Array of detected blockers
   * @returns {Object} - Primary blocker
   */
  selectPrimaryBlocker(blockers) {
    // Priority order: safety > repeated_failures > resource_exhaustion > others
    const priorityOrder = [
      'safety_constraints',
      'repeated_failures', 
      'resource_exhaustion',
      'complexity_overload',
      'low_confidence_stagnation',
      'ambiguous_requirements'
    ];
    
    for (const priority of priorityOrder) {
      const blocker = blockers.find(b => b.type === priority);
      if (blocker) return blocker;
    }
    
    return blockers[0]; // Fallback to first blocker
  }

  /**
   * Record a detected blocker
   * @param {Object} blocker - Blocker object
   * @param {Object} agentState - Current agent state
   */
  recordBlocker(blocker, agentState) {
    const blockerRecord = {
      id: this.generateBlockerId(),
      timestamp: new Date(),
      iteration: agentState.currentIteration,
      blocker: blocker,
      agentState: this.sanitizeStateForHuman(agentState),
      status: 'detected', // 'detected', 'resolved', 'escalated'
      resolution: null
    };

    this.blockers.push(blockerRecord);
    
    console.log(`Blocker detected: ${blocker.type} (ID: ${blockerRecord.id})`);
  }

  /**
   * Get recommendation for handling a blocker
   * @param {Object} blocker - Blocker object
   * @returns {Object} - Recommendation
   */
  getBlockerRecommendation(blocker) {
    const recommendations = {
      repeated_failures: {
        action: 'pause_for_human_input',
        message: 'Agent is encountering repeated failures. Human intervention needed to identify root cause.',
        urgency: 'high',
        suggestedActions: [
          'Review error patterns',
          'Modify approach strategy',
          'Provide additional context',
          'Simplify requirements'
        ]
      },
      low_confidence_stagnation: {
        action: 'request_guidance',
        message: 'Agent confidence is low and progress has stagnated. Human guidance would help.',
        urgency: 'medium',
        suggestedActions: [
          'Clarify requirements',
          'Provide examples',
          'Suggest alternative approach',
          'Break down into smaller tasks'
        ]
      },
      resource_exhaustion: {
        action: 'request_continuation_decision',
        message: 'Agent is approaching resource limits. Human decision needed on how to proceed.',
        urgency: 'high',
        suggestedActions: [
          'Extend resource limits',
          'Simplify task scope',
          'Save progress and restart',
          'Switch to manual mode'
        ]
      },
      complexity_overload: {
        action: 'request_task_breakdown',
        message: 'Task complexity exceeds agent capabilities. Human assistance needed to break down the task.',
        urgency: 'medium',
        suggestedActions: [
          'Break into subtasks',
          'Prioritize requirements',
          'Provide step-by-step guidance',
          'Simplify objectives'
        ]
      },
      ambiguous_requirements: {
        action: 'request_clarification',
        message: 'Requirements contain ambiguities that need human clarification.',
        urgency: 'medium',
        suggestedActions: [
          'Clarify ambiguous terms',
          'Provide specific examples',
          'Define success criteria',
          'Specify constraints'
        ]
      },
      safety_constraints: {
        action: 'immediate_human_review',
        message: 'Potential safety concerns detected. Immediate human review required.',
        urgency: 'critical',
        suggestedActions: [
          'Review safety implications',
          'Validate request legitimacy',
          'Modify approach if needed',
          'Abort if unsafe'
        ]
      }
    };

    return recommendations[blocker.type] || {
      action: 'request_human_input',
      message: 'Unknown blocker type detected. Human input requested.',
      urgency: 'medium',
      suggestedActions: ['Review situation', 'Provide guidance']
    };
  }

  /**
   * Create clear communication of agent reasoning and progress
   * @param {Object} agentState - Current agent state
   * @param {Object} context - Additional context
   * @returns {Object} - Communication object
   */
  createProgressCommunication(agentState, context = {}) {
    const communication = {
      id: this.generateCommunicationId(),
      timestamp: new Date(),
      type: 'progress_update',
      iteration: agentState.currentIteration,
      summary: this.createProgressSummary(agentState),
      reasoning: this.formatReasoningForHuman(agentState.reasoning),
      actions: this.formatActionsForHuman(agentState.actions),
      currentStatus: this.createStatusSummary(agentState),
      nextSteps: this.identifyNextSteps(agentState, context),
      confidence: agentState.confidence,
      needsInput: context.needsInput || false
    };

    this.communicationHistory.push(communication);
    
    return communication;
  }

  /**
   * Create progress summary for human understanding
   * @param {Object} agentState - Current agent state
   * @returns {string} - Progress summary
   */
  createProgressSummary(agentState) {
    const iteration = agentState.currentIteration;
    const maxIterations = agentState.maxIterations;
    const confidence = agentState.confidence;
    const errorCount = (agentState.errors || []).length;
    
    let summary = `Progress: Step ${iteration}/${maxIterations} (${((iteration/maxIterations) * 100).toFixed(0)}% complete)`;
    summary += `\nConfidence: ${(confidence * 100).toFixed(1)}%`;
    
    if (errorCount > 0) {
      summary += `\nErrors encountered: ${errorCount}`;
    }
    
    const reasoning = agentState.reasoning || [];
    if (reasoning.length > 0) {
      const lastReasoning = reasoning[reasoning.length - 1];
      summary += `\nCurrent focus: ${lastReasoning.content.substring(0, 100)}...`;
    }
    
    return summary;
  }

  /**
   * Format reasoning for human readability
   * @param {Array} reasoning - Reasoning array
   * @returns {Array} - Formatted reasoning
   */
  formatReasoningForHuman(reasoning) {
    if (!reasoning || reasoning.length === 0) {
      return ['No reasoning steps available yet.'];
    }
    
    return reasoning.map((r, index) => ({
      step: index + 1,
      iteration: r.iteration,
      content: r.content,
      confidence: r.confidence,
      timestamp: r.timestamp,
      summary: r.content.length > 200 ? r.content.substring(0, 200) + '...' : r.content
    }));
  }

  /**
   * Format actions for human readability
   * @param {Array} actions - Actions array
   * @returns {Array} - Formatted actions
   */
  formatActionsForHuman(actions) {
    if (!actions || actions.length === 0) {
      return ['No actions taken yet.'];
    }
    
    return actions.map((a, index) => ({
      step: index + 1,
      type: a.type,
      description: a.description,
      iteration: a.iteration,
      timestamp: a.timestamp,
      success: a.success !== false
    }));
  }

  /**
   * Create status summary
   * @param {Object} agentState - Current agent state
   * @returns {Object} - Status summary
   */
  createStatusSummary(agentState) {
    return {
      status: agentState.status,
      iteration: agentState.currentIteration,
      maxIterations: agentState.maxIterations,
      confidence: agentState.confidence,
      executionTime: Math.round((agentState.executionTime || 0) / 1000),
      errorCount: (agentState.errors || []).length,
      reasoningSteps: (agentState.reasoning || []).length,
      actionsTaken: (agentState.actions || []).length
    };
  }

  /**
   * Identify next steps for human understanding
   * @param {Object} agentState - Current agent state
   * @param {Object} context - Additional context
   * @returns {Array} - Next steps
   */
  identifyNextSteps(agentState, context) {
    const nextSteps = [];
    
    if (agentState.status === 'processing') {
      nextSteps.push('Continue reasoning and analysis');
      
      if (agentState.confidence < 0.5) {
        nextSteps.push('Work to increase confidence in solution');
      }
      
      if ((agentState.errors || []).length > 0) {
        nextSteps.push('Address any remaining errors');
      }
    }
    
    if (context.needsInput) {
      nextSteps.push('Awaiting human input or guidance');
    }
    
    if (nextSteps.length === 0) {
      nextSteps.push('Determine appropriate next action');
    }
    
    return nextSteps;
  }

  /**
   * Calculate query complexity for blocker detection
   * @param {string} query - User query
   * @returns {number} - Complexity score (0-1)
   */
  calculateQueryComplexity(query) {
    let complexity = 0;
    
    // Length factor
    if (query.length > 200) complexity += 0.2;
    if (query.length > 500) complexity += 0.2;
    
    // Multiple questions
    const questionCount = (query.match(/\?/g) || []).length;
    if (questionCount > 1) complexity += 0.2;
    
    // Complex terms
    const complexTerms = /\b(calculate|analyze|compare|optimize|determine|evaluate|synthesize|integrate)\b/gi;
    const complexMatches = query.match(complexTerms) || [];
    complexity += Math.min(0.3, complexMatches.length * 0.1);
    
    // Technical jargon
    const technicalTerms = /\b(algorithm|function|variable|parameter|coefficient|derivative|integral|matrix)\b/gi;
    const technicalMatches = query.match(technicalTerms) || [];
    complexity += Math.min(0.2, technicalMatches.length * 0.05);
    
    return Math.min(1, complexity);
  }

  /**
   * Sanitize agent state for human consumption
   * @param {Object} agentState - Raw agent state
   * @returns {Object} - Sanitized state
   */
  sanitizeStateForHuman(agentState) {
    return {
      sessionId: agentState.sessionId,
      originalQuery: agentState.originalQuery,
      currentIteration: agentState.currentIteration,
      maxIterations: agentState.maxIterations,
      status: agentState.status,
      confidence: agentState.confidence,
      executionTime: agentState.executionTime,
      reasoningCount: (agentState.reasoning || []).length,
      actionCount: (agentState.actions || []).length,
      errorCount: (agentState.errors || []).length,
      lastUpdate: agentState.lastUpdate
    };
  }

  /**
   * Determine checkpoint priority
   * @param {string} reason - Checkpoint reason
   * @param {Object} agentState - Current agent state
   * @returns {string} - Priority level
   */
  determineCheckpointPriority(reason, agentState) {
    const highPriorityReasons = ['safety_concern', 'repeated_failures', 'resource_exhaustion'];
    const mediumPriorityReasons = ['low_confidence', 'complexity_overload', 'ambiguous_requirements'];
    
    if (highPriorityReasons.includes(reason)) return 'high';
    if (mediumPriorityReasons.includes(reason)) return 'medium';
    return 'low';
  }

  /**
   * Generate unique checkpoint ID
   * @returns {string} - Checkpoint ID
   */
  generateCheckpointId() {
    return 'checkpoint_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  }

  /**
   * Generate unique blocker ID
   * @returns {string} - Blocker ID
   */
  generateBlockerId() {
    return 'blocker_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  }

  /**
   * Generate unique communication ID
   * @returns {string} - Communication ID
   */
  generateCommunicationId() {
    return 'comm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  }

  /**
   * Get all checkpoints
   * @returns {Array} - Array of checkpoints
   */
  getCheckpoints() {
    return [...this.checkpoints];
  }

  /**
   * Get all blockers
   * @returns {Array} - Array of blockers
   */
  getBlockers() {
    return [...this.blockers];
  }

  /**
   * Get communication history
   * @returns {Array} - Array of communications
   */
  getCommunicationHistory() {
    return [...this.communicationHistory];
  }

  /**
   * Resolve a checkpoint
   * @param {string} checkpointId - Checkpoint ID
   * @param {Object} resolution - Resolution data
   */
  resolveCheckpoint(checkpointId, resolution) {
    const checkpoint = this.checkpoints.find(c => c.id === checkpointId);
    if (checkpoint) {
      checkpoint.status = 'resolved';
      checkpoint.humanResponse = resolution;
      checkpoint.resolutionTime = new Date();
      
      console.log(`Checkpoint resolved: ${checkpointId}`);
    }
  }

  /**
   * Configure interaction settings
   * @param {Object} config - Configuration options
   */
  configure(config) {
    if (config.interactionMode) {
      this.interactionMode = config.interactionMode;
    }
    if (config.blockerDetectionEnabled !== undefined) {
      this.blockerDetectionEnabled = config.blockerDetectionEnabled;
    }
    if (config.progressCommunicationEnabled !== undefined) {
      this.progressCommunicationEnabled = config.progressCommunicationEnabled;
    }
    
    console.log('Human interaction manager configured:', config);
  }
}

export default HumanInteractionManager;