/**
 * Agent State Management
 * Handles state persistence and tracking across agent iterations
 */

class AgentState {
  constructor() {
    this.state = this.createInitialState();
  }

  /**
   * Create initial agent state structure
   * @returns {Object} - Initial state object
   */
  createInitialState() {
    return {
      // Core identification
      sessionId: this.generateSessionId(),
      originalQuery: '',
      
      // Iteration tracking
      currentIteration: 0,
      maxIterations: 10,
      
      // Agent progress
      reasoning: [],
      actions: [],
      observations: [],
      
      // Tool and strategy management
      availableTools: [],
      strategy: 'default',
      confidence: 0,
      
      // Status tracking
      status: 'not_started', // not_started, processing, completed, error, max_iterations_reached
      
      // Timing information
      startTime: null,
      lastUpdate: null,
      executionTime: 0,
      
      // Error handling
      errors: [],
      recoveryAttempts: 0,
      
      // Human interaction
      humanCheckpoints: [],
      awaitingHumanInput: false,
      
      // Performance metrics
      metrics: {
        llmCalls: 0,
        toolCalls: 0,
        successfulActions: 0,
        failedActions: 0
      }
    };
  }

  /**
   * Initialize state for new query
   * @param {string} query - User query
   * @param {Object} config - Configuration options
   */
  initialize(query, config = {}) {
    this.state = this.createInitialState();
    this.state.originalQuery = query;
    this.state.maxIterations = config.maxIterations || 10;
    this.state.strategy = config.strategy || 'default';
    this.state.startTime = new Date();
    this.state.lastUpdate = new Date();
    this.state.status = 'processing';
    
    console.log(`Agent state initialized for query: "${query}"`);
  }

  /**
   * Update iteration counter
   */
  incrementIteration() {
    this.state.currentIteration++;
    this.state.lastUpdate = new Date();
    this.updateExecutionTime();
  }

  /**
   * Add reasoning entry
   * @param {string} content - Reasoning content
   * @param {Object} metadata - Additional metadata
   */
  addReasoning(content, metadata = {}) {
    const reasoning = {
      iteration: this.state.currentIteration,
      content: content,
      timestamp: new Date(),
      confidence: metadata.confidence || 0,
      strategy: metadata.strategy || this.state.strategy,
      ...metadata
    };
    
    this.state.reasoning.push(reasoning);
    this.state.lastUpdate = new Date();
    
    console.log(`Reasoning added for iteration ${this.state.currentIteration}`);
  }

  /**
   * Add action entry
   * @param {Object} action - Action object
   */
  addAction(action) {
    const actionEntry = {
      iteration: this.state.currentIteration,
      timestamp: new Date(),
      id: this.generateActionId(),
      ...action
    };
    
    this.state.actions.push(actionEntry);
    this.state.lastUpdate = new Date();
    
    // Update metrics
    if (action.success !== false) {
      this.state.metrics.successfulActions++;
    } else {
      this.state.metrics.failedActions++;
    }
    
    console.log(`Action added: ${action.type} (${actionEntry.id})`);
  }

  /**
   * Add observation entry
   * @param {Object} observation - Observation object
   */
  addObservation(observation) {
    const observationEntry = {
      iteration: this.state.currentIteration,
      timestamp: new Date(),
      id: this.generateObservationId(),
      ...observation
    };
    
    this.state.observations.push(observationEntry);
    this.state.lastUpdate = new Date();
    
    console.log(`Observation added: ${observation.type} (${observationEntry.id})`);
  }

  /**
   * Update confidence level
   * @param {number} confidence - New confidence level (0-1)
   */
  updateConfidence(confidence) {
    this.state.confidence = Math.max(0, Math.min(1, confidence));
    this.state.lastUpdate = new Date();
  }

  /**
   * Update agent status
   * @param {string} status - New status
   * @param {string} reason - Reason for status change
   */
  updateStatus(status, reason = '') {
    const previousStatus = this.state.status;
    this.state.status = status;
    this.state.lastUpdate = new Date();
    
    console.log(`Agent status changed: ${previousStatus} -> ${status} (${reason})`);
  }

  /**
   * Add error to state
   * @param {Error} error - Error object
   * @param {Object} context - Error context
   */
  addError(error, context = {}) {
    const errorEntry = {
      iteration: this.state.currentIteration,
      timestamp: new Date(),
      message: error.message,
      type: error.name || 'Error',
      stack: error.stack,
      context: context
    };
    
    this.state.errors.push(errorEntry);
    this.state.lastUpdate = new Date();
    
    console.error(`Error added to agent state: ${error.message}`);
  }

  /**
   * Add human checkpoint
   * @param {string} reason - Reason for checkpoint
   * @param {Object} data - Checkpoint data
   */
  addHumanCheckpoint(reason, data = {}) {
    const checkpoint = {
      iteration: this.state.currentIteration,
      timestamp: new Date(),
      reason: reason,
      data: data,
      resolved: false
    };
    
    this.state.humanCheckpoints.push(checkpoint);
    this.state.awaitingHumanInput = true;
    this.state.lastUpdate = new Date();
    
    console.log(`Human checkpoint added: ${reason}`);
  }

  /**
   * Resolve human checkpoint
   * @param {Object} resolution - Resolution data
   */
  resolveHumanCheckpoint(resolution = {}) {
    if (this.state.humanCheckpoints.length > 0) {
      const lastCheckpoint = this.state.humanCheckpoints[this.state.humanCheckpoints.length - 1];
      lastCheckpoint.resolved = true;
      lastCheckpoint.resolution = resolution;
      lastCheckpoint.resolvedAt = new Date();
    }
    
    this.state.awaitingHumanInput = false;
    this.state.lastUpdate = new Date();
    
    console.log('Human checkpoint resolved');
  }

  /**
   * Update execution metrics
   * @param {string} metricType - Type of metric to update
   * @param {number} increment - Amount to increment (default 1)
   */
  updateMetrics(metricType, increment = 1) {
    if (this.state.metrics.hasOwnProperty(metricType)) {
      this.state.metrics[metricType] += increment;
      this.state.lastUpdate = new Date();
    }
  }

  /**
   * Get current state snapshot
   * @returns {Object} - Current state
   */
  getState() {
    this.updateExecutionTime();
    return { ...this.state };
  }

  /**
   * Get state summary for logging/debugging
   * @returns {Object} - State summary
   */
  getSummary() {
    return {
      sessionId: this.state.sessionId,
      query: this.state.originalQuery,
      iteration: this.state.currentIteration,
      status: this.state.status,
      confidence: this.state.confidence,
      executionTime: this.state.executionTime,
      reasoningCount: this.state.reasoning.length,
      actionCount: this.state.actions.length,
      observationCount: this.state.observations.length,
      errorCount: this.state.errors.length,
      metrics: this.state.metrics
    };
  }

  /**
   * Check if agent should continue processing
   * @returns {boolean} - Whether to continue
   */
  shouldContinue() {
    if (this.state.status === 'completed') return false;
    if (this.state.status === 'error') return false;
    if (this.state.currentIteration >= this.state.maxIterations) return false;
    if (this.state.awaitingHumanInput) return false;
    
    return true;
  }

  /**
   * Reset state to initial values
   */
  reset() {
    this.state = this.createInitialState();
    console.log('Agent state reset');
  }

  /**
   * Update execution time
   */
  updateExecutionTime() {
    if (this.state.startTime) {
      this.state.executionTime = new Date() - this.state.startTime;
    }
  }

  /**
   * Generate unique session ID
   * @returns {string} - Session ID
   */
  generateSessionId() {
    return 'agent_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }

  /**
   * Generate unique action ID
   * @returns {string} - Action ID
   */
  generateActionId() {
    return 'action_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  }

  /**
   * Generate unique observation ID
   * @returns {string} - Observation ID
   */
  generateObservationId() {
    return 'obs_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  }
}

export default AgentState;