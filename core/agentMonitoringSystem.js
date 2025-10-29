/**
 * Agent Monitoring System - Comprehensive logging and monitoring
 * Tracks agent decision-making process, performance, and safety metrics
 */

class AgentMonitoringSystem {
  constructor() {
    this.sessions = new Map();
    this.globalMetrics = {
      totalSessions: 0,
      totalQueries: 0,
      totalIterations: 0,
      totalToolExecutions: 0,
      totalErrors: 0,
      averageProcessingTime: 0,
      successRate: 0
    };
    this.performanceThresholds = {
      maxProcessingTimeMs: 300000, // 5 minutes
      maxIterationsPerQuery: 10,
      maxErrorsPerSession: 5,
      minSuccessRate: 0.8
    };
    this.alertCallbacks = [];
    this.logLevel = 'INFO'; // DEBUG, INFO, WARN, ERROR
  }

  /**
   * Start monitoring a new session
   * @param {string} sessionId - Session identifier
   * @param {Object} config - Session configuration
   */
  startSession(sessionId, config = {}) {
    const session = {
      sessionId,
      startTime: new Date(),
      endTime: null,
      config,
      queries: [],
      metrics: {
        totalQueries: 0,
        totalIterations: 0,
        totalToolExecutions: 0,
        totalErrors: 0,
        totalProcessingTime: 0,
        successfulQueries: 0,
        failedQueries: 0
      },
      alerts: [],
      status: 'active'
    };

    this.sessions.set(sessionId, session);
    this.globalMetrics.totalSessions++;

    this.log('INFO', `Session started: ${sessionId}`, { config });
    return session;
  }

  /**
   * Start monitoring a query within a session
   * @param {string} sessionId - Session identifier
   * @param {string} queryId - Query identifier
   * @param {string} query - User query
   * @param {Object} config - Query configuration
   */
  startQuery(sessionId, queryId, query, config = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.log('WARN', `Session not found for query: ${sessionId}`);
      return null;
    }

    const queryRecord = {
      queryId,
      query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
      startTime: new Date(),
      endTime: null,
      config,
      iterations: [],
      toolExecutions: [],
      errors: [],
      finalResult: null,
      status: 'processing',
      metrics: {
        processingTime: 0,
        iterationCount: 0,
        toolExecutionCount: 0,
        errorCount: 0,
        confidence: 0,
        success: false
      }
    };

    session.queries.push(queryRecord);
    session.metrics.totalQueries++;
    this.globalMetrics.totalQueries++;

    this.log('INFO', `Query started: ${queryId}`, { 
      sessionId, 
      query: queryRecord.query 
    });

    return queryRecord;
  }

  /**
   * Record an iteration within a query
   * @param {string} sessionId - Session identifier
   * @param {string} queryId - Query identifier
   * @param {Object} iterationData - Iteration data
   */
  recordIteration(sessionId, queryId, iterationData) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const queryRecord = session.queries.find(q => q.queryId === queryId);
    if (!queryRecord) return;

    const iteration = {
      iterationNumber: iterationData.iterationNumber,
      timestamp: new Date(),
      reasoning: iterationData.reasoning?.substring(0, 500) + '...',
      action: iterationData.action,
      observations: iterationData.observations?.length || 0,
      confidence: iterationData.confidence || 0,
      processingTime: iterationData.processingTime || 0,
      toolsUsed: iterationData.toolsUsed || [],
      errors: iterationData.errors || []
    };

    queryRecord.iterations.push(iteration);
    queryRecord.metrics.iterationCount++;
    session.metrics.totalIterations++;
    this.globalMetrics.totalIterations++;

    // Check for performance alerts
    this.checkIterationAlerts(sessionId, queryId, iteration);

    this.log('DEBUG', `Iteration recorded: ${queryId}#${iteration.iterationNumber}`, {
      sessionId,
      confidence: iteration.confidence,
      toolsUsed: iteration.toolsUsed.length
    });
  }

  /**
   * Record a tool execution
   * @param {string} sessionId - Session identifier
   * @param {string} queryId - Query identifier
   * @param {Object} toolExecution - Tool execution data
   */
  recordToolExecution(sessionId, queryId, toolExecution) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const queryRecord = session.queries.find(q => q.queryId === queryId);
    if (!queryRecord) return;

    const execution = {
      toolName: toolExecution.toolName,
      timestamp: new Date(),
      parameters: toolExecution.parameters,
      success: toolExecution.success,
      executionTime: toolExecution.executionTime || 0,
      result: toolExecution.result,
      error: toolExecution.error,
      observations: toolExecution.observations?.length || 0
    };

    queryRecord.toolExecutions.push(execution);
    queryRecord.metrics.toolExecutionCount++;
    session.metrics.totalToolExecutions++;
    this.globalMetrics.totalToolExecutions++;

    // Check for tool execution alerts
    this.checkToolExecutionAlerts(sessionId, queryId, execution);

    this.log('DEBUG', `Tool execution recorded: ${toolExecution.toolName}`, {
      sessionId,
      queryId,
      success: execution.success,
      executionTime: execution.executionTime
    });
  }

  /**
   * Record an error
   * @param {string} sessionId - Session identifier
   * @param {string} queryId - Query identifier
   * @param {Object} error - Error data
   */
  recordError(sessionId, queryId, error) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const queryRecord = session.queries.find(q => q.queryId === queryId);
    if (!queryRecord) return;

    const errorRecord = {
      timestamp: new Date(),
      type: error.type || 'unknown_error',
      message: error.message,
      phase: error.phase || 'unknown',
      iteration: error.iteration,
      toolName: error.toolName,
      recoverable: error.recoverable || false,
      recovered: false,
      stack: error.stack
    };

    queryRecord.errors.push(errorRecord);
    queryRecord.metrics.errorCount++;
    session.metrics.totalErrors++;
    this.globalMetrics.totalErrors++;

    // Check for error alerts
    this.checkErrorAlerts(sessionId, queryId, errorRecord);

    this.log('ERROR', `Error recorded: ${error.type}`, {
      sessionId,
      queryId,
      message: error.message,
      phase: error.phase
    });
  }

  /**
   * Complete a query
   * @param {string} sessionId - Session identifier
   * @param {string} queryId - Query identifier
   * @param {Object} result - Final result
   */
  completeQuery(sessionId, queryId, result) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const queryRecord = session.queries.find(q => q.queryId === queryId);
    if (!queryRecord) return;

    queryRecord.endTime = new Date();
    queryRecord.status = result.success ? 'completed' : 'failed';
    queryRecord.finalResult = result;
    queryRecord.metrics.processingTime = queryRecord.endTime - queryRecord.startTime;
    queryRecord.metrics.confidence = result.finalConfidence || 0;
    queryRecord.metrics.success = result.success;

    // Update session metrics
    if (result.success) {
      session.metrics.successfulQueries++;
    } else {
      session.metrics.failedQueries++;
    }

    session.metrics.totalProcessingTime += queryRecord.metrics.processingTime;

    // Check for completion alerts
    this.checkCompletionAlerts(sessionId, queryId, queryRecord);

    this.log('INFO', `Query completed: ${queryId}`, {
      sessionId,
      success: result.success,
      processingTime: queryRecord.metrics.processingTime,
      iterations: queryRecord.metrics.iterationCount,
      confidence: queryRecord.metrics.confidence
    });
  }

  /**
   * End a session
   * @param {string} sessionId - Session identifier
   */
  endSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.endTime = new Date();
    session.status = 'completed';

    // Calculate session-level metrics
    const sessionDuration = session.endTime - session.startTime;
    const successRate = session.metrics.totalQueries > 0 
      ? session.metrics.successfulQueries / session.metrics.totalQueries 
      : 0;

    // Update global metrics
    this.updateGlobalMetrics();

    this.log('INFO', `Session ended: ${sessionId}`, {
      duration: sessionDuration,
      queries: session.metrics.totalQueries,
      successRate: successRate,
      totalIterations: session.metrics.totalIterations
    });

    // Check for session-level alerts
    this.checkSessionAlerts(sessionId, session);
  }

  /**
   * Check for iteration-level alerts
   * @param {string} sessionId - Session identifier
   * @param {string} queryId - Query identifier
   * @param {Object} iteration - Iteration data
   */
  checkIterationAlerts(sessionId, queryId, iteration) {
    const alerts = [];

    // High iteration count alert
    if (iteration.iterationNumber > this.performanceThresholds.maxIterationsPerQuery * 0.8) {
      alerts.push({
        type: 'high_iteration_count',
        severity: 'warning',
        message: `Query approaching maximum iterations: ${iteration.iterationNumber}`,
        data: { iterationNumber: iteration.iterationNumber }
      });
    }

    // Low confidence alert
    if (iteration.confidence < 0.3) {
      alerts.push({
        type: 'low_confidence',
        severity: 'warning',
        message: `Low confidence detected: ${iteration.confidence}`,
        data: { confidence: iteration.confidence }
      });
    }

    // Process alerts
    alerts.forEach(alert => this.processAlert(sessionId, queryId, alert));
  }

  /**
   * Check for tool execution alerts
   * @param {string} sessionId - Session identifier
   * @param {string} queryId - Query identifier
   * @param {Object} execution - Tool execution data
   */
  checkToolExecutionAlerts(sessionId, queryId, execution) {
    const alerts = [];

    // Tool execution failure alert
    if (!execution.success) {
      alerts.push({
        type: 'tool_execution_failure',
        severity: 'error',
        message: `Tool execution failed: ${execution.toolName}`,
        data: { toolName: execution.toolName, error: execution.error }
      });
    }

    // Slow tool execution alert
    if (execution.executionTime > 10000) { // 10 seconds
      alerts.push({
        type: 'slow_tool_execution',
        severity: 'warning',
        message: `Slow tool execution: ${execution.toolName} (${execution.executionTime}ms)`,
        data: { toolName: execution.toolName, executionTime: execution.executionTime }
      });
    }

    // Process alerts
    alerts.forEach(alert => this.processAlert(sessionId, queryId, alert));
  }

  /**
   * Check for error alerts
   * @param {string} sessionId - Session identifier
   * @param {string} queryId - Query identifier
   * @param {Object} error - Error data
   */
  checkErrorAlerts(sessionId, queryId, error) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const queryRecord = session.queries.find(q => q.queryId === queryId);
    if (!queryRecord) return;

    const alerts = [];

    // High error count alert
    if (queryRecord.metrics.errorCount > this.performanceThresholds.maxErrorsPerSession * 0.6) {
      alerts.push({
        type: 'high_error_count',
        severity: 'error',
        message: `High error count in query: ${queryRecord.metrics.errorCount}`,
        data: { errorCount: queryRecord.metrics.errorCount }
      });
    }

    // Critical error alert
    if (error.type === 'critical_error' || error.type === 'system_error') {
      alerts.push({
        type: 'critical_error',
        severity: 'critical',
        message: `Critical error occurred: ${error.message}`,
        data: { errorType: error.type, message: error.message }
      });
    }

    // Process alerts
    alerts.forEach(alert => this.processAlert(sessionId, queryId, alert));
  }

  /**
   * Check for completion alerts
   * @param {string} sessionId - Session identifier
   * @param {string} queryId - Query identifier
   * @param {Object} queryRecord - Query record
   */
  checkCompletionAlerts(sessionId, queryId, queryRecord) {
    const alerts = [];

    // Long processing time alert
    if (queryRecord.metrics.processingTime > this.performanceThresholds.maxProcessingTimeMs * 0.8) {
      alerts.push({
        type: 'long_processing_time',
        severity: 'warning',
        message: `Long processing time: ${queryRecord.metrics.processingTime}ms`,
        data: { processingTime: queryRecord.metrics.processingTime }
      });
    }

    // Low final confidence alert
    if (queryRecord.metrics.success && queryRecord.metrics.confidence < 0.5) {
      alerts.push({
        type: 'low_final_confidence',
        severity: 'warning',
        message: `Query completed with low confidence: ${queryRecord.metrics.confidence}`,
        data: { confidence: queryRecord.metrics.confidence }
      });
    }

    // Process alerts
    alerts.forEach(alert => this.processAlert(sessionId, queryId, alert));
  }

  /**
   * Check for session-level alerts
   * @param {string} sessionId - Session identifier
   * @param {Object} session - Session data
   */
  checkSessionAlerts(sessionId, session) {
    const alerts = [];
    const successRate = session.metrics.totalQueries > 0 
      ? session.metrics.successfulQueries / session.metrics.totalQueries 
      : 0;

    // Low success rate alert
    if (successRate < this.performanceThresholds.minSuccessRate) {
      alerts.push({
        type: 'low_success_rate',
        severity: 'error',
        message: `Low session success rate: ${(successRate * 100).toFixed(1)}%`,
        data: { successRate: successRate }
      });
    }

    // High error rate alert
    if (session.metrics.totalErrors > this.performanceThresholds.maxErrorsPerSession) {
      alerts.push({
        type: 'high_session_error_count',
        severity: 'error',
        message: `High error count in session: ${session.metrics.totalErrors}`,
        data: { errorCount: session.metrics.totalErrors }
      });
    }

    // Process alerts
    alerts.forEach(alert => this.processAlert(sessionId, null, alert));
  }

  /**
   * Process an alert
   * @param {string} sessionId - Session identifier
   * @param {string} queryId - Query identifier (optional)
   * @param {Object} alert - Alert data
   */
  processAlert(sessionId, queryId, alert) {
    const alertRecord = {
      ...alert,
      sessionId,
      queryId,
      timestamp: new Date(),
      id: this.generateAlertId()
    };

    // Add to session alerts
    const session = this.sessions.get(sessionId);
    if (session) {
      session.alerts.push(alertRecord);
    }

    // Log alert
    this.log(alert.severity.toUpperCase(), `ALERT: ${alert.message}`, {
      sessionId,
      queryId,
      alertType: alert.type,
      data: alert.data
    });

    // Notify alert callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alertRecord);
      } catch (error) {
        this.log('ERROR', 'Alert callback failed', { error: error.message });
      }
    });
  }

  /**
   * Update global metrics
   */
  updateGlobalMetrics() {
    let totalProcessingTime = 0;
    let totalSuccessful = 0;
    let totalQueries = 0;

    for (const [sessionId, session] of this.sessions) {
      totalProcessingTime += session.metrics.totalProcessingTime;
      totalSuccessful += session.metrics.successfulQueries;
      totalQueries += session.metrics.totalQueries;
    }

    this.globalMetrics.averageProcessingTime = totalQueries > 0 
      ? totalProcessingTime / totalQueries 
      : 0;
    
    this.globalMetrics.successRate = totalQueries > 0 
      ? totalSuccessful / totalQueries 
      : 0;
  }

  /**
   * Get session metrics
   * @param {string} sessionId - Session identifier
   * @returns {Object|null} - Session metrics
   */
  getSessionMetrics(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      sessionId,
      status: session.status,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.endTime ? session.endTime - session.startTime : Date.now() - session.startTime,
      metrics: session.metrics,
      alerts: session.alerts,
      queries: session.queries.map(q => ({
        queryId: q.queryId,
        status: q.status,
        processingTime: q.metrics.processingTime,
        iterations: q.metrics.iterationCount,
        confidence: q.metrics.confidence,
        success: q.metrics.success
      }))
    };
  }

  /**
   * Get global metrics
   * @returns {Object} - Global metrics
   */
  getGlobalMetrics() {
    this.updateGlobalMetrics();
    return { ...this.globalMetrics };
  }

  /**
   * Get recent alerts
   * @param {number} limit - Maximum number of alerts
   * @returns {Array} - Recent alerts
   */
  getRecentAlerts(limit = 50) {
    const allAlerts = [];
    
    for (const [sessionId, session] of this.sessions) {
      allAlerts.push(...session.alerts);
    }

    return allAlerts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Register alert callback
   * @param {Function} callback - Alert callback function
   */
  onAlert(callback) {
    this.alertCallbacks.push(callback);
  }

  /**
   * Set log level
   * @param {string} level - Log level (DEBUG, INFO, WARN, ERROR)
   */
  setLogLevel(level) {
    this.logLevel = level;
  }

  /**
   * Log message
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  log(level, message, data = {}) {
    const levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, CRITICAL: 4 };
    const currentLevel = levels[this.logLevel] || 1;
    const messageLevel = levels[level] || 1;

    if (messageLevel >= currentLevel) {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level,
        message,
        data
      };

      console.log(`[${timestamp}] ${level}: ${message}`, data);
    }
  }

  /**
   * Generate alert ID
   * @returns {string} - Alert ID
   */
  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear old sessions
   * @param {number} maxAge - Maximum age in milliseconds
   */
  clearOldSessions(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    const cutoff = Date.now() - maxAge;
    
    for (const [sessionId, session] of this.sessions) {
      if (session.startTime.getTime() < cutoff) {
        this.sessions.delete(sessionId);
        this.log('DEBUG', `Cleared old session: ${sessionId}`);
      }
    }
  }

  /**
   * Export monitoring data
   * @returns {Object} - Complete monitoring data
   */
  exportData() {
    return {
      globalMetrics: this.getGlobalMetrics(),
      sessions: Array.from(this.sessions.entries()).map(([id, session]) => ({
        sessionId: id,
        ...session
      })),
      recentAlerts: this.getRecentAlerts(100),
      exportTimestamp: new Date()
    };
  }
}

export default AgentMonitoringSystem;