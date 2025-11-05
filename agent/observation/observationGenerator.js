/**
 * Observation Generator - Creates structured observations from tool results
 * Converts environmental feedback into agent-consumable observations
 */

class ObservationGenerator {
  constructor() {
    this.observationTypes = new Set([
      'success', 'error', 'progress', 'data', 'performance', 
      'validation', 'environment', 'tool_feedback'
    ]);
  }

  /**
   * Create success observation from tool result
   * @param {ToolResult} toolResult - Tool execution result
   * @param {Object} context - Additional context
   * @returns {Observation} - Success observation
   */
  createSuccessObservation(toolResult, context = {}) {
    const observation = {
      type: 'success',
      content: this.generateSuccessContent(toolResult),
      timestamp: new Date(),
      toolName: toolResult.toolName,
      confidence: 1.0,
      data: {
        toolResult: toolResult.data,
        executionTime: toolResult.executionTime,
        message: toolResult.message
      },
      groundTruth: {
        success: true,
        dataAvailable: toolResult.data !== null && toolResult.data !== undefined,
        dataType: typeof toolResult.data
      },
      ...context
    };

    return this.validateObservation(observation);
  }

  /**
   * Create error observation from error or failed tool result
   * @param {Error|ToolResult} errorOrResult - Error object or failed tool result
   * @param {string} context - Error context description
   * @param {Object} additionalData - Additional error data
   * @returns {Observation} - Error observation
   */
  createErrorObservation(errorOrResult, context = '', additionalData = {}) {
    let observation;

    if (errorOrResult instanceof Error) {
      observation = {
        type: 'error',
        content: this.generateErrorContent(errorOrResult, context),
        timestamp: new Date(),
        confidence: 1.0,
        data: {
          errorName: errorOrResult.name,
          errorMessage: errorOrResult.message,
          context: context,
          ...additionalData
        },
        groundTruth: {
          success: false,
          errorOccurred: true,
          errorType: errorOrResult.name
        }
      };
    } else {
      // Handle failed tool result
      observation = {
        type: 'error',
        content: this.generateToolErrorContent(errorOrResult, context),
        timestamp: new Date(),
        toolName: errorOrResult.toolName,
        confidence: 1.0,
        data: {
          toolMessage: errorOrResult.message,
          context: context,
          error: errorOrResult.error,
          ...additionalData
        },
        groundTruth: {
          success: false,
          toolFailed: true,
          toolName: errorOrResult.toolName
        }
      };
    }

    return this.validateObservation(observation);
  }

  /**
   * Create progress observation
   * @param {string} progressDescription - Description of progress
   * @param {Object} progressData - Progress data
   * @returns {Observation} - Progress observation
   */
  createProgressObservation(progressDescription, progressData = {}) {
    const observation = {
      type: 'progress',
      content: progressDescription,
      timestamp: new Date(),
      confidence: 0.8,
      data: progressData,
      groundTruth: {
        progressMade: true,
        stage: progressData.stage || 'unknown'
      }
    };

    return this.validateObservation(observation);
  }

  /**
   * Create data observation from tool result data
   * @param {*} data - Data to observe
   * @param {string} source - Data source description
   * @param {Object} metadata - Additional metadata
   * @returns {Observation} - Data observation
   */
  createDataObservation(data, source = 'unknown', metadata = {}) {
    const dataAnalysis = this.analyzeData(data);
    
    const observation = {
      type: 'data',
      content: this.generateDataContent(data, source, dataAnalysis),
      timestamp: new Date(),
      confidence: 1.0,
      data: {
        sourceData: data,
        source: source,
        analysis: dataAnalysis,
        ...metadata
      },
      groundTruth: {
        dataAvailable: true,
        dataType: dataAnalysis.type,
        dataSize: dataAnalysis.size,
        isEmpty: dataAnalysis.isEmpty
      }
    };

    return this.validateObservation(observation);
  }

  /**
   * Create performance observation
   * @param {number} executionTime - Execution time in milliseconds
   * @param {string} operation - Operation description
   * @param {Object} metrics - Additional performance metrics
   * @returns {Observation} - Performance observation
   */
  createPerformanceObservation(executionTime, operation = 'operation', metrics = {}) {
    const performanceLevel = this.categorizePerformance(executionTime);
    
    const observation = {
      type: 'performance',
      content: this.generatePerformanceContent(executionTime, operation, performanceLevel),
      timestamp: new Date(),
      confidence: 1.0,
      data: {
        executionTime,
        operation,
        performanceLevel,
        ...metrics
      },
      groundTruth: {
        executionCompleted: true,
        executionTime,
        performanceCategory: performanceLevel
      }
    };

    return this.validateObservation(observation);
  }

  /**
   * Create environment observation
   * @param {string} environmentState - Description of environment state
   * @param {Object} environmentData - Environment data
   * @returns {Observation} - Environment observation
   */
  createEnvironmentObservation(environmentState, environmentData = {}) {
    const observation = {
      type: 'environment',
      content: `Environment state: ${environmentState}`,
      timestamp: new Date(),
      confidence: 0.9,
      data: environmentData,
      groundTruth: {
        environmentAccessible: true,
        state: environmentState
      }
    };

    return this.validateObservation(observation);
  }

  /**
   * Create tool feedback observation from environmental feedback
   * @param {Object} environmentalFeedback - Environmental feedback from tool execution
   * @returns {Observation} - Tool feedback observation
   */
  createToolFeedbackObservation(environmentalFeedback) {
    const observation = {
      type: 'tool_feedback',
      content: this.generateToolFeedbackContent(environmentalFeedback),
      timestamp: new Date(),
      toolName: environmentalFeedback.toolName,
      confidence: 1.0,
      data: {
        feedback: environmentalFeedback,
        observationCount: environmentalFeedback.observations?.length || 0
      },
      groundTruth: environmentalFeedback.groundTruth || {}
    };

    return this.validateObservation(observation);
  }

  /**
   * Generate success content message
   * @param {ToolResult} toolResult - Tool result
   * @returns {string} - Success content
   */
  generateSuccessContent(toolResult) {
    let content = `Tool '${toolResult.toolName}' executed successfully`;
    
    if (toolResult.data !== null && toolResult.data !== undefined) {
      const dataType = typeof toolResult.data;
      content += ` and returned ${dataType} data`;
      
      if (dataType === 'number') {
        content += `: ${toolResult.data}`;
      } else if (dataType === 'string' && toolResult.data.length < 100) {
        content += `: "${toolResult.data}"`;
      } else if (Array.isArray(toolResult.data)) {
        content += ` with ${toolResult.data.length} items`;
      }
    }
    
    return content + '.';
  }

  /**
   * Generate error content message
   * @param {Error} error - Error object
   * @param {string} context - Error context
   * @returns {string} - Error content
   */
  generateErrorContent(error, context) {
    let content = `Error occurred`;
    
    if (context) {
      content += ` during ${context}`;
    }
    
    content += `: ${error.message}`;
    
    return content;
  }

  /**
   * Generate tool error content message
   * @param {ToolResult} toolResult - Failed tool result
   * @param {string} context - Error context
   * @returns {string} - Tool error content
   */
  generateToolErrorContent(toolResult, context) {
    let content = `Tool '${toolResult.toolName}' failed`;
    
    if (context) {
      content += ` during ${context}`;
    }
    
    content += `: ${toolResult.message}`;
    
    return content;
  }

  /**
   * Generate data content message
   * @param {*} data - Data
   * @param {string} source - Data source
   * @param {Object} analysis - Data analysis
   * @returns {string} - Data content
   */
  generateDataContent(data, source, analysis) {
    let content = `Received ${analysis.type} data from ${source}`;
    
    if (analysis.isEmpty) {
      content += ' (empty)';
    } else {
      if (analysis.type === 'array') {
        content += ` with ${analysis.size} items`;
      } else if (analysis.type === 'object') {
        content += ` with ${analysis.size} properties`;
      } else if (analysis.type === 'string') {
        content += ` (${analysis.size} characters)`;
      }
    }
    
    return content + '.';
  }

  /**
   * Generate performance content message
   * @param {number} executionTime - Execution time
   * @param {string} operation - Operation
   * @param {string} performanceLevel - Performance level
   * @returns {string} - Performance content
   */
  generatePerformanceContent(executionTime, operation, performanceLevel) {
    return `${operation} completed in ${executionTime}ms (${performanceLevel} performance).`;
  }

  /**
   * Generate tool feedback content message
   * @param {Object} environmentalFeedback - Environmental feedback
   * @returns {string} - Tool feedback content
   */
  generateToolFeedbackContent(environmentalFeedback) {
    const { toolName, success, observations } = environmentalFeedback;
    
    let content = `Environmental feedback from tool '${toolName}': `;
    content += success ? 'execution successful' : 'execution failed';
    
    if (observations && observations.length > 0) {
      content += ` with ${observations.length} observations`;
    }
    
    return content + '.';
  }

  /**
   * Analyze data structure and content
   * @param {*} data - Data to analyze
   * @returns {Object} - Data analysis
   */
  analyzeData(data) {
    const analysis = {
      type: typeof data,
      size: 0,
      isEmpty: false
    };

    if (data === null || data === undefined) {
      analysis.isEmpty = true;
    } else if (Array.isArray(data)) {
      analysis.type = 'array';
      analysis.size = data.length;
      analysis.isEmpty = data.length === 0;
    } else if (typeof data === 'object') {
      analysis.size = Object.keys(data).length;
      analysis.isEmpty = analysis.size === 0;
    } else if (typeof data === 'string') {
      analysis.size = data.length;
      analysis.isEmpty = data.length === 0;
    } else if (typeof data === 'number') {
      analysis.isEmpty = false;
    }

    return analysis;
  }

  /**
   * Categorize performance based on execution time
   * @param {number} executionTime - Execution time in milliseconds
   * @returns {string} - Performance category
   */
  categorizePerformance(executionTime) {
    if (executionTime < 100) return 'excellent';
    if (executionTime < 500) return 'good';
    if (executionTime < 2000) return 'acceptable';
    if (executionTime < 5000) return 'slow';
    return 'very slow';
  }

  /**
   * Validate observation structure
   * @param {Observation} observation - Observation to validate
   * @returns {Observation} - Validated observation
   */
  validateObservation(observation) {
    // Ensure required fields
    if (!observation.type) {
      observation.type = 'unknown';
    }
    
    if (!observation.content) {
      observation.content = 'No content provided';
    }
    
    if (!observation.timestamp) {
      observation.timestamp = new Date();
    }
    
    if (typeof observation.confidence !== 'number') {
      observation.confidence = 0.5;
    }
    
    // Ensure confidence is in valid range
    observation.confidence = Math.max(0, Math.min(1, observation.confidence));
    
    // Ensure data object exists
    if (!observation.data) {
      observation.data = {};
    }
    
    // Ensure groundTruth object exists
    if (!observation.groundTruth) {
      observation.groundTruth = {};
    }

    return observation;
  }

  /**
   * Get supported observation types
   * @returns {string[]} - Array of supported observation types
   */
  getSupportedTypes() {
    return Array.from(this.observationTypes);
  }

  /**
   * Create environmental ground truth observation from tool execution
   * @param {Object} toolExecution - Tool execution details
   * @returns {Observation} - Environmental ground truth observation
   */
  createEnvironmentalGroundTruthObservation(toolExecution) {
    const { toolName, success, result, error, executionTime, parameters } = toolExecution;
    
    const groundTruth = {
      toolExecuted: true,
      toolName: toolName,
      executionSuccess: success,
      executionTime: executionTime,
      parametersProvided: parameters !== null && parameters !== undefined,
      resultAvailable: result !== null && result !== undefined,
      errorOccurred: !success && error !== null
    };

    if (success) {
      groundTruth.resultType = typeof result;
      if (Array.isArray(result)) {
        groundTruth.resultType = 'array';
        groundTruth.resultSize = result.length;
      } else if (typeof result === 'object' && result !== null) {
        groundTruth.resultSize = Object.keys(result).length;
      }
    } else {
      groundTruth.errorType = error?.name || 'unknown';
      groundTruth.errorMessage = error?.message || 'Unknown error';
    }

    const observation = {
      type: success ? 'success' : 'error',
      content: this.generateEnvironmentalContent(toolExecution),
      timestamp: new Date(),
      toolName: toolName,
      confidence: 1.0, // Environmental feedback is always high confidence
      data: {
        toolExecution: toolExecution,
        environmentalFeedback: true
      },
      groundTruth: groundTruth
    };

    return this.validateObservation(observation);
  }

  /**
   * Create environmental state change observation
   * @param {Object} stateChange - State change details
   * @returns {Observation} - State change observation
   */
  createEnvironmentalStateChangeObservation(stateChange) {
    const { component, previousState, newState, trigger, timestamp } = stateChange;
    
    const observation = {
      type: 'environment',
      content: `Environmental state change in ${component}: ${previousState} → ${newState}`,
      timestamp: timestamp || new Date(),
      confidence: 1.0,
      data: {
        stateChange: stateChange,
        environmentalFeedback: true
      },
      groundTruth: {
        stateChanged: true,
        component: component,
        previousState: previousState,
        newState: newState,
        trigger: trigger
      }
    };

    return this.validateObservation(observation);
  }

  /**
   * Create validation observation from environmental validation
   * @param {Object} validation - Validation details
   * @returns {Observation} - Validation observation
   */
  createValidationObservation(validation) {
    const { target, rules, passed, failed, details } = validation;
    
    const observation = {
      type: 'validation',
      content: this.generateValidationContent(validation),
      timestamp: new Date(),
      confidence: 1.0,
      data: {
        validation: validation,
        environmentalFeedback: true
      },
      groundTruth: {
        validationPerformed: true,
        target: target,
        totalRules: (passed?.length || 0) + (failed?.length || 0),
        passedRules: passed?.length || 0,
        failedRules: failed?.length || 0,
        overallResult: (failed?.length || 0) === 0 ? 'passed' : 'failed'
      }
    };

    return this.validateObservation(observation);
  }

  /**
   * Generate environmental content message
   * @param {Object} toolExecution - Tool execution details
   * @returns {string} - Environmental content
   */
  generateEnvironmentalContent(toolExecution) {
    const { toolName, success, result, error, executionTime } = toolExecution;
    
    let content = `Environmental feedback: Tool '${toolName}' `;
    
    if (success) {
      content += `executed successfully in ${executionTime}ms`;
      if (result !== null && result !== undefined) {
        const resultType = Array.isArray(result) ? 'array' : typeof result;
        content += ` and returned ${resultType} result`;
      }
    } else {
      content += `failed to execute`;
      if (error) {
        content += ` with error: ${error.message}`;
      }
    }
    
    return content + '.';
  }

  /**
   * Generate validation content message
   * @param {Object} validation - Validation details
   * @returns {string} - Validation content
   */
  generateValidationContent(validation) {
    const { target, passed, failed } = validation;
    const totalRules = (passed?.length || 0) + (failed?.length || 0);
    const passedCount = passed?.length || 0;
    
    let content = `Validation of ${target}: ${passedCount}/${totalRules} rules passed`;
    
    if (failed && failed.length > 0) {
      content += `. Failed rules: ${failed.slice(0, 2).join(', ')}`;
      if (failed.length > 2) {
        content += ` and ${failed.length - 2} more`;
      }
    }
    
    return content + '.';
  }

  /**
   * Create batch observations from multiple sources
   * @param {Array} sources - Array of observation sources
   * @returns {Observation[]} - Array of observations
   */
  createBatchObservations(sources) {
    const observations = [];
    
    for (const source of sources) {
      try {
        let observation;
        
        switch (source.type) {
          case 'tool_result':
            observation = source.success 
              ? this.createSuccessObservation(source.data, source.context)
              : this.createErrorObservation(source.data, source.context);
            break;
          case 'tool_execution':
            observation = this.createEnvironmentalGroundTruthObservation(source);
            break;
          case 'state_change':
            observation = this.createEnvironmentalStateChangeObservation(source);
            break;
          case 'validation':
            observation = this.createValidationObservation(source);
            break;
          case 'progress':
            observation = this.createProgressObservation(source.description, source.data);
            break;
          case 'data':
            observation = this.createDataObservation(source.data, source.source, source.metadata);
            break;
          case 'performance':
            observation = this.createPerformanceObservation(source.executionTime, source.operation, source.metrics);
            break;
          default:
            observation = this.createProgressObservation(`Unknown source type: ${source.type}`, source);
        }
        
        observations.push(observation);
      } catch (error) {
        console.error('Error creating observation from source:', error);
        observations.push(this.createErrorObservation(error, 'batch observation creation'));
      }
    }
    
    return observations;
  }
}

export default ObservationGenerator;