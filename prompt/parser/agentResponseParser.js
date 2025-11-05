/**
 * Agent Response Parser - Parses LLM responses for agent actions
 * Handles structured response parsing with validation and fallback mechanisms
 */

class AgentResponseParser {
  constructor() {
    this.supportedActionTypes = ['tool_call', 'reasoning', 'final_answer', 'clarification'];
    this.maxRetries = 3;
  }

  /**
   * Parse initial reasoning response from LLM
   * @param {string} response - Raw LLM response
   * @returns {Object} - Parsed reasoning with approach and next action
   */
  parseInitialReasoning(response) {
    const result = {
      success: false,
      reasoning: '',
      plannedApproach: '',
      nextAction: '',
      confidence: 0,
      errors: []
    };

    try {
      // Extract structured sections
      const reasoning = this.extractSection(response, 'REASONING');
      const plannedApproach = this.extractSection(response, 'PLANNED_APPROACH');
      const nextAction = this.extractSection(response, 'NEXT_ACTION');

      if (reasoning) {
        result.reasoning = reasoning.trim();
        result.confidence += 0.4;
      } else {
        result.errors.push('Missing REASONING section');
      }

      if (plannedApproach) {
        result.plannedApproach = plannedApproach.trim();
        result.confidence += 0.3;
      } else {
        result.errors.push('Missing PLANNED_APPROACH section');
      }

      if (nextAction) {
        result.nextAction = nextAction.trim();
        result.confidence += 0.3;
      } else {
        result.errors.push('Missing NEXT_ACTION section');
      }

      // Fallback: if no structured sections, treat entire response as reasoning
      if (result.confidence === 0) {
        result.reasoning = response.trim();
        result.nextAction = 'Continue with tool selection';
        result.confidence = 0.2;
        result.errors.push('No structured sections found, using fallback parsing');
      }

      result.success = result.confidence > 0.5;
      return result;

    } catch (error) {
      result.errors.push(`Parsing error: ${error.message}`);
      return this.createFallbackReasoning(response, result);
    }
  }

  /**
   * Parse tool selection response from LLM
   * @param {string} response - Raw LLM response
   * @returns {Object} - Parsed tool selection with validation
   */
  parseToolSelection(response) {
    const result = {
      success: false,
      selectedTool: null,
      parameters: {},
      reasoning: '',
      confidence: 0,
      errors: [],
      actionType: 'tool_call'
    };

    try {
      // Extract tool selection
      const selectedTool = this.extractSection(response, 'SELECTED_TOOL');
      const parameters = this.extractSection(response, 'PARAMETERS');
      const reasoning = this.extractSection(response, 'REASONING');

      if (selectedTool) {
        const toolName = selectedTool.trim().toLowerCase();
        
        if (toolName === 'none' || toolName === 'null') {
          result.actionType = 'clarification';
          result.selectedTool = null;
          result.confidence += 0.5;
        } else {
          result.selectedTool = toolName;
          result.confidence += 0.4;
        }
      } else {
        result.errors.push('Missing SELECTED_TOOL section');
      }

      if (parameters && result.selectedTool) {
        try {
          // Try to parse as JSON
          const parsedParams = this.parseParameters(parameters);
          result.parameters = parsedParams;
          result.confidence += 0.3;
        } catch (paramError) {
          result.errors.push(`Parameter parsing error: ${paramError.message}`);
          result.parameters = this.extractParametersFromText(parameters);
        }
      }

      if (reasoning) {
        result.reasoning = reasoning.trim();
        result.confidence += 0.3;
      } else {
        result.errors.push('Missing REASONING section');
      }

      // Validate tool selection
      if (result.selectedTool && result.actionType === 'tool_call') {
        const validation = this.validateToolSelection(result.selectedTool, result.parameters);
        if (!validation.valid) {
          result.errors.push(...validation.errors);
          result.confidence *= 0.5; // Reduce confidence for invalid selections
        }
      }

      result.success = result.confidence > 0.5;
      return result;

    } catch (error) {
      result.errors.push(`Parsing error: ${error.message}`);
      return this.createFallbackToolSelection(response, result);
    }
  }

  /**
   * Parse continuation response from LLM
   * @param {string} response - Raw LLM response
   * @returns {Object} - Parsed continuation with updated reasoning
   */
  parseContinuation(response) {
    const result = {
      success: false,
      updatedReasoning: '',
      nextAction: '',
      status: '',
      confidence: 0,
      errors: [],
      shouldContinue: true
    };

    try {
      const updatedReasoning = this.extractSection(response, 'UPDATED_REASONING');
      const nextAction = this.extractSection(response, 'NEXT_ACTION');
      const status = this.extractSection(response, 'STATUS');

      if (updatedReasoning) {
        result.updatedReasoning = updatedReasoning.trim();
        result.confidence += 0.4;
      } else {
        result.errors.push('Missing UPDATED_REASONING section');
      }

      if (nextAction) {
        result.nextAction = nextAction.trim();
        result.confidence += 0.3;
        
        // Check if agent wants to provide final answer
        const finalAnswerKeywords = ['final answer', 'conclude', 'complete', 'finished', 'ready to answer'];
        const isReadyForFinal = finalAnswerKeywords.some(keyword => 
          nextAction.toLowerCase().includes(keyword)
        );
        
        if (isReadyForFinal) {
          result.shouldContinue = false;
        }
      } else {
        result.errors.push('Missing NEXT_ACTION section');
      }

      if (status) {
        result.status = status.trim();
        result.confidence += 0.3;
        
        // Check status for completion indicators
        const completionKeywords = ['ready', 'complete', 'sufficient', 'enough information'];
        const isComplete = completionKeywords.some(keyword => 
          status.toLowerCase().includes(keyword)
        );
        
        if (isComplete) {
          result.shouldContinue = false;
        }
      } else {
        result.errors.push('Missing STATUS section');
      }

      result.success = result.confidence > 0.5;
      return result;

    } catch (error) {
      result.errors.push(`Parsing error: ${error.message}`);
      return this.createFallbackContinuation(response, result);
    }
  }

  /**
   * Parse final answer response from LLM
   * @param {string} response - Raw LLM response
   * @returns {Object} - Parsed final answer
   */
  parseFinalAnswer(response) {
    const result = {
      success: false,
      summary: '',
      answer: '',
      explanation: '',
      confidence: 0,
      errors: []
    };

    try {
      const summary = this.extractSection(response, 'SUMMARY');
      const answer = this.extractSection(response, 'ANSWER');
      const explanation = this.extractSection(response, 'EXPLANATION');

      if (summary) {
        result.summary = summary.trim();
        result.confidence += 0.3;
      } else {
        result.errors.push('Missing SUMMARY section');
      }

      if (answer) {
        result.answer = answer.trim();
        result.confidence += 0.5; // Answer is most important
      } else {
        result.errors.push('Missing ANSWER section');
      }

      if (explanation) {
        result.explanation = explanation.trim();
        result.confidence += 0.2;
      } else {
        result.errors.push('Missing EXPLANATION section');
      }

      // Fallback: if no structured sections, treat entire response as answer
      if (result.confidence === 0) {
        result.answer = response.trim();
        result.summary = 'Generated response without structured format';
        result.explanation = 'Response provided in unstructured format';
        result.confidence = 0.3;
        result.errors.push('No structured sections found, using fallback parsing');
      }

      result.success = result.confidence > 0.4; // Lower threshold for final answers
      return result;

    } catch (error) {
      result.errors.push(`Parsing error: ${error.message}`);
      return this.createFallbackFinalAnswer(response, result);
    }
  }

  /**
   * Parse error recovery response from LLM
   * @param {string} response - Raw LLM response
   * @returns {Object} - Parsed error recovery plan
   */
  parseErrorRecovery(response) {
    const result = {
      success: false,
      analysis: '',
      adaptedStrategy: '',
      nextAction: '',
      confidence: 0,
      errors: []
    };

    try {
      const analysis = this.extractSection(response, 'ANALYSIS');
      const adaptedStrategy = this.extractSection(response, 'ADAPTED_STRATEGY');
      const nextAction = this.extractSection(response, 'NEXT_ACTION');

      if (analysis) {
        result.analysis = analysis.trim();
        result.confidence += 0.3;
      } else {
        result.errors.push('Missing ANALYSIS section');
      }

      if (adaptedStrategy) {
        result.adaptedStrategy = adaptedStrategy.trim();
        result.confidence += 0.4;
      } else {
        result.errors.push('Missing ADAPTED_STRATEGY section');
      }

      if (nextAction) {
        result.nextAction = nextAction.trim();
        result.confidence += 0.3;
      } else {
        result.errors.push('Missing NEXT_ACTION section');
      }

      result.success = result.confidence > 0.5;
      return result;

    } catch (error) {
      result.errors.push(`Parsing error: ${error.message}`);
      return this.createFallbackErrorRecovery(response, result);
    }
  }

  /**
   * Extract a section from structured response
   * @param {string} response - Full response text
   * @param {string} sectionName - Name of section to extract
   * @returns {string|null} - Extracted section content or null
   */
  extractSection(response, sectionName) {
    if (!response || !sectionName) return null;

    // Try exact match first
    const exactPattern = new RegExp(`${sectionName}:\\s*([\\s\\S]*?)(?=\\n[A-Z_]+:|$)`, 'i');
    const exactMatch = response.match(exactPattern);
    
    if (exactMatch) {
      return exactMatch[1].trim();
    }

    // Try with newline after colon
    const newlinePattern = new RegExp(`${sectionName}:\\s*\\n([\\s\\S]*?)(?=\\n[A-Z_]+:|$)`, 'i');
    const newlineMatch = response.match(newlinePattern);
    
    if (newlineMatch) {
      return newlineMatch[1].trim();
    }

    // Try without colon
    const noColonPattern = new RegExp(`${sectionName}\\s+([\\s\\S]*?)(?=\\n[A-Z_]+\\s|$)`, 'i');
    const noColonMatch = response.match(noColonPattern);
    
    if (noColonMatch) {
      return noColonMatch[1].trim();
    }

    return null;
  }

  /**
   * Parse parameters from text (JSON or key-value format)
   * @param {string} paramText - Parameter text to parse
   * @returns {Object} - Parsed parameters
   */
  parseParameters(paramText) {
    if (!paramText) return {};

    const trimmed = paramText.trim();
    
    // Try JSON parsing first
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        return JSON.parse(trimmed);
      } catch (jsonError) {
        // Fall through to text parsing
      }
    }

    // Parse key-value format
    return this.extractParametersFromText(trimmed);
  }

  /**
   * Extract parameters from plain text format
   * @param {string} text - Text containing parameters
   * @returns {Object} - Extracted parameters
   */
  extractParametersFromText(text) {
    const params = {};
    const lines = text.split('\n');

    for (const line of lines) {
      const colonMatch = line.match(/^([^:]+):\s*(.+)$/);
      if (colonMatch) {
        const key = colonMatch[1].trim();
        const value = colonMatch[2].trim();
        params[key] = this.parseValue(value);
        continue;
      }

      const equalsMatch = line.match(/^([^=]+)=\s*(.+)$/);
      if (equalsMatch) {
        const key = equalsMatch[1].trim();
        const value = equalsMatch[2].trim();
        params[key] = this.parseValue(value);
      }
    }

    return params;
  }

  /**
   * Parse a value to appropriate type
   * @param {string} value - String value to parse
   * @returns {any} - Parsed value
   */
  parseValue(value) {
    if (!value) return '';

    const trimmed = value.trim();
    
    // Remove quotes
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }

    // Parse numbers
    if (/^\d+$/.test(trimmed)) {
      return parseInt(trimmed, 10);
    }

    if (/^\d+\.\d+$/.test(trimmed)) {
      return parseFloat(trimmed);
    }

    // Parse booleans
    if (trimmed.toLowerCase() === 'true') return true;
    if (trimmed.toLowerCase() === 'false') return false;

    return trimmed;
  }

  /**
   * Validate tool selection
   * @param {string} toolName - Selected tool name
   * @param {Object} parameters - Tool parameters
   * @returns {Object} - Validation result
   */
  validateToolSelection(toolName, parameters) {
    const result = {
      valid: true,
      errors: []
    };

    if (!toolName || typeof toolName !== 'string') {
      result.valid = false;
      result.errors.push('Tool name must be a non-empty string');
    }

    if (parameters && typeof parameters !== 'object') {
      result.valid = false;
      result.errors.push('Parameters must be an object');
    }

    // Additional validation could be added here for specific tools
    return result;
  }

  /**
   * Create fallback reasoning when parsing fails
   * @param {string} response - Original response
   * @param {Object} result - Current result object
   * @returns {Object} - Fallback result
   */
  createFallbackReasoning(response, result) {
    result.reasoning = response.trim() || 'Unable to parse reasoning from response';
    result.nextAction = 'Continue with available information';
    result.confidence = 0.1;
    result.errors.push('Used fallback parsing due to parsing failure');
    return result;
  }

  /**
   * Create fallback tool selection when parsing fails
   * @param {string} response - Original response
   * @param {Object} result - Current result object
   * @returns {Object} - Fallback result
   */
  createFallbackToolSelection(response, result) {
    // Try to extract tool name from response text
    const toolPattern = /(?:use|tool|select|call)\s+(\w+)/i;
    const toolMatch = response.match(toolPattern);
    
    if (toolMatch) {
      result.selectedTool = toolMatch[1].toLowerCase();
      result.actionType = 'tool_call';
    } else {
      result.selectedTool = null;
      result.actionType = 'clarification';
    }
    
    result.reasoning = response.trim() || 'Unable to parse tool selection reasoning';
    result.confidence = 0.1;
    result.errors.push('Used fallback parsing due to parsing failure');
    return result;
  }

  /**
   * Create fallback continuation when parsing fails
   * @param {string} response - Original response
   * @param {Object} result - Current result object
   * @returns {Object} - Fallback result
   */
  createFallbackContinuation(response, result) {
    result.updatedReasoning = response.trim() || 'Unable to parse updated reasoning';
    result.nextAction = 'Continue with next step';
    result.status = 'Continuing';
    result.confidence = 0.1;
    result.errors.push('Used fallback parsing due to parsing failure');
    return result;
  }

  /**
   * Create fallback final answer when parsing fails
   * @param {string} response - Original response
   * @param {Object} result - Current result object
   * @returns {Object} - Fallback result
   */
  createFallbackFinalAnswer(response, result) {
    result.answer = response.trim() || 'Unable to parse final answer';
    result.summary = 'Response provided without structured format';
    result.explanation = 'Answer extracted from unstructured response';
    result.confidence = 0.2;
    result.errors.push('Used fallback parsing due to parsing failure');
    return result;
  }

  /**
   * Create fallback error recovery when parsing fails
   * @param {string} response - Original response
   * @param {Object} result - Current result object
   * @returns {Object} - Fallback result
   */
  createFallbackErrorRecovery(response, result) {
    result.analysis = 'Error analysis not clearly provided';
    result.adaptedStrategy = response.trim() || 'Continue with alternative approach';
    result.nextAction = 'Try different approach';
    result.confidence = 0.1;
    result.errors.push('Used fallback parsing due to parsing failure');
    return result;
  }

  /**
   * Validate parsed response quality
   * @param {Object} parsedResponse - Parsed response object
   * @returns {Object} - Validation result
   */
  validateResponseQuality(parsedResponse) {
    const validation = {
      isValid: true,
      quality: 'high',
      issues: [],
      suggestions: []
    };

    if (!parsedResponse.success) {
      validation.isValid = false;
      validation.quality = 'low';
      validation.issues.push('Parsing was not successful');
    }

    if (parsedResponse.confidence < 0.3) {
      validation.quality = 'low';
      validation.issues.push('Low confidence in parsing accuracy');
      validation.suggestions.push('Consider requesting clarification from LLM');
    } else if (parsedResponse.confidence < 0.7) {
      validation.quality = 'medium';
      validation.suggestions.push('Some sections may need validation');
    }

    if (parsedResponse.errors && parsedResponse.errors.length > 0) {
      validation.issues.push(`${parsedResponse.errors.length} parsing errors encountered`);
    }

    return validation;
  }

  /**
   * Get parser statistics and configuration
   * @returns {Object} - Parser configuration and stats
   */
  getParserInfo() {
    return {
      supportedActionTypes: this.supportedActionTypes,
      maxRetries: this.maxRetries,
      supportedResponseTypes: [
        'initial_reasoning',
        'tool_selection',
        'continuation',
        'final_answer',
        'error_recovery'
      ],
      fallbackMechanisms: [
        'section_extraction_fallback',
        'parameter_parsing_fallback',
        'tool_name_extraction',
        'confidence_adjustment'
      ]
    };
  }
}

export default AgentResponseParser;