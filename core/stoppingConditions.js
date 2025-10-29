/**
 * Stopping Conditions for Agent Loop
 * Implements various termination conditions for autonomous agent operation
 */

class StoppingConditions {
  constructor() {
    this.conditions = new Map();
    this.initializeDefaultConditions();
  }

  /**
   * Initialize default stopping conditions
   */
  initializeDefaultConditions() {
    // Maximum iterations condition
    this.addCondition('max_iterations', (state) => {
      return {
        shouldStop: state.currentIteration >= state.maxIterations,
        reason: 'Maximum iterations reached',
        confidence: 1.0
      };
    });

    // Solution found condition
    this.addCondition('solution_found', (state) => {
      const lastReasoning = state.reasoning[state.reasoning.length - 1];
      if (!lastReasoning) return { shouldStop: false };

      const content = lastReasoning.content.toLowerCase();
      const solutionIndicators = [
        'final answer',
        'conclusion',
        'solution is',
        'the answer is',
        'result is',
        'therefore',
        'in summary'
      ];

      const hasSolutionIndicator = solutionIndicators.some(indicator => 
        content.includes(indicator)
      );

      return {
        shouldStop: hasSolutionIndicator,
        reason: 'Solution found in reasoning',
        confidence: hasSolutionIndicator ? 0.8 : 0
      };
    });

    // High confidence condition
    this.addCondition('high_confidence', (state) => {
      return {
        shouldStop: state.confidence >= 0.9,
        reason: 'High confidence threshold reached',
        confidence: state.confidence
      };
    });

    // Error threshold condition
    this.addCondition('error_threshold', (state) => {
      const errorCount = state.errors.length;
      const maxErrors = 3;

      return {
        shouldStop: errorCount >= maxErrors,
        reason: `Too many errors (${errorCount}/${maxErrors})`,
        confidence: 0.1
      };
    });

    // Stagnation condition (no progress)
    this.addCondition('stagnation', (state) => {
      if (state.reasoning.length < 3) return { shouldStop: false };

      const recentReasoning = state.reasoning.slice(-3);
      const similarityThreshold = 0.7;
      
      // Simple similarity check based on content length and keywords
      const similarities = [];
      for (let i = 0; i < recentReasoning.length - 1; i++) {
        const similarity = this.calculateSimilarity(
          recentReasoning[i].content,
          recentReasoning[i + 1].content
        );
        similarities.push(similarity);
      }

      const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
      const isStagnant = avgSimilarity > similarityThreshold;

      return {
        shouldStop: isStagnant,
        reason: `Reasoning stagnation detected (similarity: ${avgSimilarity.toFixed(2)})`,
        confidence: isStagnant ? 0.6 : 0
      };
    });

    // Human intervention required
    this.addCondition('human_intervention', (state) => {
      return {
        shouldStop: state.awaitingHumanInput,
        reason: 'Awaiting human input',
        confidence: 0.5
      };
    });

    // Time limit condition
    this.addCondition('time_limit', (state) => {
      const maxExecutionTime = 5 * 60 * 1000; // 5 minutes
      const timeExceeded = state.executionTime > maxExecutionTime;

      return {
        shouldStop: timeExceeded,
        reason: `Time limit exceeded (${Math.round(state.executionTime / 1000)}s)`,
        confidence: 0.3
      };
    });
  }

  /**
   * Add a custom stopping condition
   * @param {string} name - Condition name
   * @param {Function} conditionFn - Function that evaluates the condition
   */
  addCondition(name, conditionFn) {
    this.conditions.set(name, conditionFn);
  }

  /**
   * Remove a stopping condition
   * @param {string} name - Condition name to remove
   */
  removeCondition(name) {
    this.conditions.delete(name);
  }

  /**
   * Evaluate all stopping conditions
   * @param {Object} agentState - Current agent state
   * @returns {Object} - Stopping decision
   */
  evaluate(agentState) {
    const results = [];
    
    // Evaluate each condition
    for (const [name, conditionFn] of this.conditions) {
      try {
        const result = conditionFn(agentState);
        results.push({
          name,
          ...result
        });
      } catch (error) {
        console.error(`Error evaluating stopping condition '${name}':`, error);
        results.push({
          name,
          shouldStop: false,
          reason: `Error in condition evaluation: ${error.message}`,
          confidence: 0,
          error: true
        });
      }
    }

    // Find the highest priority stopping condition
    const stoppingCondition = results.find(result => result.shouldStop);
    
    if (stoppingCondition) {
      return {
        shouldStop: true,
        condition: stoppingCondition.name,
        reason: stoppingCondition.reason,
        confidence: stoppingCondition.confidence,
        allResults: results
      };
    }

    return {
      shouldStop: false,
      condition: null,
      reason: 'No stopping conditions met',
      confidence: 0,
      allResults: results
    };
  }

  /**
   * Evaluate specific stopping condition
   * @param {string} conditionName - Name of condition to evaluate
   * @param {Object} agentState - Current agent state
   * @returns {Object} - Condition result
   */
  evaluateCondition(conditionName, agentState) {
    const conditionFn = this.conditions.get(conditionName);
    if (!conditionFn) {
      throw new Error(`Stopping condition '${conditionName}' not found`);
    }

    return conditionFn(agentState);
  }

  /**
   * Get list of available conditions
   * @returns {Array} - Array of condition names
   */
  getAvailableConditions() {
    return Array.from(this.conditions.keys());
  }

  /**
   * Calculate similarity between two text strings (simple implementation)
   * @param {string} text1 - First text
   * @param {string} text2 - Second text
   * @returns {number} - Similarity score (0-1)
   */
  calculateSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;

    // Simple word-based similarity
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  /**
   * Create custom condition for specific use case
   * @param {Object} config - Condition configuration
   * @returns {Function} - Condition function
   */
  createCustomCondition(config) {
    const {
      name,
      threshold,
      property,
      operator = '>=',
      reason
    } = config;

    return (state) => {
      let value;
      
      // Get value from state using property path
      if (property.includes('.')) {
        const path = property.split('.');
        value = path.reduce((obj, key) => obj?.[key], state);
      } else {
        value = state[property];
      }

      let shouldStop = false;
      
      switch (operator) {
        case '>=':
          shouldStop = value >= threshold;
          break;
        case '<=':
          shouldStop = value <= threshold;
          break;
        case '==':
          shouldStop = value === threshold;
          break;
        case '>':
          shouldStop = value > threshold;
          break;
        case '<':
          shouldStop = value < threshold;
          break;
        default:
          shouldStop = false;
      }

      return {
        shouldStop,
        reason: reason || `Custom condition: ${property} ${operator} ${threshold}`,
        confidence: shouldStop ? 0.7 : 0
      };
    };
  }
}

export default StoppingConditions;