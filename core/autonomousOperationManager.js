/**
 * Autonomous Operation Manager
 * Handles independent agent operation with decision-making logic for human intervention
 */

class AutonomousOperationManager {
  constructor() {
    this.operationMode = 'supervised'; // 'autonomous', 'supervised', 'manual'
    this.decisionThresholds = {
      confidenceThreshold: 0.7,
      errorThreshold: 2,
      complexityThreshold: 0.8,
      uncertaintyThreshold: 0.6
    };
    this.humanInterventionTriggers = new Set([
      'low_confidence',
      'high_complexity',
      'repeated_errors',
      'ambiguous_query',
      'safety_concern',
      'resource_limit'
    ]);
    this.autonomousDecisionHistory = [];
  }

  /**
   * Set operation mode
   * @param {string} mode - Operation mode ('autonomous', 'supervised', 'manual')
   */
  setOperationMode(mode) {
    const validModes = ['autonomous', 'supervised', 'manual'];
    if (!validModes.includes(mode)) {
      throw new Error(`Invalid operation mode: ${mode}. Must be one of: ${validModes.join(', ')}`);
    }
    
    this.operationMode = mode;
    console.log(`Autonomous operation mode set to: ${mode}`);
  }

  /**
   * Determine if agent should continue autonomously or seek human input
   * @param {Object} agentState - Current agent state
   * @param {Object} context - Additional context for decision making
   * @returns {Object} - Decision result
   */
  shouldContinueAutonomously(agentState, context = {}) {
    // Always require human input in manual mode
    if (this.operationMode === 'manual') {
      return {
        shouldContinue: false,
        reason: 'Manual mode requires human input for each step',
        trigger: 'manual_mode',
        confidence: 1.0
      };
    }

    // Evaluate decision factors
    const decisionFactors = this.evaluateDecisionFactors(agentState, context);
    
    // Make autonomous decision based on factors
    const decision = this.makeAutonomousDecision(decisionFactors, agentState);
    
    // Record decision for learning
    this.recordDecision(decision, agentState);
    
    return decision;
  }

  /**
   * Evaluate factors that influence autonomous operation decisions
   * @param {Object} agentState - Current agent state
   * @param {Object} context - Additional context
   * @returns {Object} - Decision factors
   */
  evaluateDecisionFactors(agentState, context) {
    const factors = {
      confidence: this.evaluateConfidenceFactor(agentState),
      complexity: this.evaluateComplexityFactor(agentState, context),
      errorRate: this.evaluateErrorRateFactor(agentState),
      progress: this.evaluateProgressFactor(agentState),
      uncertainty: this.evaluateUncertaintyFactor(agentState),
      safety: this.evaluateSafetyFactor(agentState, context),
      resources: this.evaluateResourceFactor(agentState)
    };

    return factors;
  }

  /**
   * Evaluate confidence factor
   * @param {Object} agentState - Current agent state
   * @returns {Object} - Confidence evaluation
   */
  evaluateConfidenceFactor(agentState) {
    const confidence = agentState.confidence || 0;
    const isLowConfidence = confidence < this.decisionThresholds.confidenceThreshold;
    
    return {
      value: confidence,
      isRisky: isLowConfidence,
      trigger: isLowConfidence ? 'low_confidence' : null,
      weight: 0.3,
      description: `Agent confidence: ${(confidence * 100).toFixed(1)}%`
    };
  }

  /**
   * Evaluate complexity factor
   * @param {Object} agentState - Current agent state
   * @param {Object} context - Additional context
   * @returns {Object} - Complexity evaluation
   */
  evaluateComplexityFactor(agentState, context) {
    // Calculate complexity based on query characteristics and reasoning depth
    let complexityScore = 0;
    
    // Query complexity indicators
    const query = agentState.originalQuery || '';
    const queryLength = query.length;
    const hasMultipleQuestions = (query.match(/\?/g) || []).length > 1;
    const hasComplexTerms = /\b(calculate|analyze|compare|optimize|determine|evaluate)\b/i.test(query);
    
    if (queryLength > 200) complexityScore += 0.2;
    if (hasMultipleQuestions) complexityScore += 0.3;
    if (hasComplexTerms) complexityScore += 0.2;
    
    // Reasoning complexity
    const reasoningDepth = agentState.reasoning?.length || 0;
    if (reasoningDepth > 5) complexityScore += 0.2;
    
    // Action complexity
    const actionTypes = new Set((agentState.actions || []).map(a => a.type));
    if (actionTypes.size > 3) complexityScore += 0.1;
    
    const isHighComplexity = complexityScore > this.decisionThresholds.complexityThreshold;
    
    return {
      value: Math.min(1, complexityScore),
      isRisky: isHighComplexity,
      trigger: isHighComplexity ? 'high_complexity' : null,
      weight: 0.25,
      description: `Task complexity score: ${(complexityScore * 100).toFixed(1)}%`
    };
  }

  /**
   * Evaluate error rate factor
   * @param {Object} agentState - Current agent state
   * @returns {Object} - Error rate evaluation
   */
  evaluateErrorRateFactor(agentState) {
    const errors = agentState.errors || [];
    const errorCount = errors.length;
    const isHighErrorRate = errorCount >= this.decisionThresholds.errorThreshold;
    
    // Check for repeated similar errors
    const recentErrors = errors.slice(-3);
    const hasRepeatedErrors = recentErrors.length >= 2 && 
      recentErrors.every(error => error.type === recentErrors[0].type);
    
    return {
      value: errorCount,
      isRisky: isHighErrorRate || hasRepeatedErrors,
      trigger: (isHighErrorRate || hasRepeatedErrors) ? 'repeated_errors' : null,
      weight: 0.2,
      description: `Error count: ${errorCount}, repeated: ${hasRepeatedErrors}`
    };
  }

  /**
   * Evaluate progress factor
   * @param {Object} agentState - Current agent state
   * @returns {Object} - Progress evaluation
   */
  evaluateProgressFactor(agentState) {
    const currentIteration = agentState.currentIteration || 0;
    const maxIterations = agentState.maxIterations || 10;
    const progressRatio = currentIteration / maxIterations;
    
    const hasRecentProgress = this.hasRecentProgress(agentState);
    const isStagnant = progressRatio > 0.5 && !hasRecentProgress;
    
    return {
      value: progressRatio,
      isRisky: isStagnant,
      trigger: isStagnant ? 'stagnation' : null,
      weight: 0.15,
      description: `Progress: ${currentIteration}/${maxIterations} iterations, stagnant: ${isStagnant}`
    };
  }

  /**
   * Evaluate uncertainty factor
   * @param {Object} agentState - Current agent state
   * @returns {Object} - Uncertainty evaluation
   */
  evaluateUncertaintyFactor(agentState) {
    // Calculate uncertainty based on reasoning consistency and observation quality
    let uncertaintyScore = 0;
    
    const reasoning = agentState.reasoning || [];
    if (reasoning.length > 1) {
      // Check for contradictory reasoning
      const recentReasoning = reasoning.slice(-2);
      const hasContradictions = this.detectReasoningContradictions(recentReasoning);
      if (hasContradictions) uncertaintyScore += 0.4;
    }
    
    // Check observation quality
    const observations = agentState.observations || [];
    const errorObservations = observations.filter(obs => obs.type === 'error');
    const errorRatio = observations.length > 0 ? errorObservations.length / observations.length : 0;
    uncertaintyScore += errorRatio * 0.3;
    
    const isHighUncertainty = uncertaintyScore > this.decisionThresholds.uncertaintyThreshold;
    
    return {
      value: uncertaintyScore,
      isRisky: isHighUncertainty,
      trigger: isHighUncertainty ? 'high_uncertainty' : null,
      weight: 0.1,
      description: `Uncertainty score: ${(uncertaintyScore * 100).toFixed(1)}%`
    };
  }

  /**
   * Evaluate safety factor
   * @param {Object} agentState - Current agent state
   * @param {Object} context - Additional context
   * @returns {Object} - Safety evaluation
   */
  evaluateSafetyFactor(agentState, context) {
    // Check for safety concerns in query or actions
    const query = agentState.originalQuery || '';
    const actions = agentState.actions || [];
    
    let safetyScore = 1.0; // Start with safe assumption
    
    // Check for potentially unsafe query patterns
    const unsafePatterns = [
      /delete|remove|destroy/i,
      /system|admin|root/i,
      /password|credential|secret/i,
      /execute|run|eval/i
    ];
    
    const hasUnsafePattern = unsafePatterns.some(pattern => pattern.test(query));
    if (hasUnsafePattern) safetyScore -= 0.5;
    
    // Check for risky actions
    const riskyActionTypes = ['system_call', 'file_operation', 'network_request'];
    const hasRiskyActions = actions.some(action => riskyActionTypes.includes(action.type));
    if (hasRiskyActions) safetyScore -= 0.3;
    
    const hasSafetyConcern = safetyScore < 0.7;
    
    return {
      value: safetyScore,
      isRisky: hasSafetyConcern,
      trigger: hasSafetyConcern ? 'safety_concern' : null,
      weight: 0.3,
      description: `Safety score: ${(safetyScore * 100).toFixed(1)}%`
    };
  }

  /**
   * Evaluate resource factor
   * @param {Object} agentState - Current agent state
   * @returns {Object} - Resource evaluation
   */
  evaluateResourceFactor(agentState) {
    const executionTime = agentState.executionTime || 0;
    const maxExecutionTime = 5 * 60 * 1000; // 5 minutes
    const timeRatio = executionTime / maxExecutionTime;
    
    const metrics = agentState.metrics || {};
    const llmCalls = metrics.llmCalls || 0;
    const maxLLMCalls = 20;
    const llmCallRatio = llmCalls / maxLLMCalls;
    
    const resourceUsage = Math.max(timeRatio, llmCallRatio);
    const isResourceConstrained = resourceUsage > 0.8;
    
    return {
      value: resourceUsage,
      isRisky: isResourceConstrained,
      trigger: isResourceConstrained ? 'resource_limit' : null,
      weight: 0.1,
      description: `Resource usage: ${(resourceUsage * 100).toFixed(1)}% (time: ${Math.round(executionTime/1000)}s, LLM calls: ${llmCalls})`
    };
  }

  /**
   * Make autonomous decision based on evaluated factors
   * @param {Object} factors - Decision factors
   * @param {Object} agentState - Current agent state
   * @returns {Object} - Decision result
   */
  makeAutonomousDecision(factors, agentState) {
    // In supervised mode, be more conservative
    const conservativeMode = this.operationMode === 'supervised';
    
    // Calculate weighted risk score
    let riskScore = 0;
    let triggers = [];
    let riskFactors = [];
    
    for (const [factorName, factor] of Object.entries(factors)) {
      if (factor.isRisky) {
        riskScore += factor.weight;
        if (factor.trigger) {
          triggers.push(factor.trigger);
        }
        riskFactors.push({
          name: factorName,
          description: factor.description,
          weight: factor.weight
        });
      }
    }
    
    // Adjust thresholds based on mode
    const riskThreshold = conservativeMode ? 0.3 : 0.5;
    
    // Make decision
    const shouldContinue = riskScore < riskThreshold;
    const primaryTrigger = triggers.length > 0 ? triggers[0] : null;
    
    // Calculate decision confidence
    const decisionConfidence = shouldContinue ? 
      Math.max(0.1, 1 - riskScore) : 
      Math.min(0.9, riskScore);
    
    return {
      shouldContinue,
      reason: shouldContinue ? 
        'Risk factors within acceptable thresholds for autonomous operation' :
        `Risk factors exceed threshold (${(riskScore * 100).toFixed(1)}% > ${(riskThreshold * 100).toFixed(1)}%)`,
      trigger: primaryTrigger,
      confidence: decisionConfidence,
      riskScore,
      riskFactors,
      operationMode: this.operationMode,
      factors
    };
  }

  /**
   * Detect task completion for autonomous termination
   * @param {Object} agentState - Current agent state
   * @param {Object} context - Additional context
   * @returns {Object} - Completion detection result
   */
  detectTaskCompletion(agentState, context = {}) {
    const completionIndicators = this.evaluateCompletionIndicators(agentState);
    
    // Calculate completion confidence
    let completionScore = 0;
    let indicators = [];
    
    for (const [indicatorName, indicator] of Object.entries(completionIndicators)) {
      if (indicator.isComplete) {
        completionScore += indicator.weight;
        indicators.push({
          name: indicatorName,
          description: indicator.description,
          confidence: indicator.confidence
        });
      }
    }
    
    const isComplete = completionScore >= 0.7;
    const completionConfidence = Math.min(0.95, completionScore);
    
    return {
      isComplete,
      confidence: completionConfidence,
      completionScore,
      indicators,
      reason: isComplete ? 
        'Task completion indicators suggest successful resolution' :
        'Task completion indicators insufficient for autonomous termination'
    };
  }

  /**
   * Evaluate completion indicators
   * @param {Object} agentState - Current agent state
   * @returns {Object} - Completion indicators
   */
  evaluateCompletionIndicators(agentState) {
    return {
      solutionPresent: this.evaluateSolutionPresence(agentState),
      highConfidence: this.evaluateHighConfidence(agentState),
      noRecentErrors: this.evaluateErrorAbsence(agentState),
      reasoningComplete: this.evaluateReasoningCompleteness(agentState),
      queryAddressed: this.evaluateQueryAddressed(agentState)
    };
  }

  /**
   * Evaluate if solution is present in reasoning
   * @param {Object} agentState - Current agent state
   * @returns {Object} - Solution presence evaluation
   */
  evaluateSolutionPresence(agentState) {
    const reasoning = agentState.reasoning || [];
    if (reasoning.length === 0) {
      return { isComplete: false, confidence: 0, weight: 0.3, description: 'No reasoning available' };
    }
    
    const lastReasoning = reasoning[reasoning.length - 1];
    const content = lastReasoning.content.toLowerCase();
    
    const solutionKeywords = [
      'final answer', 'conclusion', 'solution is', 'the answer is',
      'result is', 'therefore', 'in summary', 'to conclude'
    ];
    
    const hasSolutionKeyword = solutionKeywords.some(keyword => content.includes(keyword));
    const hasDefinitiveStatement = /\b(is|are|equals|results in)\b/.test(content);
    
    const isComplete = hasSolutionKeyword || hasDefinitiveStatement;
    const confidence = isComplete ? 0.8 : 0.2;
    
    return {
      isComplete,
      confidence,
      weight: 0.3,
      description: `Solution indicators: keywords=${hasSolutionKeyword}, definitive=${hasDefinitiveStatement}`
    };
  }

  /**
   * Evaluate high confidence indicator
   * @param {Object} agentState - Current agent state
   * @returns {Object} - High confidence evaluation
   */
  evaluateHighConfidence(agentState) {
    const confidence = agentState.confidence || 0;
    const isComplete = confidence >= 0.8;
    
    return {
      isComplete,
      confidence: confidence,
      weight: 0.25,
      description: `Agent confidence: ${(confidence * 100).toFixed(1)}%`
    };
  }

  /**
   * Evaluate absence of recent errors
   * @param {Object} agentState - Current agent state
   * @returns {Object} - Error absence evaluation
   */
  evaluateErrorAbsence(agentState) {
    const errors = agentState.errors || [];
    const recentErrors = errors.filter(error => {
      const errorTime = new Date(error.timestamp);
      const now = new Date();
      const timeDiff = now - errorTime;
      return timeDiff < 60000; // Last minute
    });
    
    const isComplete = recentErrors.length === 0;
    const confidence = isComplete ? 0.9 : Math.max(0.1, 1 - (recentErrors.length * 0.3));
    
    return {
      isComplete,
      confidence,
      weight: 0.2,
      description: `Recent errors: ${recentErrors.length}`
    };
  }

  /**
   * Evaluate reasoning completeness
   * @param {Object} agentState - Current agent state
   * @returns {Object} - Reasoning completeness evaluation
   */
  evaluateReasoningCompleteness(agentState) {
    const reasoning = agentState.reasoning || [];
    const hasMinimumReasoning = reasoning.length >= 2;
    const hasProgressiveReasoning = this.hasProgressiveReasoning(reasoning);
    
    const isComplete = hasMinimumReasoning && hasProgressiveReasoning;
    const confidence = isComplete ? 0.7 : 0.3;
    
    return {
      isComplete,
      confidence,
      weight: 0.15,
      description: `Reasoning steps: ${reasoning.length}, progressive: ${hasProgressiveReasoning}`
    };
  }

  /**
   * Evaluate if original query has been addressed
   * @param {Object} agentState - Current agent state
   * @returns {Object} - Query addressed evaluation
   */
  evaluateQueryAddressed(agentState) {
    const query = agentState.originalQuery || '';
    const reasoning = agentState.reasoning || [];
    
    if (reasoning.length === 0) {
      return { isComplete: false, confidence: 0, weight: 0.1, description: 'No reasoning to evaluate' };
    }
    
    // Simple keyword matching between query and reasoning
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 3);
    const reasoningText = reasoning.map(r => r.content).join(' ').toLowerCase();
    
    const addressedWords = queryWords.filter(word => reasoningText.includes(word));
    const addressedRatio = queryWords.length > 0 ? addressedWords.length / queryWords.length : 0;
    
    const isComplete = addressedRatio >= 0.5;
    const confidence = addressedRatio;
    
    return {
      isComplete,
      confidence,
      weight: 0.1,
      description: `Query terms addressed: ${addressedWords.length}/${queryWords.length} (${(addressedRatio * 100).toFixed(1)}%)`
    };
  }

  /**
   * Check if agent has made recent progress
   * @param {Object} agentState - Current agent state
   * @returns {boolean} - Whether recent progress was made
   */
  hasRecentProgress(agentState) {
    const reasoning = agentState.reasoning || [];
    if (reasoning.length < 2) return true; // Early stages count as progress
    
    const recentReasoning = reasoning.slice(-2);
    const similarity = this.calculateTextSimilarity(
      recentReasoning[0].content,
      recentReasoning[1].content
    );
    
    return similarity < 0.8; // Less than 80% similar indicates progress
  }

  /**
   * Check if reasoning shows progressive development
   * @param {Array} reasoning - Reasoning array
   * @returns {boolean} - Whether reasoning is progressive
   */
  hasProgressiveReasoning(reasoning) {
    if (reasoning.length < 2) return true;
    
    // Check if reasoning length generally increases (more detailed over time)
    const lengths = reasoning.map(r => r.content.length);
    const avgEarlyLength = lengths.slice(0, Math.ceil(lengths.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(lengths.length / 2);
    const avgLateLength = lengths.slice(Math.floor(lengths.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(lengths.length / 2);
    
    return avgLateLength >= avgEarlyLength * 0.8; // Allow some variation
  }

  /**
   * Detect contradictions in reasoning
   * @param {Array} reasoningEntries - Recent reasoning entries
   * @returns {boolean} - Whether contradictions exist
   */
  detectReasoningContradictions(reasoningEntries) {
    if (reasoningEntries.length < 2) return false;
    
    // Simple contradiction detection based on negation patterns
    const contradictionPatterns = [
      { positive: /\bis\b/, negative: /\bis not\b/ },
      { positive: /\bcan\b/, negative: /\bcannot\b/ },
      { positive: /\bwill\b/, negative: /\bwill not\b/ },
      { positive: /\bshould\b/, negative: /\bshould not\b/ }
    ];
    
    for (let i = 0; i < reasoningEntries.length - 1; i++) {
      const current = reasoningEntries[i].content.toLowerCase();
      const next = reasoningEntries[i + 1].content.toLowerCase();
      
      for (const pattern of contradictionPatterns) {
        if ((pattern.positive.test(current) && pattern.negative.test(next)) ||
            (pattern.negative.test(current) && pattern.positive.test(next))) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Calculate text similarity (simple implementation)
   * @param {string} text1 - First text
   * @param {string} text2 - Second text
   * @returns {number} - Similarity score (0-1)
   */
  calculateTextSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  /**
   * Record autonomous decision for learning
   * @param {Object} decision - Decision result
   * @param {Object} agentState - Agent state at decision time
   */
  recordDecision(decision, agentState) {
    const decisionRecord = {
      timestamp: new Date(),
      iteration: agentState.currentIteration,
      decision: decision.shouldContinue,
      reason: decision.reason,
      trigger: decision.trigger,
      confidence: decision.confidence,
      riskScore: decision.riskScore,
      operationMode: this.operationMode,
      agentConfidence: agentState.confidence,
      sessionId: agentState.sessionId
    };
    
    this.autonomousDecisionHistory.push(decisionRecord);
    
    // Keep only recent decisions (last 100)
    if (this.autonomousDecisionHistory.length > 100) {
      this.autonomousDecisionHistory = this.autonomousDecisionHistory.slice(-100);
    }
  }

  /**
   * Get decision history for analysis
   * @returns {Array} - Decision history
   */
  getDecisionHistory() {
    return [...this.autonomousDecisionHistory];
  }

  /**
   * Configure decision thresholds
   * @param {Object} thresholds - New threshold values
   */
  configureThresholds(thresholds) {
    this.decisionThresholds = {
      ...this.decisionThresholds,
      ...thresholds
    };
    
    console.log('Autonomous operation thresholds updated:', this.decisionThresholds);
  }

  /**
   * Get current configuration
   * @returns {Object} - Current configuration
   */
  getConfiguration() {
    return {
      operationMode: this.operationMode,
      decisionThresholds: { ...this.decisionThresholds },
      humanInterventionTriggers: Array.from(this.humanInterventionTriggers),
      decisionHistoryCount: this.autonomousDecisionHistory.length
    };
  }
}

export default AutonomousOperationManager;