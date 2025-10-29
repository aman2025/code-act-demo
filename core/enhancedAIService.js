/**
 * Enhanced AI Service - Extends base AI service with agent capabilities
 * Integrates prompting system and response parsing for autonomous agents
 */

import aiService from './aiService.js';
import AgentPromptingSystem from './agentPromptingSystem.js';
import AgentResponseParser from './agentResponseParser.js';

class EnhancedAIService {
  constructor(toolRegistry) {
    this.baseAIService = aiService;
    this.promptingSystem = new AgentPromptingSystem(toolRegistry);
    this.responseParser = new AgentResponseParser();
    this.toolRegistry = toolRegistry;
    
    // Configuration
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
    this.temperatureSettings = {
      reasoning: 0.7,
      toolSelection: 0.3,
      finalAnswer: 0.5,
      errorRecovery: 0.8
    };
  }

  /**
   * Generate agent reasoning for initial query
   * @param {string} userQuery - User's question or request
   * @param {Object} context - Current agent context
   * @returns {Promise<Object>} - Parsed reasoning response
   */
  async generateAgentReasoning(userQuery, context = {}) {
    try {
      const prompt = this.promptingSystem.createInitialReasoningPrompt(userQuery, context);
      
      const apiResponse = await this.callMistralWithRetry(prompt, {
        temperature: this.temperatureSettings.reasoning,
        maxTokens: 1500
      });

      if (!apiResponse.success) {
        throw new Error(`API call failed: ${apiResponse.error.message}`);
      }

      const parsedResponse = this.responseParser.parseInitialReasoning(apiResponse.content);
      
      return {
        success: true,
        reasoning: parsedResponse.reasoning,
        plannedApproach: parsedResponse.plannedApproach,
        nextAction: parsedResponse.nextAction,
        confidence: parsedResponse.confidence,
        rawResponse: apiResponse.content,
        errors: parsedResponse.errors
      };

    } catch (error) {
      console.error('Enhanced AI Service - Reasoning Error:', error);
      return {
        success: false,
        error: {
          type: 'reasoning_generation_failed',
          message: error.message,
          details: error.stack
        }
      };
    }
  }

  /**
   * Parse tool selection from LLM response
   * @param {string} reasoning - Current agent reasoning
   * @param {string} userQuery - Original user query
   * @param {Object} context - Agent context with history
   * @returns {Promise<Object>} - Parsed tool selection
   */
  async generateToolSelection(reasoning, userQuery, context = {}) {
    try {
      const availableTools = this.toolRegistry.getAvailableTools();
      const prompt = this.promptingSystem.createToolSelectionPrompt(
        reasoning,
        userQuery,
        availableTools,
        context.actions || []
      );

      const apiResponse = await this.callMistralWithRetry(prompt, {
        temperature: this.temperatureSettings.toolSelection,
        maxTokens: 1000
      });

      if (!apiResponse.success) {
        throw new Error(`API call failed: ${apiResponse.error.message}`);
      }

      const parsedResponse = this.responseParser.parseToolSelection(apiResponse.content);
      
      // Validate tool exists if one was selected
      if (parsedResponse.selectedTool && parsedResponse.actionType === 'tool_call') {
        const tool = this.toolRegistry.getTool(parsedResponse.selectedTool);
        if (!tool) {
          parsedResponse.errors.push(`Tool '${parsedResponse.selectedTool}' not found in registry`);
          parsedResponse.success = false;
          parsedResponse.actionType = 'clarification';
          parsedResponse.selectedTool = null;
        }
      }

      return {
        success: parsedResponse.success,
        actionType: parsedResponse.actionType,
        selectedTool: parsedResponse.selectedTool,
        parameters: parsedResponse.parameters,
        reasoning: parsedResponse.reasoning,
        confidence: parsedResponse.confidence,
        rawResponse: apiResponse.content,
        errors: parsedResponse.errors
      };

    } catch (error) {
      console.error('Enhanced AI Service - Tool Selection Error:', error);
      return {
        success: false,
        error: {
          type: 'tool_selection_failed',
          message: error.message,
          details: error.stack
        }
      };
    }
  }

  /**
   * Generate continuation reasoning after tool execution
   * @param {Object} context - Complete agent context
   * @param {Object} lastObservation - Latest observation from tool execution
   * @returns {Promise<Object>} - Parsed continuation response
   */
  async generateContinuation(context, lastObservation) {
    try {
      const prompt = this.promptingSystem.createContinuationPrompt(context, lastObservation);

      const apiResponse = await this.callMistralWithRetry(prompt, {
        temperature: this.temperatureSettings.reasoning,
        maxTokens: 1500
      });

      if (!apiResponse.success) {
        throw new Error(`API call failed: ${apiResponse.error.message}`);
      }

      const parsedResponse = this.responseParser.parseContinuation(apiResponse.content);

      return {
        success: parsedResponse.success,
        updatedReasoning: parsedResponse.updatedReasoning,
        nextAction: parsedResponse.nextAction,
        status: parsedResponse.status,
        shouldContinue: parsedResponse.shouldContinue,
        confidence: parsedResponse.confidence,
        rawResponse: apiResponse.content,
        errors: parsedResponse.errors
      };

    } catch (error) {
      console.error('Enhanced AI Service - Continuation Error:', error);
      return {
        success: false,
        error: {
          type: 'continuation_failed',
          message: error.message,
          details: error.stack
        }
      };
    }
  }

  /**
   * Generate final answer when agent is ready to conclude
   * @param {Object} context - Complete agent context
   * @returns {Promise<Object>} - Parsed final answer
   */
  async generateFinalAnswer(context) {
    try {
      const prompt = this.promptingSystem.createFinalAnswerPrompt(context);

      const apiResponse = await this.callMistralWithRetry(prompt, {
        temperature: this.temperatureSettings.finalAnswer,
        maxTokens: 2000
      });

      if (!apiResponse.success) {
        throw new Error(`API call failed: ${apiResponse.error.message}`);
      }

      const parsedResponse = this.responseParser.parseFinalAnswer(apiResponse.content);

      return {
        success: parsedResponse.success,
        summary: parsedResponse.summary,
        answer: parsedResponse.answer,
        explanation: parsedResponse.explanation,
        confidence: parsedResponse.confidence,
        rawResponse: apiResponse.content,
        errors: parsedResponse.errors
      };

    } catch (error) {
      console.error('Enhanced AI Service - Final Answer Error:', error);
      return {
        success: false,
        error: {
          type: 'final_answer_failed',
          message: error.message,
          details: error.stack
        }
      };
    }
  }

  /**
   * Generate error recovery strategy
   * @param {Object} context - Current agent context
   * @param {Object} error - Error that occurred
   * @returns {Promise<Object>} - Parsed error recovery response
   */
  async generateErrorRecovery(context, error) {
    try {
      const prompt = this.promptingSystem.createErrorRecoveryPrompt(context, error);

      const apiResponse = await this.callMistralWithRetry(prompt, {
        temperature: this.temperatureSettings.errorRecovery,
        maxTokens: 1500
      });

      if (!apiResponse.success) {
        throw new Error(`API call failed: ${apiResponse.error.message}`);
      }

      const parsedResponse = this.responseParser.parseErrorRecovery(apiResponse.content);

      return {
        success: parsedResponse.success,
        analysis: parsedResponse.analysis,
        adaptedStrategy: parsedResponse.adaptedStrategy,
        nextAction: parsedResponse.nextAction,
        confidence: parsedResponse.confidence,
        rawResponse: apiResponse.content,
        errors: parsedResponse.errors
      };

    } catch (error) {
      console.error('Enhanced AI Service - Error Recovery Error:', error);
      return {
        success: false,
        error: {
          type: 'error_recovery_failed',
          message: error.message,
          details: error.stack
        }
      };
    }
  }

  /**
   * Generate planning for complex multi-step problems
   * @param {string} userQuery - Complex user query
   * @param {Object} context - Agent context
   * @returns {Promise<Object>} - Generated plan
   */
  async generatePlan(userQuery, context = {}) {
    try {
      const availableTools = this.toolRegistry.getAvailableTools();
      const prompt = this.promptingSystem.createPlanningPrompt(userQuery, availableTools);

      const apiResponse = await this.callMistralWithRetry(prompt, {
        temperature: this.temperatureSettings.reasoning,
        maxTokens: 2000
      });

      if (!apiResponse.success) {
        throw new Error(`API call failed: ${apiResponse.error.message}`);
      }

      // For planning, we'll use a simpler parsing approach
      const plan = this.parsePlanningResponse(apiResponse.content);

      return {
        success: true,
        plan: plan,
        rawResponse: apiResponse.content
      };

    } catch (error) {
      console.error('Enhanced AI Service - Planning Error:', error);
      return {
        success: false,
        error: {
          type: 'planning_failed',
          message: error.message,
          details: error.stack
        }
      };
    }
  }

  /**
   * Call Mistral API with retry logic
   * @param {string} prompt - Prompt to send
   * @param {Object} options - API call options
   * @returns {Promise<Object>} - API response
   */
  async callMistralWithRetry(prompt, options = {}) {
    const defaultOptions = {
      temperature: 0.7,
      maxTokens: 1500
    };

    const finalOptions = { ...defaultOptions, ...options };
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Use the base AI service's API calling method
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
          },
          body: JSON.stringify({
            model: 'mistral-large-latest',
            messages: [{ role: 'user', content: prompt }],
            temperature: finalOptions.temperature,
            max_tokens: finalOptions.maxTokens
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Mistral API error: ${response.status} - ${errorData.message || response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          throw new Error('Invalid response format from Mistral API');
        }

        return {
          success: true,
          content: data.choices[0].message.content,
          usage: data.usage
        };

      } catch (error) {
        lastError = error;
        console.warn(`Enhanced AI Service - Attempt ${attempt} failed:`, error.message);
        
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt); // Exponential backoff
        }
      }
    }

    return {
      success: false,
      error: {
        type: 'api_call_failed',
        message: lastError.message,
        attempts: this.maxRetries
      }
    };
  }

  /**
   * Parse planning response (simplified parsing)
   * @param {string} response - Raw planning response
   * @returns {Object} - Parsed plan
   */
  parsePlanningResponse(response) {
    const plan = {
      problemAnalysis: '',
      requiredInformation: '',
      steps: [],
      expectedOutcome: ''
    };

    // Extract sections using the response parser's section extraction
    plan.problemAnalysis = this.responseParser.extractSection(response, 'PROBLEM_ANALYSIS') || '';
    plan.requiredInformation = this.responseParser.extractSection(response, 'REQUIRED_INFORMATION') || '';
    plan.expectedOutcome = this.responseParser.extractSection(response, 'EXPECTED_OUTCOME') || '';

    // Extract step-by-step plan
    const stepSection = this.responseParser.extractSection(response, 'STEP_BY_STEP_PLAN');
    if (stepSection) {
      const stepLines = stepSection.split('\n').filter(line => line.trim());
      plan.steps = stepLines.map(line => line.trim()).filter(line => line.length > 0);
    }

    return plan;
  }

  /**
   * Validate response quality and suggest improvements
   * @param {Object} parsedResponse - Parsed response from any method
   * @returns {Object} - Quality assessment
   */
  validateResponseQuality(parsedResponse) {
    return this.responseParser.validateResponseQuality(parsedResponse);
  }

  /**
   * Get contextual prompt for specific scenario
   * @param {string} promptType - Type of prompt needed
   * @param {Object} context - Agent context
   * @param {Object} additionalData - Additional data for prompt
   * @returns {string} - Generated prompt
   */
  getContextualPrompt(promptType, context, additionalData = {}) {
    return this.promptingSystem.createContextualPrompt(promptType, context, additionalData);
  }

  /**
   * Utility method for delays
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} - Delay promise
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get service configuration and statistics
   * @returns {Object} - Service info
   */
  getServiceInfo() {
    return {
      maxRetries: this.maxRetries,
      retryDelay: this.retryDelay,
      temperatureSettings: this.temperatureSettings,
      promptingSystem: this.promptingSystem.getPromptConfiguration(),
      responseParser: this.responseParser.getParserInfo(),
      toolRegistry: this.toolRegistry.getStatistics()
    };
  }

  /**
   * Update service configuration
   * @param {Object} config - New configuration
   */
  updateConfiguration(config) {
    if (config.maxRetries !== undefined) {
      this.maxRetries = Math.max(1, Math.min(10, config.maxRetries));
    }
    
    if (config.retryDelay !== undefined) {
      this.retryDelay = Math.max(100, Math.min(10000, config.retryDelay));
    }
    
    if (config.temperatureSettings) {
      this.temperatureSettings = { ...this.temperatureSettings, ...config.temperatureSettings };
    }
  }
}

export default EnhancedAIService;