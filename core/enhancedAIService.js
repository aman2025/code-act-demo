/**
 * Enhanced AI Service - Extends base AI service with agent capabilities
 * Integrates prompting system and response parsing for autonomous agents
 */

import { Mistral } from '@mistralai/mistralai';
import AgentPromptingSystem from './agentPromptingSystem.js';
import AgentResponseParser from './agentResponseParser.js';

class EnhancedAIService {
  constructor(toolRegistry) {
    this.promptingSystem = new AgentPromptingSystem(toolRegistry);
    this.responseParser = new AgentResponseParser();
    this.toolRegistry = toolRegistry;
    
    // Initialize Mistral client
    this.mistralClient = new Mistral({
      apiKey: process.env.MISTRAL_API_KEY
    });
    
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
   * Parse tool selection from LLM response with native tool calling
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
        maxTokens: 1000,
        enableTools: true,
        tools: availableTools
      });

      if (!apiResponse.success) {
        throw new Error(`API call failed: ${apiResponse.error.message}`);
      }

      // Handle tool calls from Mistral API
      if (apiResponse.toolCalls && apiResponse.toolCalls.length > 0) {
        const toolCall = apiResponse.toolCalls[0]; // Use first tool call
        const toolName = toolCall.function.name;
        const parameters = JSON.parse(toolCall.function.arguments || '{}');

        // Validate tool exists
        const tool = this.toolRegistry.getTool(toolName);
        if (!tool) {
          return {
            success: false,
            actionType: 'clarification',
            selectedTool: null,
            parameters: {},
            reasoning: `Tool '${toolName}' not found in registry`,
            confidence: 0.1,
            rawResponse: apiResponse.content,
            errors: [`Tool '${toolName}' not found in registry`]
          };
        }

        return {
          success: true,
          actionType: 'tool_call',
          selectedTool: toolName,
          parameters: parameters,
          reasoning: apiResponse.content || reasoning,
          confidence: 0.9,
          rawResponse: apiResponse.content,
          toolCallId: toolCall.id,
          errors: []
        };
      }

      // Fallback to text parsing if no tool calls
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
   * Handle tool call response and create tool message
   * @param {string} toolCallId - Tool call ID from Mistral
   * @param {Object} toolResult - Result from tool execution
   * @returns {Object} - Tool message for conversation
   */
  createToolMessage(toolCallId, toolResult) {
    return {
      role: 'tool',
      tool_call_id: toolCallId,
      content: JSON.stringify({
        success: toolResult.success,
        data: toolResult.data,
        message: toolResult.message,
        executionTime: toolResult.executionTime
      })
    };
  }

  /**
   * Generate continuation reasoning after tool execution with conversation context
   * @param {Object} context - Complete agent context
   * @param {Object} lastObservation - Latest observation from tool execution
   * @returns {Promise<Object>} - Parsed continuation response
   */
  async generateContinuation(context, lastObservation) {
    try {
      // Build conversation messages including tool calls and responses
      const messages = this.buildConversationMessages(context, lastObservation);

      const apiResponse = await this.callMistralWithRetry(messages, {
        temperature: this.temperatureSettings.reasoning,
        maxTokens: 1500,
        enableTools: true,
        tools: this.toolRegistry.getAvailableTools()
      });

      if (!apiResponse.success) {
        throw new Error(`API call failed: ${apiResponse.error.message}`);
      }

      // Handle potential new tool calls
      if (apiResponse.toolCalls && apiResponse.toolCalls.length > 0) {
        const toolCall = apiResponse.toolCalls[0];
        return {
          success: true,
          updatedReasoning: apiResponse.content,
          nextAction: 'tool_call',
          status: 'continuing',
          shouldContinue: true,
          confidence: 0.8,
          rawResponse: apiResponse.content,
          toolCall: {
            id: toolCall.id,
            name: toolCall.function.name,
            parameters: JSON.parse(toolCall.function.arguments || '{}')
          },
          errors: []
        };
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
   * Build conversation messages from context and observations
   * @param {Object} context - Agent context
   * @param {Object} lastObservation - Latest observation
   * @returns {Array} - Conversation messages
   */
  buildConversationMessages(context, lastObservation) {
    const messages = [];

    // Add system message
    messages.push({
      role: 'system',
      content: 'You are an AI agent that can use tools to help answer questions. Continue your reasoning based on the tool results.'
    });

    // Add user query
    if (context.query) {
      messages.push({
        role: 'user',
        content: context.query
      });
    }

    // Add previous reasoning as assistant message
    if (context.reasoning && context.reasoning.length > 0) {
      const latestReasoning = context.reasoning[context.reasoning.length - 1];
      messages.push({
        role: 'assistant',
        content: latestReasoning.content
      });
    }

    // Add tool call and response if available
    if (lastObservation && lastObservation.type === 'success' && context.actions) {
      const lastAction = context.actions[context.actions.length - 1];
      if (lastAction && lastAction.toolCallId) {
        // Add tool response message
        messages.push(this.createToolMessage(lastAction.toolCallId, {
          toolName: lastAction.tool,
          success: true,
          data: lastObservation.data,
          message: lastObservation.content,
          executionTime: lastObservation.metadata?.executionTime
        }));
      }
    }

    return messages;
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
   * Generate planning for complex multi-step problems with tool awareness
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
        maxTokens: 2000,
        enableTools: false, // Planning doesn't need tool execution, just awareness
        tools: availableTools
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
   * Execute a complete tool-calling conversation
   * @param {string} userQuery - User's query
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} - Complete conversation result
   */
  async executeToolConversation(userQuery, options = {}) {
    const defaultOptions = {
      maxTurns: 5,
      temperature: 0.7,
      enableTools: true
    };

    const finalOptions = { ...defaultOptions, ...options };
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant that can use tools to answer questions. Use the available tools when needed to provide accurate information.'
      },
      {
        role: 'user',
        content: userQuery
      }
    ];

    const conversationHistory = [];
    let turnCount = 0;
    let finalAnswer = '';

    try {
      while (turnCount < finalOptions.maxTurns) {
        turnCount++;
        
        console.log(`=== CONVERSATION TURN ${turnCount} ===`);
        console.log('Current messages:', JSON.stringify(messages, null, 2));

        const apiResponse = await this.callMistralWithRetry(messages, {
          temperature: finalOptions.temperature,
          maxTokens: 1500,
          enableTools: finalOptions.enableTools,
          tools: this.toolRegistry.getAvailableTools()
        });

        console.log(`=== TURN ${turnCount} API RESPONSE ===`);
        console.log('Success:', apiResponse.success);
        console.log('Content:', apiResponse.content);
        console.log('Tool calls:', apiResponse.toolCalls);
        console.log('Finish reason:', apiResponse.finishReason);

        if (!apiResponse.success) {
          throw new Error(`API call failed: ${apiResponse.error.message}`);
        }

        // Add assistant response to messages
        const assistantMessage = {
          role: 'assistant',
          content: apiResponse.content || null
        };
        
        // Add tool_calls if present
        if (apiResponse.toolCalls && apiResponse.toolCalls.length > 0) {
          assistantMessage.tool_calls = apiResponse.toolCalls;
          console.log('Adding tool_calls to assistant message:', apiResponse.toolCalls);
        }
        
        messages.push(assistantMessage);

        conversationHistory.push({
          turn: turnCount,
          role: 'assistant',
          content: apiResponse.content,
          toolCalls: apiResponse.toolCalls,
          finishReason: apiResponse.finishReason
        });

        // Store the latest response as potential final answer
        if (apiResponse.content) {
          finalAnswer = apiResponse.content;
        }

        // If no tool calls, conversation is complete
        if (!apiResponse.toolCalls || apiResponse.toolCalls.length === 0) {
          console.log('No tool calls found, ending conversation');
          break;
        }
        
        console.log(`Found ${apiResponse.toolCalls.length} tool calls to execute`);

        // Execute tool calls
        for (const toolCall of apiResponse.toolCalls) {
          try {
            const toolName = toolCall.function.name;
            const parameters = JSON.parse(toolCall.function.arguments || '{}');

            console.log(`=== EXECUTING TOOL: ${toolName} ===`);
            console.log('Tool call ID:', toolCall.id);
            console.log('Parameters:', parameters);

            // Execute tool
            const toolResult = await this.executeToolCall(toolName, parameters);

            console.log(`=== TOOL ${toolName} RESULT ===`);
            console.log('Success:', toolResult.success);
            console.log('Data:', toolResult.data);
            console.log('Message:', toolResult.message);

            // Add tool response to messages
            const toolMessage = this.createToolMessage(toolCall.id, toolResult);
            console.log('Tool message for conversation:', toolMessage);
            messages.push(toolMessage);

            conversationHistory.push({
              turn: turnCount,
              role: 'tool',
              toolName: toolName,
              toolCallId: toolCall.id,
              parameters: parameters,
              result: toolResult
            });

          } catch (toolError) {
            console.error(`=== TOOL EXECUTION ERROR: ${toolCall.function.name} ===`);
            console.error('Error:', toolError);
            
            // Add error response
            const errorMessage = {
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({
                success: false,
                error: toolError.message
              })
            };
            console.log('Error message for conversation:', errorMessage);
            messages.push(errorMessage);
          }
        }

        // Check if we should continue
        if (apiResponse.finishReason === 'stop') {
          break;
        }
      }

      // Get the final response after tool execution
      if (conversationHistory.length > 0) {
        const lastEntry = conversationHistory[conversationHistory.length - 1];
        if (lastEntry.role === 'assistant' && lastEntry.content) {
          finalAnswer = lastEntry.content;
        }
      }

      return {
        success: true,
        finalResponse: finalAnswer,
        conversationHistory: conversationHistory,
        totalTurns: turnCount,
        messages: messages,
        toolsUsed: conversationHistory
          .filter(entry => entry.role === 'tool')
          .map(entry => ({
            name: entry.toolName,
            parameters: entry.parameters,
            success: entry.result?.success || false
          }))
      };

    } catch (error) {
      console.error('Tool conversation error:', error);
      return {
        success: false,
        error: {
          type: 'conversation_failed',
          message: error.message,
          conversationHistory: conversationHistory,
          totalTurns: turnCount
        }
      };
    }
  }

  /**
   * Execute a single tool call - connects to tool registry
   * @param {string} toolName - Tool name
   * @param {Object} parameters - Tool parameters
   * @returns {Promise<Object>} - Tool result
   */
  async executeToolCall(toolName, parameters) {
    if (!this.toolRegistry) {
      throw new Error('Tool registry not available');
    }

    try {
      const tool = this.toolRegistry.getTool(toolName);
      if (!tool) {
        throw new Error(`Tool '${toolName}' not found`);
      }

      const startTime = Date.now();
      const result = await tool.execute(parameters);
      const executionTime = Date.now() - startTime;

      return {
        toolName: toolName,
        success: result.success,
        data: result.data,
        message: result.message,
        executionTime: executionTime
      };

    } catch (error) {
      return {
        toolName: toolName,
        success: false,
        data: null,
        message: error.message,
        executionTime: 0
      };
    }
  }

  /**
   * Convert tools to Mistral API format
   * @param {Array} tools - Array of tool objects
   * @returns {Array} - Tools in Mistral API format
   */
  convertToolsToMistralFormat(tools) {
    return tools.map(tool => {
      // Get parameters from tool - handle both array and Map formats
      let parameters = [];
      if (tool.parameters) {
        if (Array.isArray(tool.parameters)) {
          parameters = tool.parameters;
        } else if (tool.parameters instanceof Map) {
          parameters = Array.from(tool.parameters.values());
        }
      }

      return {
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: this.convertParametersToJsonSchema(parameters)
        }
      };
    });
  }

  /**
   * Convert tool parameters to JSON Schema format
   * @param {Array} parameters - Tool parameters
   * @returns {Object} - JSON Schema object
   */
  convertParametersToJsonSchema(parameters) {
    const schema = {
      type: 'object',
      properties: {},
      required: []
    };

    if (!Array.isArray(parameters)) {
      return schema;
    }

    parameters.forEach(param => {
      // Handle both object and Map entry formats
      const paramName = param.name || param[0];
      const paramData = param.name ? param : param[1];

      schema.properties[paramName] = {
        type: paramData.type || 'string',
        description: paramData.description || ''
      };

      if (paramData.required) {
        schema.required.push(paramName);
      }

      if (paramData.defaultValue !== undefined) {
        schema.properties[paramName].default = paramData.defaultValue;
      }
    });

    return schema;
  }

  /**
   * Call Mistral API with retry logic and tool support
   * @param {string|Array} messages - Messages to send (string for single user message, array for conversation)
   * @param {Object} options - API call options
   * @returns {Promise<Object>} - API response
   */
  async callMistralWithRetry(messages, options = {}) {
    const defaultOptions = {
      temperature: 0.7,
      maxTokens: 1500,
      enableTools: false,
      tools: []
    };

    const finalOptions = { ...defaultOptions, ...options };
    let lastError;

    // Format messages
    let formattedMessages;
    if (typeof messages === 'string') {
      formattedMessages = [{ role: 'user', content: messages }];
    } else if (Array.isArray(messages)) {
      formattedMessages = messages;
    } else {
      throw new Error('Messages must be a string or array');
    }

    // Validate message format according to Mistral API requirements
    formattedMessages = formattedMessages.map(msg => {
      if (!msg.role) {
        throw new Error('Message must have a role field');
      }
      
      // Ensure content is present for non-tool messages or when required
      if (msg.role !== 'tool' && !msg.content && !msg.tool_calls) {
        throw new Error(`Message with role '${msg.role}' must have content`);
      }
      
      return msg;
    });

    // Prepare API call parameters
    const apiParams = {
      model: 'mistral-large-latest',
      messages: formattedMessages,
      temperature: finalOptions.temperature,
      max_tokens: finalOptions.maxTokens
    };

    // Add tools if enabled and available
    if (finalOptions.enableTools && finalOptions.tools && finalOptions.tools.length > 0) {
      apiParams.tools = this.convertToolsToMistralFormat(finalOptions.tools);
      apiParams.tool_choice = 'auto'; // Let the model decide when to use tools
      
      // Debug logging
      console.log(`Mistral API call with ${apiParams.tools.length} tools enabled`);
      if (process.env.NODE_ENV === 'development') {
        console.log('Tools:', JSON.stringify(apiParams.tools, null, 2));
      }
    }

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log('=== MISTRAL API REQUEST ===');
        console.log('Model:', apiParams.model);
        console.log('Messages:', JSON.stringify(apiParams.messages, null, 2));
        console.log('Tools enabled:', !!apiParams.tools);
        if (apiParams.tools) {
          console.log('Number of tools:', apiParams.tools.length);
          console.log('Tool names:', apiParams.tools.map(t => t.function.name));
        }
        console.log('Tool choice:', apiParams.tool_choice);
        
        const response = await this.mistralClient.chat.complete(apiParams);

        console.log('=== MISTRAL API RESPONSE ===');
        console.log('Full response:', JSON.stringify(response, null, 2));

        if (!response.choices || !response.choices[0]) {
          throw new Error('Invalid response format from Mistral API');
        }

        const choice = response.choices[0];
        
        console.log('=== CHOICE DETAILS ===');
        console.log('Message content:', choice.message.content);
        console.log('Tool calls:', choice.message.tool_calls);
        console.log('Finish reason:', choice.finish_reason);
        console.log('Has tool calls:', !!(choice.message.tool_calls && choice.message.tool_calls.length > 0));
        
        return {
          success: true,
          content: choice.message.content,
          toolCalls: choice.message.tool_calls || null,
          finishReason: choice.finish_reason,
          usage: response.usage,
          rawResponse: response
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
      mistralClientInitialized: !!this.mistralClient,
      toolCallingEnabled: true,
      availableTools: this.toolRegistry.getAvailableTools().length,
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

    // Reinitialize Mistral client if API key changed
    if (config.apiKey) {
      this.mistralClient = new Mistral({
        apiKey: config.apiKey
      });
    }
  }

  /**
   * Test Mistral API connection
   * @returns {Promise<Object>} - Connection test result
   */
  async testConnection() {
    try {
      const testResponse = await this.callMistralWithRetry('Hello, this is a connection test.', {
        temperature: 0.1,
        maxTokens: 50
      });

      return {
        success: testResponse.success,
        connected: testResponse.success,
        message: testResponse.success ? 'Connection successful' : testResponse.error.message,
        usage: testResponse.usage
      };

    } catch (error) {
      return {
        success: false,
        connected: false,
        message: `Connection failed: ${error.message}`,
        error: error
      };
    }
  }

  /**
   * Get available models from Mistral
   * @returns {Promise<Object>} - Available models
   */
  async getAvailableModels() {
    try {
      const models = await this.mistralClient.models.list();
      return {
        success: true,
        models: models.data || []
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        models: []
      };
    }
  }

  // ===== LEGACY COMPATIBILITY METHODS =====
  // These methods provide backward compatibility with the original aiService

  /**
   * Generate response for UI generation (legacy compatibility)
   * @param {string} userMessage - User's mathematical question
   * @returns {Promise<Object>} - Structured response with reasoning and UI code
   */
  async generateResponse(userMessage) {
    try {
      // Validate input
      if (!userMessage || typeof userMessage !== 'string') {
        throw new Error('Invalid user message provided');
      }

      // Create structured prompt for UI generation
      const prompt = this.createUIGenerationPrompt(userMessage);

      // Call Mistral API
      const apiResponse = await this.callMistralWithRetry(prompt, {
        temperature: 0.7,
        maxTokens: 2000
      });

      if (!apiResponse.success) {
        throw new Error(`API call failed: ${apiResponse.error.message}`);
      }

      // Parse structured response
      const parsedResponse = this.parseStructuredResponse(apiResponse.content);

      return {
        success: true,
        reasoning: parsedResponse.reasoning,
        uiCode: parsedResponse.uiCode,
        hasUI: parsedResponse.hasUI,
        rawContent: apiResponse.content
      };

    } catch (error) {
      console.error('Enhanced AI Service - Generate Response Error:', error);
      
      return {
        success: false,
        error: {
          type: this.getErrorType(error),
          message: error.message,
          details: error.stack
        }
      };
    }
  }

  /**
   * Generate calculation response (legacy compatibility)
   * @param {string} calculationPrompt - The calculation prompt with user values
   * @returns {Promise<Object>} - Structured response with reasoning and solution
   */
  async generateCalculationResponse(calculationPrompt) {
    try {
      // Validate input
      if (!calculationPrompt || typeof calculationPrompt !== 'string') {
        throw new Error('Invalid calculation prompt provided');
      }

      // Call Mistral API directly with calculation prompt
      const apiResponse = await this.callMistralWithRetry(calculationPrompt, {
        temperature: 0.3, // Lower temperature for more precise calculations
        maxTokens: 1000
      });

      if (!apiResponse.success) {
        throw new Error(`API call failed: ${apiResponse.error.message}`);
      }

      // Parse calculation response
      const parsedResponse = this.parseCalculationResponse(apiResponse.content);

      return {
        success: true,
        reasoning: parsedResponse.reasoning,
        solution: parsedResponse.solution,
        rawContent: apiResponse.content
      };

    } catch (error) {
      console.error('Enhanced AI Service - Calculation Error:', error);
      
      // Handle network errors specifically
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return {
          success: false,
          error: {
            type: 'network_error',
            message: 'Network error: Unable to connect to Mistral API'
          }
        };
      }
      
      return {
        success: false,
        error: {
          type: this.getErrorType(error),
          message: error.message,
          details: error.stack
        }
      };
    }
  }

  /**
   * Create UI generation prompt (legacy compatibility)
   * @param {string} userMessage - The user's mathematical question
   * @returns {string} - Formatted prompt for Mistral
   */
  createUIGenerationPrompt(userMessage) {
    return `You are an AI assistant that helps users with mathematical problems by providing both explanations and interactive UI components.

When responding to mathematical questions, you must structure your response with two sections:

1. <thought>Your reasoning and explanation</thought>
2. <ui>JavaScript code using safe functions to create interactive components</ui>

Available safe functions for UI creation:
- createElement(tag, props, children) - Creates HTML elements
- createInput(props) - Creates input fields (props: {name, type, placeholder, value})
- createButton(props, text) - Creates buttons (props: {onClick})
- createForm(props, children) - Creates forms
- createSelect(props, options) - Creates select dropdowns (props: {name, value}, options: array of createOption)
- createOption(value, text, selected) - Creates option elements for select dropdowns

For calculations, use onClick handlers like 'calculateLoan', 'calculateArea', etc.

Example response format:
<thought>
I'll create a simple calculator for this mathematical problem. The user wants to calculate compound interest, so I'll provide input fields for principal, rate, time, and compounding frequency.
</thought>
<ui>
createForm({}, [
  createElement('h3', {}, ['Compound Interest Calculator']),
  createInput({name: 'principal', type: 'number', placeholder: 'Principal amount'}),
  createInput({name: 'rate', type: 'number', placeholder: 'Annual interest rate (%)'}),
  createInput({name: 'time', type: 'number', placeholder: 'Time (years)'}),
  createSelect({name: 'frequency'}, [
    createOption('1', 'Annually'),
    createOption('2', 'Semi-annually'),
    createOption('4', 'Quarterly'),
    createOption('12', 'Monthly')
  ]),
  createButton({onClick: 'calculateCompoundInterest'}, 'Calculate'),
  createElement('div', {id: 'result'}, ['Result will appear here'])
])
</ui>

User question: ${userMessage}

Please provide your response following the exact format above.`;
  }

  /**
   * Parse structured response to extract thought and UI sections (legacy compatibility)
   * @param {string} content - Raw response content from Mistral
   * @returns {Object} - Parsed response with reasoning and uiCode
   */
  parseStructuredResponse(content) {
    const result = {
      reasoning: '',
      uiCode: '',
      hasUI: false
    };

    // Extract thought section
    const thoughtMatch = content.match(/<thought>([\s\S]*?)<\/thought>/i);
    if (thoughtMatch) {
      result.reasoning = thoughtMatch[1].trim();
    }

    // Extract UI section
    const uiMatch = content.match(/<ui>([\s\S]*?)<\/ui>/i);
    if (uiMatch) {
      result.uiCode = uiMatch[1].trim();
      result.hasUI = true;
    }

    // If no structured tags found, treat entire content as reasoning
    if (!thoughtMatch && !uiMatch) {
      result.reasoning = content.trim();
    }

    return result;
  }

  /**
   * Parse calculation response to extract thought and solution sections (legacy compatibility)
   * @param {string} content - Raw response content from Mistral
   * @returns {Object} - Parsed response with reasoning and solution
   */
  parseCalculationResponse(content) {
    const result = {
      reasoning: '',
      solution: ''
    };

    // Extract thought section
    const thoughtMatch = content.match(/<thought>([\s\S]*?)<\/thought>/i);
    if (thoughtMatch) {
      result.reasoning = thoughtMatch[1].trim();
    }

    // Extract solution section
    const solutionMatch = content.match(/<solution>([\s\S]*?)<\/solution>/i);
    if (solutionMatch) {
      result.solution = solutionMatch[1].trim();
    }

    // If no structured tags found, try to extract the final answer
    if (!thoughtMatch && !solutionMatch) {
      result.reasoning = content.trim();
      // Try to find a numerical result at the end
      const lines = content.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      if (lastLine && (lastLine.includes('$') || lastLine.match(/\d+/))) {
        result.solution = lastLine.trim();
      }
    }

    return result;
  }

  /**
   * Categorize error types for better error handling (legacy compatibility)
   * @param {Error} error - The error object
   * @returns {string} - Error type category
   */
  getErrorType(error) {
    if (error.message.includes('API key')) {
      return 'authentication_error';
    }
    if (error.message.includes('Network error') || error.message.includes('fetch')) {
      return 'network_error';
    }
    if (error.message.includes('Mistral API error')) {
      return 'api_error';
    }
    if (error.message.includes('Invalid')) {
      return 'validation_error';
    }
    return 'unknown_error';
  }
}

export default EnhancedAIService;