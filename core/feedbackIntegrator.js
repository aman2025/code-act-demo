/**
 * Feedback Integrator - Integrates environmental feedback into LLM decision cycle
 * Converts observations into actionable context for the next reasoning iteration
 */

class FeedbackIntegrator {
  constructor() {
    this.feedbackTypes = new Set([
      'tool_success', 'tool_failure', 'environmental_change', 
      'progress_update', 'error_recovery', 'strategy_adjustment'
    ]);
    
    this.contextWindow = 5; // Number of recent observations to include in context
  }

  /**
   * Integrate observations into LLM context for next decision cycle
   * @param {Array} observations - Array of observations from environment
   * @param {Object} currentState - Current agent state
   * @returns {Object} - Integrated feedback context
   */
  integrateObservationsIntoContext(observations, currentState) {
    const recentObservations = this.getRecentObservations(observations);
    const feedbackSummary = this.summarizeFeedback(recentObservations);
    const actionableInsights = this.extractActionableInsights(recentObservations, currentState);
    
    return {
      feedbackSummary,
      actionableInsights,
      environmentalState: this.assessEnvironmentalState(recentObservations),
      recommendedActions: this.generateRecommendedActions(actionableInsights),
      confidenceAdjustment: this.calculateConfidenceAdjustment(recentObservations),
      contextForLLM: this.formatContextForLLM(feedbackSummary, actionableInsights, currentState)
    };
  }

  /**
   * Get recent observations within context window
   * @param {Array} observations - All observations
   * @returns {Array} - Recent observations
   */
  getRecentObservations(observations) {
    return observations
      .slice(-this.contextWindow)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Summarize feedback from observations
   * @param {Array} observations - Recent observations
   * @returns {Object} - Feedback summary
   */
  summarizeFeedback(observations) {
    const summary = {
      totalObservations: observations.length,
      successCount: 0,
      errorCount: 0,
      progressCount: 0,
      toolFeedbackCount: 0,
      keyFindings: [],
      patterns: []
    };

    const typeGroups = {};
    
    observations.forEach(obs => {
      // Count by type
      switch (obs.type) {
        case 'success':
          summary.successCount++;
          break;
        case 'error':
          summary.errorCount++;
          break;
        case 'progress':
          summary.progressCount++;
          break;
        case 'tool_feedback':
          summary.toolFeedbackCount++;
          break;
      }

      // Group by type for pattern analysis
      if (!typeGroups[obs.type]) {
        typeGroups[obs.type] = [];
      }
      typeGroups[obs.type].push(obs);

      // Extract key findings
      if (obs.groundTruth && Object.keys(obs.groundTruth).length > 0) {
        summary.keyFindings.push({
          type: obs.type,
          finding: obs.content,
          groundTruth: obs.groundTruth,
          confidence: obs.confidence || 0.5
        });
      }
    });

    // Identify patterns
    summary.patterns = this.identifyPatterns(typeGroups);

    return summary;
  }

  /**
   * Extract actionable insights from observations
   * @param {Array} observations - Recent observations
   * @param {Object} currentState - Current agent state
   * @returns {Array} - Actionable insights
   */
  extractActionableInsights(observations, currentState) {
    const insights = [];

    observations.forEach(obs => {
      const insight = this.analyzeObservationForInsights(obs, currentState);
      if (insight) {
        insights.push(insight);
      }
    });

    // Prioritize insights by importance
    return insights.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Analyze single observation for actionable insights
   * @param {Object} observation - Single observation
   * @param {Object} currentState - Current agent state
   * @returns {Object|null} - Insight or null
   */
  analyzeObservationForInsights(observation, currentState) {
    const insight = {
      type: 'insight',
      source: observation.type,
      priority: 0.5,
      action: null,
      reasoning: '',
      confidence: observation.confidence || 0.5
    };

    switch (observation.type) {
      case 'success':
        if (observation.toolName) {
          insight.action = 'continue_with_tool';
          insight.reasoning = `Tool '${observation.toolName}' succeeded, continue using similar tools`;
          insight.priority = 0.7;
          insight.data = { toolName: observation.toolName, result: observation.data };
        }
        break;

      case 'error':
        if (observation.toolName) {
          insight.action = 'try_alternative_tool';
          insight.reasoning = `Tool '${observation.toolName}' failed, try alternative approach`;
          insight.priority = 0.9;
          insight.data = { failedTool: observation.toolName, error: observation.data };
        } else {
          insight.action = 'adjust_strategy';
          insight.reasoning = 'Error encountered, need to adjust current strategy';
          insight.priority = 0.8;
        }
        break;

      case 'progress':
        insight.action = 'continue_current_path';
        insight.reasoning = 'Progress being made, continue current approach';
        insight.priority = 0.6;
        break;

      case 'tool_feedback':
        if (observation.groundTruth && observation.groundTruth.success === false) {
          insight.action = 'recover_from_tool_failure';
          insight.reasoning = `Tool feedback indicates failure, implement recovery strategy`;
          insight.priority = 0.85;
        } else {
          insight.action = 'leverage_tool_success';
          insight.reasoning = 'Tool feedback positive, leverage results for next steps';
          insight.priority = 0.7;
        }
        break;

      default:
        return null;
    }

    return insight;
  }

  /**
   * Assess current environmental state from observations
   * @param {Array} observations - Recent observations
   * @returns {Object} - Environmental state assessment
   */
  assessEnvironmentalState(observations) {
    const state = {
      stability: 'stable',
      toolAvailability: 'available',
      errorRate: 0,
      successRate: 0,
      overallHealth: 'healthy',
      recommendations: []
    };

    if (observations.length === 0) {
      state.stability = 'unknown';
      state.overallHealth = 'unknown';
      return state;
    }

    const successCount = observations.filter(obs => obs.type === 'success').length;
    const errorCount = observations.filter(obs => obs.type === 'error').length;
    const total = observations.length;

    state.successRate = total > 0 ? successCount / total : 0;
    state.errorRate = total > 0 ? errorCount / total : 0;

    // Assess stability
    if (state.errorRate > 0.5) {
      state.stability = 'unstable';
      state.overallHealth = 'poor';
      state.recommendations.push('High error rate detected, consider strategy change');
    } else if (state.errorRate > 0.3) {
      state.stability = 'somewhat_unstable';
      state.overallHealth = 'fair';
      state.recommendations.push('Moderate error rate, monitor closely');
    }

    // Assess tool availability
    const toolErrors = observations.filter(obs => 
      obs.type === 'error' && obs.toolName
    );
    
    if (toolErrors.length > 0) {
      state.toolAvailability = 'limited';
      state.recommendations.push('Some tools experiencing issues');
    }

    return state;
  }

  /**
   * Generate recommended actions based on insights
   * @param {Array} insights - Actionable insights
   * @returns {Array} - Recommended actions
   */
  generateRecommendedActions(insights) {
    const actions = [];
    const actionPriority = {};

    insights.forEach(insight => {
      if (insight.action) {
        if (!actionPriority[insight.action] || actionPriority[insight.action] < insight.priority) {
          actionPriority[insight.action] = insight.priority;
        }
      }
    });

    // Convert to sorted action list
    Object.entries(actionPriority)
      .sort(([,a], [,b]) => b - a)
      .forEach(([action, priority]) => {
        const relatedInsights = insights.filter(i => i.action === action);
        actions.push({
          action,
          priority,
          reasoning: relatedInsights.map(i => i.reasoning).join('; '),
          supportingInsights: relatedInsights.length
        });
      });

    return actions;
  }

  /**
   * Calculate confidence adjustment based on observations
   * @param {Array} observations - Recent observations
   * @returns {Object} - Confidence adjustment
   */
  calculateConfidenceAdjustment(observations) {
    if (observations.length === 0) {
      return { adjustment: 0, reasoning: 'No observations to base confidence on' };
    }

    const avgConfidence = observations.reduce((sum, obs) => 
      sum + (obs.confidence || 0.5), 0) / observations.length;
    
    const successRate = observations.filter(obs => obs.type === 'success').length / observations.length;
    const errorRate = observations.filter(obs => obs.type === 'error').length / observations.length;

    let adjustment = 0;
    let reasoning = '';

    if (successRate > 0.7) {
      adjustment = 0.1;
      reasoning = 'High success rate increases confidence';
    } else if (errorRate > 0.5) {
      adjustment = -0.2;
      reasoning = 'High error rate decreases confidence';
    } else if (avgConfidence > 0.8) {
      adjustment = 0.05;
      reasoning = 'High observation confidence increases overall confidence';
    }

    return {
      adjustment: Math.max(-0.3, Math.min(0.3, adjustment)),
      reasoning,
      avgObservationConfidence: avgConfidence,
      successRate,
      errorRate
    };
  }

  /**
   * Format context for LLM consumption
   * @param {Object} feedbackSummary - Feedback summary
   * @param {Array} insights - Actionable insights
   * @param {Object} currentState - Current agent state
   * @returns {string} - Formatted context for LLM
   */
  formatContextForLLM(feedbackSummary, insights, currentState) {
    let context = `Environmental Feedback Context (Iteration ${currentState.currentIteration}):\n\n`;

    // Summary section
    context += `Recent Activity Summary:\n`;
    context += `- ${feedbackSummary.totalObservations} observations processed\n`;
    context += `- ${feedbackSummary.successCount} successful operations\n`;
    context += `- ${feedbackSummary.errorCount} errors encountered\n`;
    context += `- ${feedbackSummary.progressCount} progress updates\n\n`;

    // Key findings
    if (feedbackSummary.keyFindings.length > 0) {
      context += `Key Environmental Findings:\n`;
      feedbackSummary.keyFindings.slice(0, 3).forEach((finding, index) => {
        context += `${index + 1}. ${finding.finding} (confidence: ${finding.confidence.toFixed(2)})\n`;
      });
      context += '\n';
    }

    // Top insights
    if (insights.length > 0) {
      context += `Recommended Actions Based on Environment:\n`;
      insights.slice(0, 3).forEach((insight, index) => {
        context += `${index + 1}. ${insight.reasoning} (priority: ${insight.priority.toFixed(2)})\n`;
      });
      context += '\n';
    }

    // Patterns
    if (feedbackSummary.patterns.length > 0) {
      context += `Observed Patterns:\n`;
      feedbackSummary.patterns.slice(0, 2).forEach((pattern, index) => {
        context += `${index + 1}. ${pattern}\n`;
      });
      context += '\n';
    }

    context += `Use this environmental feedback to inform your next reasoning step and action selection.`;

    return context;
  }

  /**
   * Identify patterns in observation groups
   * @param {Object} typeGroups - Observations grouped by type
   * @returns {Array} - Identified patterns
   */
  identifyPatterns(typeGroups) {
    const patterns = [];

    // Pattern: Repeated tool failures
    if (typeGroups.error && typeGroups.error.length >= 2) {
      const toolErrors = typeGroups.error.filter(obs => obs.toolName);
      if (toolErrors.length >= 2) {
        const toolNames = toolErrors.map(obs => obs.toolName);
        const uniqueTools = [...new Set(toolNames)];
        if (uniqueTools.length < toolNames.length) {
          patterns.push(`Repeated failures with tools: ${uniqueTools.join(', ')}`);
        }
      }
    }

    // Pattern: Consistent success with specific tools
    if (typeGroups.success && typeGroups.success.length >= 2) {
      const toolSuccesses = typeGroups.success.filter(obs => obs.toolName);
      if (toolSuccesses.length >= 2) {
        const toolNames = toolSuccesses.map(obs => obs.toolName);
        const toolCounts = {};
        toolNames.forEach(name => {
          toolCounts[name] = (toolCounts[name] || 0) + 1;
        });
        
        Object.entries(toolCounts).forEach(([tool, count]) => {
          if (count >= 2) {
            patterns.push(`Consistent success with tool: ${tool}`);
          }
        });
      }
    }

    // Pattern: Progress stagnation
    if (typeGroups.progress && typeGroups.progress.length >= 3) {
      const progressContents = typeGroups.progress.map(obs => obs.content);
      const uniqueProgress = [...new Set(progressContents)];
      if (uniqueProgress.length < progressContents.length * 0.7) {
        patterns.push('Progress appears to be stagnating with similar updates');
      }
    }

    return patterns;
  }

  /**
   * Create progress assessment from environmental responses
   * @param {Array} observations - All observations
   * @param {Object} currentState - Current agent state
   * @returns {Object} - Progress assessment
   */
  createProgressAssessment(observations, currentState) {
    const assessment = {
      overallProgress: 'unknown',
      progressScore: 0,
      milestones: [],
      blockers: [],
      recommendations: [],
      nextSteps: []
    };

    if (observations.length === 0) {
      assessment.overallProgress = 'no_data';
      assessment.recommendations.push('No environmental feedback available for assessment');
      return assessment;
    }

    // Calculate progress score based on observation types and success rates
    const recentObservations = this.getRecentObservations(observations);
    const successCount = recentObservations.filter(obs => obs.type === 'success').length;
    const errorCount = recentObservations.filter(obs => obs.type === 'error').length;
    const progressCount = recentObservations.filter(obs => obs.type === 'progress').length;

    assessment.progressScore = Math.max(0, Math.min(1, 
      (successCount * 0.4 + progressCount * 0.3 - errorCount * 0.3) / recentObservations.length
    ));

    // Determine overall progress
    if (assessment.progressScore > 0.7) {
      assessment.overallProgress = 'excellent';
    } else if (assessment.progressScore > 0.5) {
      assessment.overallProgress = 'good';
    } else if (assessment.progressScore > 0.3) {
      assessment.overallProgress = 'fair';
    } else {
      assessment.overallProgress = 'poor';
    }

    // Identify milestones (successful tool executions or significant progress)
    recentObservations.forEach(obs => {
      if (obs.type === 'success' && obs.toolName) {
        assessment.milestones.push({
          type: 'tool_success',
          description: `Successfully executed ${obs.toolName}`,
          timestamp: obs.timestamp,
          data: obs.data
        });
      } else if (obs.type === 'progress' && obs.confidence > 0.7) {
        assessment.milestones.push({
          type: 'progress_milestone',
          description: obs.content,
          timestamp: obs.timestamp,
          confidence: obs.confidence
        });
      }
    });

    // Identify blockers (errors or failures)
    recentObservations.forEach(obs => {
      if (obs.type === 'error') {
        assessment.blockers.push({
          type: 'error_blocker',
          description: obs.content,
          timestamp: obs.timestamp,
          toolName: obs.toolName,
          data: obs.data
        });
      }
    });

    // Generate recommendations based on assessment
    if (assessment.progressScore < 0.3) {
      assessment.recommendations.push('Consider changing strategy due to poor progress');
    }
    
    if (assessment.blockers.length > assessment.milestones.length) {
      assessment.recommendations.push('Focus on resolving blockers before proceeding');
    }

    if (assessment.milestones.length > 0) {
      assessment.recommendations.push('Build on recent successes');
    }

    return assessment;
  }
}

export default FeedbackIntegrator;