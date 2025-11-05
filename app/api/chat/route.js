import SandboxExecutor from '../../../sandbox/sandboxExecutor.js';
import IntegratedAgentSystem from '../../../core/integratedAgentSystem.js';
import EnhancedAIService from '../../../core/enhancedAIService.js';
import ToolManager from '../../../tools/manager/toolManager.js';

/**
 * POST /api/chat - Main chat API route
 * Handles user messages, integrates with AI service, and executes UI code safely
 * Now supports agent mode for complex reasoning tasks
 */
export async function POST(request) {
  console.log("Chat API called");
  try {
    // Parse request body
    const body = await request.json();
    const { message, mode } = body;

    // Validate input
    if (!message || typeof message !== 'string') {
      return Response.json(
        {
          error: {
            type: 'validation_error',
            message: 'Message is required and must be a string'
          }
        },
        { status: 400 }
      );
    }

    // Determine if this should use agent mode
    const shouldUseAgentMode = mode === 'agent' || detectAgentSuitableQuery(message);

    if (shouldUseAgentMode) {
      console.log("Using agent mode for query processing");
      return await handleAgentMode(message);
    } else {
      console.log("Using UI generation mode for query processing");
      return await handleUIGenerationMode(message);
    }

  } catch (error) {
    console.error('Chat API Error:', error);

    return Response.json(
      {
        error: {
          type: 'server_error',
          message: 'An unexpected error occurred while processing your request'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * Detect if a query is suitable for agent mode vs UI generation
 * @param {string} message - User message
 * @returns {boolean} - Whether to use agent mode
 */
function detectAgentSuitableQuery(message) {
  const messageLower = message.toLowerCase();

  // Tool-specific keywords that should trigger agent mode (for direct calculations/queries)
  const toolKeywords = [
    'weather in', 'temperature in', 'forecast for', 'climate in',
    'flight from', 'flights from', 'airline', 'airport', 'travel to',
    'area of', 'what is the area', 'calculate area', 'find area',
    'percentage of', 'percent of', 'what percentage', 'calculate percentage'
  ];

  // UI generation keywords that should trigger UI mode
  const uiKeywords = [
    'create a calculator', 'build a calculator', 'make a calculator',
    'create a triangle calculator', 'create a rectangle calculator', 'create a circle calculator',
    'create an area calculator', 'build an area calculator', 'make an area calculator',
    'triangle area calculator', 'rectangle area calculator', 'circle area calculator',
    'generate a form', 'create a form', 'build a form',
    'loan calculator', 'mortgage calculator', 'interest calculator',
    'create an interface', 'build an interface', 'generate interface'
  ];

  // Agent reasoning keywords
  const agentKeywords = [
    'analyze', 'research', 'investigate', 'compare', 'evaluate', 'assess',
    'explain why', 'what if', 'help me understand', 'break down',
    'step by step', 'reasoning', 'logic', 'decision', 'strategy'
  ];

  // Check for explicit UI generation requests first
  const hasUIKeywords = uiKeywords.some(keyword => messageLower.includes(keyword));
  if (hasUIKeywords) {
    return false; // Use UI generation mode
  }

  // Check for tool-specific queries
  const hasToolKeywords = toolKeywords.some(keyword => messageLower.includes(keyword));
  if (hasToolKeywords) {
    return true; // Use agent mode for tool execution
  }

  // Check for agent reasoning keywords
  const hasAgentKeywords = agentKeywords.some(keyword => messageLower.includes(keyword));
  if (hasAgentKeywords) {
    return true; // Use agent mode for reasoning
  }

  // Default to UI mode for simple calculator requests
  if (messageLower.includes('calculator') || messageLower.includes('calculate')) {
    return false; // Use UI generation mode
  }

  // For other cases, use query complexity as heuristic
  const isComplex = message.length > 100 ||
    (message.includes('?') && message.split('?').length > 2) ||
    message.includes(' and ') ||
    message.includes(' or ') ||
    message.includes('because') ||
    message.includes('however');

  return isComplex;
}

/**
 * Handle agent mode processing with direct tool calling
 * @param {string} message - User message
 * @returns {Promise<Response>} - Agent response
 */
async function handleAgentMode(message) {
  try {
    // Initialize tool manager
    const toolManager = new ToolManager();
    await toolManager.initialize();

    // Initialize enhanced AI service
    const aiService = new EnhancedAIService(toolManager.toolRegistry);

    // Test connection
    const connectionTest = await aiService.testConnection();
    if (!connectionTest.success) {
      throw new Error(`Mistral API connection failed: ${connectionTest.message}`);
    }

    // Debug: Log available tools
    const availableTools = toolManager.getAvailableTools();
    console.log('=== AVAILABLE TOOLS ===');
    console.log(`Found ${availableTools.length} tools:`);
    availableTools.forEach(tool => {
      console.log(`- ${tool.name}: ${tool.description}`);
      console.log(`  Category: ${tool.category}`);
      console.log(`  Parameters: ${tool.parameters ? tool.parameters.length : 0}`);
    });

    // Debug: Test tool formatting for Mistral
    const mistralFormattedTools = aiService.convertToolsToMistralFormat(availableTools);
    console.log('=== MISTRAL FORMATTED TOOLS ===');
    console.log(JSON.stringify(mistralFormattedTools, null, 2));

    // Execute tool conversation
    console.log('=== STARTING TOOL CONVERSATION ===');
    console.log('User message:', message);
    const conversationResult = await aiService.executeToolConversation(message, {
      maxTurns: 5,
      temperature: 0.7
    });

    console.log('=== CONVERSATION RESULT ===');
    console.log('Success:', conversationResult.success);
    console.log('Final response:', conversationResult.finalResponse);
    console.log('Tools used:', conversationResult.toolsUsed);
    console.log('Total turns:', conversationResult.totalTurns);

    if (!conversationResult.success) {
      console.error('Conversation failed:', conversationResult.error);
      throw new Error(`Tool conversation failed: ${conversationResult.error.message}`);
    }

    // Transform to expected API format
    const response = {
      reasoning: conversationResult.finalResponse,
      uiComponents: null,
      hasUI: false,
      agentMode: true,
      iterations: conversationResult.totalTurns,
      toolsUsed: conversationResult.toolsUsed || [],
      finalConfidence: conversationResult.toolsUsed?.length > 0 ? 0.9 : 0.7,
      strategy: 'direct_tool_calling',
      status: 'completed',

      // System metadata
      systemMetadata: {
        processingMode: 'direct_tool_calling',
        toolsAvailable: toolManager.getAvailableTools().length,
        mistralToolCalling: true,
        conversationTurns: conversationResult.totalTurns
      },

      // Cost control status (simplified)
      costControlStatus: {
        apiCallsUsed: conversationResult.totalTurns,
        toolExecutionsUsed: conversationResult.toolsUsed?.length || 0
      },

      guardrailsApplied: true,
      executionTime: Date.now() - Date.now(), // Will be updated by timing
      sessionId: `direct_${Date.now()}`
    };

    // Always add conversation history for debugging
    response.conversationHistory = conversationResult.conversationHistory;
    response.debugInfo = {
      toolsAvailable: availableTools.length,
      mistralFormattedTools: mistralFormattedTools.length,
      conversationSuccess: conversationResult.success
    };

    return Response.json(response);

  } catch (error) {
    console.error('Direct tool calling error:', error);

    const errorResponse = {
      error: {
        type: 'direct_tool_calling_error',
        message: 'An error occurred during tool calling',
        details: error.message
      },
      reasoning: 'I encountered an error while processing your request. Please try again.',
      agentMode: true,
      status: 'error',
      iterations: 0,
      toolsUsed: [],
      finalConfidence: 0,
      guardrailsApplied: true
    };

    return Response.json(errorResponse, { status: 500 });
  }
}

/**
 * Handle traditional UI generation mode (backward compatibility)
 * @param {string} message - User message
 * @returns {Promise<Response>} - UI generation response
 */
async function handleUIGenerationMode(message) {
  try {
    // Create enhanced AI service instance for UI generation
    const enhancedAIService = new EnhancedAIService(null); // No tool registry needed for UI generation

    // Get AI response
    const aiResponse = await enhancedAIService.generateResponse(message);

    // Handle AI service errors
    if (!aiResponse.success) {
      return Response.json(
        {
          error: {
            type: aiResponse.error.type,
            message: aiResponse.error.message
          }
        },
        { status: 500 }
      );
    }

    // Prepare response object
    const response = {
      reasoning: aiResponse.reasoning,
      uiComponents: null,
      hasUI: aiResponse.hasUI,
      agentMode: false
    };

    // If there's UI code, execute it in sandbox
    if (aiResponse.hasUI && aiResponse.uiCode) {
      const sandboxExecutor = new SandboxExecutor();
      const executionResult = await sandboxExecutor.executeCode(aiResponse.uiCode);

      if (executionResult.success) {
        // Wrap single component in array for frontend compatibility
        response.uiComponents = Array.isArray(executionResult.result)
          ? executionResult.result
          : [executionResult.result];
      } else {
        // If sandbox execution fails, still return the reasoning but with error info
        response.uiComponents = null;
        response.sandboxError = {
          type: executionResult.error.type,
          message: executionResult.error.message
        };
      }
    }

    return Response.json(response);

  } catch (error) {
    console.error('UI generation mode error:', error);
    throw error; // Re-throw to be handled by main error handler
  }
}

/**
 * Handle unsupported HTTP methods
 */
export async function GET() {
  return Response.json(
    {
      error: {
        type: 'method_not_allowed',
        message: 'GET method not supported. Use POST to send chat messages.'
      }
    },
    { status: 405 }
  );
}