/**
 * Human Interaction API
 * Provides interface for humans to interact with the agent system
 */

class HumanInteractionAPI {
  constructor(agentController) {
    this.agentController = agentController;
  }

  /**
   * Get current agent status and any pending checkpoints
   * @returns {Object} - Current status and interaction opportunities
   */
  getAgentStatus() {
    const agentStatus = this.agentController.getAgentStatus();
    const humanInteractionStatus = this.agentController.getHumanInteractionStatus();
    const autonomousStatus = this.agentController.getAutonomousOperationStatus();

    return {
      agent: agentStatus,
      humanInteraction: humanInteractionStatus,
      autonomous: autonomousStatus,
      needsAttention: this.determineAttentionNeeds(humanInteractionStatus, autonomousStatus)
    };
  }

  /**
   * Get pending checkpoints that need human attention
   * @returns {Array} - Array of pending checkpoints
   */
  getPendingCheckpoints() {
    const humanInteractionStatus = this.agentController.getHumanInteractionStatus();
    return humanInteractionStatus.pendingCheckpoints.map(checkpoint => ({
      id: checkpoint.id,
      reason: checkpoint.reason,
      priority: checkpoint.priority,
      timestamp: checkpoint.timestamp,
      iteration: checkpoint.iteration,
      context: this.formatCheckpointContext(checkpoint.context),
      recommendedActions: this.getCheckpointRecommendations(checkpoint)
    }));
  }

  /**
   * Get detected blockers that need human intervention
   * @returns {Array} - Array of active blockers
   */
  getActiveBlockers() {
    const humanInteractionStatus = this.agentController.getHumanInteractionStatus();
    return humanInteractionStatus.blockers
      .filter(blocker => blocker.status === 'detected')
      .map(blocker => ({
        id: blocker.id,
        type: blocker.blocker.type,
        severity: blocker.blocker.severity,
        description: blocker.blocker.description,
        evidence: blocker.blocker.evidence,
        recommendation: blocker.blocker.recommendation,
        timestamp: blocker.timestamp,
        iteration: blocker.iteration
      }));
  }

  /**
   * Get agent progress communication for human understanding
   * @returns {Object} - Latest progress communication
   */
  getProgressCommunication() {
    const humanInteractionStatus = this.agentController.getHumanInteractionStatus();
    const communications = humanInteractionStatus.communicationHistory;
    
    if (communications.length === 0) {
      return null;
    }

    const latest = communications[communications.length - 1];
    return {
      summary: latest.summary,
      reasoning: latest.reasoning.slice(-3), // Last 3 reasoning steps
      actions: latest.actions.slice(-3), // Last 3 actions
      currentStatus: latest.currentStatus,
      nextSteps: latest.nextSteps,
      confidence: latest.confidence,
      needsInput: latest.needsInput,
      timestamp: latest.timestamp
    };
  }

  /**
   * Provide human input to resolve a checkpoint
   * @param {string} checkpointId - Checkpoint ID to resolve
   * @param {Object} humanInput - Human input and guidance
   * @returns {Promise<Object>} - Resolution result
   */
  async provideHumanInput(checkpointId, humanInput) {
    try {
      // Validate checkpoint exists and is pending
      const pendingCheckpoints = this.getPendingCheckpoints();
      const checkpoint = pendingCheckpoints.find(c => c.id === checkpointId);
      
      if (!checkpoint) {
        throw new Error(`Checkpoint ${checkpointId} not found or already resolved`);
      }

      console.log(`Human input provided for checkpoint: ${checkpointId}`);

      // Process human input
      const processedInput = this.processHumanInput(humanInput, checkpoint);

      // Resume agent operation with human input
      const result = await this.agentController.resumeAfterHumanInput(checkpointId, processedInput);

      return {
        success: true,
        checkpointId: checkpointId,
        inputProcessed: processedInput,
        agentResult: result,
        message: 'Human input successfully provided and agent resumed'
      };

    } catch (error) {
      console.error('Error providing human input:', error);
      return {
        success: false,
        checkpointId: checkpointId,
        error: error.message,
        message: 'Failed to process human input'
      };
    }
  }

  /**
   * Provide guidance to help agent overcome a blocker
   * @param {string} blockerId - Blocker ID to address
   * @param {Object} guidance - Human guidance for blocker resolution
   * @returns {Promise<Object>} - Guidance result
   */
  async provideBlockerGuidance(blockerId, guidance) {
    try {
      const activeBlockers = this.getActiveBlockers();
      const blocker = activeBlockers.find(b => b.id === blockerId);
      
      if (!blocker) {
        throw new Error(`Blocker ${blockerId} not found or already resolved`);
      }

      console.log(`Human guidance provided for blocker: ${blockerId}`);

      // Create checkpoint for blocker resolution
      const checkpoint = this.agentController.humanInteractionManager.createCheckpoint(
        'blocker_resolution',
        this.agentController.agentState.getState(),
        { 
          blockerId: blockerId,
          blocker: blocker,
          guidance: guidance
        }
      );

      // Process guidance
      const processedGuidance = this.processBlockerGuidance(guidance, blocker);

      // Resume with guidance
      const result = await this.agentController.resumeAfterHumanInput(checkpoint.id, {
        type: 'blocker_guidance',
        guidance: processedGuidance,
        blockerId: blockerId
      });

      return {
        success: true,
        blockerId: blockerId,
        checkpointId: checkpoint.id,
        guidanceProcessed: processedGuidance,
        agentResult: result,
        message: 'Blocker guidance successfully provided'
      };

    } catch (error) {
      console.error('Error providing blocker guidance:', error);
      return {
        success: false,
        blockerId: blockerId,
        error: error.message,
        message: 'Failed to process blocker guidance'
      };
    }
  }

  /**
   * Set agent operation mode
   * @param {string} mode - Operation mode ('autonomous', 'supervised', 'manual')
   * @returns {Object} - Mode change result
   */
  setOperationMode(mode) {
    try {
      this.agentController.setAutonomousMode(mode);
      
      return {
        success: true,
        previousMode: this.agentController.autonomousOperationManager.operationMode,
        newMode: mode,
        message: `Operation mode changed to ${mode}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to change operation mode'
      };
    }
  }

  /**
   * Configure autonomous operation parameters
   * @param {Object} config - Configuration parameters
   * @returns {Object} - Configuration result
   */
  configureAutonomousOperation(config) {
    try {
      this.agentController.configureAutonomousOperation(config);
      
      return {
        success: true,
        configuration: this.agentController.autonomousOperationManager.getConfiguration(),
        message: 'Autonomous operation configured successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to configure autonomous operation'
      };
    }
  }

  /**
   * Get agent reasoning explanation for human understanding
   * @returns {Object} - Reasoning explanation
   */
  getReasoningExplanation() {
    const agentState = this.agentController.agentState.getState();
    const reasoning = agentState.reasoning || [];
    
    if (reasoning.length === 0) {
      return {
        hasReasoning: false,
        message: 'No reasoning steps available yet'
      };
    }

    return {
      hasReasoning: true,
      totalSteps: reasoning.length,
      currentIteration: agentState.currentIteration,
      confidence: agentState.confidence,
      strategy: agentState.strategy,
      reasoningSteps: reasoning.map((r, index) => ({
        step: index + 1,
        iteration: r.iteration,
        summary: this.summarizeReasoning(r.content),
        fullContent: r.content,
        confidence: r.confidence,
        timestamp: r.timestamp
      })),
      progressSummary: this.createReasoningProgressSummary(reasoning, agentState)
    };
  }

  /**
   * Process human input for checkpoint resolution
   * @param {Object} humanInput - Raw human input
   * @param {Object} checkpoint - Checkpoint context
   * @returns {Object} - Processed input
   */
  processHumanInput(humanInput, checkpoint) {
    const processed = {
      type: 'human_input',
      timestamp: new Date(),
      checkpointId: checkpoint.id,
      checkpointReason: checkpoint.reason
    };

    // Process different types of input
    if (humanInput.guidance) {
      processed.guidance = {
        strategy: humanInput.guidance.strategy,
        confidence: humanInput.guidance.confidence,
        maxIterations: humanInput.guidance.maxIterations,
        reasoning: humanInput.guidance.reasoning,
        direction: humanInput.guidance.direction
      };
    }

    if (humanInput.decision) {
      processed.decision = humanInput.decision; // 'continue', 'stop', 'modify'
    }

    if (humanInput.clarification) {
      processed.clarification = humanInput.clarification;
    }

    if (humanInput.feedback) {
      processed.feedback = humanInput.feedback;
    }

    return processed;
  }

  /**
   * Process blocker guidance
   * @param {Object} guidance - Raw guidance
   * @param {Object} blocker - Blocker context
   * @returns {Object} - Processed guidance
   */
  processBlockerGuidance(guidance, blocker) {
    return {
      blockerType: blocker.type,
      strategy: guidance.strategy || 'default',
      approach: guidance.approach,
      parameters: guidance.parameters,
      constraints: guidance.constraints,
      alternatives: guidance.alternatives,
      priority: guidance.priority || 'medium'
    };
  }

  /**
   * Format checkpoint context for human consumption
   * @param {Object} context - Raw checkpoint context
   * @returns {Object} - Formatted context
   */
  formatCheckpointContext(context) {
    if (!context) return {};

    return {
      decision: context.decision ? {
        reason: context.decision.reason,
        confidence: context.decision.confidence,
        riskScore: context.decision.riskScore,
        trigger: context.decision.trigger
      } : null,
      blocker: context.blocker ? {
        type: context.blocker.type,
        severity: context.blocker.severity,
        description: context.blocker.description
      } : null,
      recommendation: context.recommendation || null
    };
  }

  /**
   * Get recommendations for checkpoint resolution
   * @param {Object} checkpoint - Checkpoint object
   * @returns {Array} - Array of recommendations
   */
  getCheckpointRecommendations(checkpoint) {
    const recommendations = [];

    switch (checkpoint.reason) {
      case 'low_confidence':
        recommendations.push(
          'Provide clarification on requirements',
          'Suggest alternative approach',
          'Break down into smaller tasks',
          'Provide examples or context'
        );
        break;
      case 'repeated_failures':
        recommendations.push(
          'Review error patterns',
          'Modify strategy',
          'Provide additional context',
          'Simplify requirements'
        );
        break;
      case 'complexity_overload':
        recommendations.push(
          'Break into subtasks',
          'Prioritize requirements',
          'Provide step-by-step guidance',
          'Simplify objectives'
        );
        break;
      case 'safety_concern':
        recommendations.push(
          'Review safety implications',
          'Validate request legitimacy',
          'Modify approach if needed',
          'Abort if unsafe'
        );
        break;
      default:
        recommendations.push(
          'Review current progress',
          'Provide guidance or clarification',
          'Adjust approach if needed',
          'Continue or modify task'
        );
    }

    return recommendations;
  }

  /**
   * Determine what needs human attention
   * @param {Object} humanInteractionStatus - Human interaction status
   * @param {Object} autonomousStatus - Autonomous operation status
   * @returns {Object} - Attention needs
   */
  determineAttentionNeeds(humanInteractionStatus, autonomousStatus) {
    const needs = {
      urgent: [],
      important: [],
      informational: []
    };

    // Check for urgent needs
    const criticalBlockers = humanInteractionStatus.blockers.filter(
      b => b.blocker && b.blocker.severity === 'high'
    );
    if (criticalBlockers.length > 0) {
      needs.urgent.push(`${criticalBlockers.length} critical blocker(s) detected`);
    }

    const highPriorityCheckpoints = humanInteractionStatus.pendingCheckpoints.filter(
      c => c.priority === 'high'
    );
    if (highPriorityCheckpoints.length > 0) {
      needs.urgent.push(`${highPriorityCheckpoints.length} high priority checkpoint(s) pending`);
    }

    // Check for important needs
    if (autonomousStatus.awaitingHumanInput) {
      needs.important.push('Agent is awaiting human input');
    }

    const mediumPriorityCheckpoints = humanInteractionStatus.pendingCheckpoints.filter(
      c => c.priority === 'medium'
    );
    if (mediumPriorityCheckpoints.length > 0) {
      needs.important.push(`${mediumPriorityCheckpoints.length} checkpoint(s) need attention`);
    }

    // Check for informational needs
    if (autonomousStatus.isRunning) {
      needs.informational.push('Agent is currently running');
    }

    const recentDecisions = autonomousStatus.decisionHistory.slice(-3);
    const recentHumanRequests = recentDecisions.filter(d => !d.decision).length;
    if (recentHumanRequests > 1) {
      needs.informational.push('Agent has frequently requested human input recently');
    }

    return needs;
  }

  /**
   * Summarize reasoning for human consumption
   * @param {string} reasoning - Full reasoning content
   * @returns {string} - Summarized reasoning
   */
  summarizeReasoning(reasoning) {
    if (reasoning.length <= 150) {
      return reasoning;
    }

    // Extract first sentence or first 150 characters
    const firstSentence = reasoning.split('.')[0];
    if (firstSentence.length <= 150) {
      return firstSentence + '.';
    }

    return reasoning.substring(0, 147) + '...';
  }

  /**
   * Create reasoning progress summary
   * @param {Array} reasoning - Reasoning array
   * @param {Object} agentState - Agent state
   * @returns {Object} - Progress summary
   */
  createReasoningProgressSummary(reasoning, agentState) {
    const totalSteps = reasoning.length;
    const avgConfidence = reasoning.reduce((sum, r) => sum + (r.confidence || 0), 0) / totalSteps;
    
    const recentReasoning = reasoning.slice(-3);
    const recentAvgConfidence = recentReasoning.reduce((sum, r) => sum + (r.confidence || 0), 0) / recentReasoning.length;
    
    const confidenceTrend = recentAvgConfidence > avgConfidence ? 'improving' : 
                           recentAvgConfidence < avgConfidence ? 'declining' : 'stable';

    return {
      totalSteps: totalSteps,
      averageConfidence: avgConfidence,
      recentConfidence: recentAvgConfidence,
      confidenceTrend: confidenceTrend,
      currentIteration: agentState.currentIteration,
      maxIterations: agentState.maxIterations,
      progressPercentage: (agentState.currentIteration / agentState.maxIterations) * 100,
      status: agentState.status
    };
  }
}

export default HumanInteractionAPI;