import SandboxExecutor from '../../../core/sandboxExecutor.js';
import IntegratedAgentSystem from '../../../core/integratedAgentSystem.js';
import EnhancedAIService from '../../../core/enhancedAIService.js';

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
 * Handle agent mode processing with integrated system
 * @param {string} message - User message
 * @returns {Promise<Response>} - Agent response
 */
async function handleAgentMode(message) {
  let integratedSystem = null;
  
  try {
    // Initialize integrated agent system
    integratedSystem = new IntegratedAgentSystem();
    
    // Configure system with cost controls and safety guardrails
    const systemConfig = {
      costControls: {
        maxAPICallsPerSession: 15, // Conservative limit for API
        maxExecutionTimeMs: 180000, // 3 minutes max
        maxToolExecutionsPerSession: 20
      },
      safetyGuardrails: {
        maxIterationsPerQuery: 8, // Reasonable for API response
        confidenceThreshold: 0.3,
        errorThreshold: 3,
        timeoutMs: 45000, // 45 seconds per iteration
        enableLogging: true,
        enableMonitoring: true
      },
      agent: {
        maxIterations: 6,
        strategy: 'default',
        autonomous: {
          operationMode: 'supervised',
          thresholds: {
            confidenceThreshold: 0.6,
            maxIterationsBeforeHuman: 4
          }
        }
      }
    };

    await integratedSystem.initialize(systemConfig);

    // Process query with integrated system
    const agentResponse = await integratedSystem.agentController.processQuery(message, systemConfig.agent);

    // Transform agent response to enhanced API format
    const response = {
      reasoning: Array.isArray(agentResponse.reasoning) 
        ? agentResponse.reasoning.join('\n\n') 
        : agentResponse.reasoning,
      uiComponents: null, // Agent mode focuses on reasoning, not UI
      hasUI: false,
      agentMode: true,
      iterations: agentResponse.iterations || 0,
      toolsUsed: agentResponse.toolsUsed || [],
      finalConfidence: agentResponse.finalConfidence || 0,
      strategy: agentResponse.strategy || 'default',
      status: agentResponse.success ? 'completed' : 'error',
      
      // Enhanced metadata from integrated system
      systemMetadata: agentResponse.systemMetadata || {},
      costControlStatus: agentResponse.costControlStatus || {},
      
      // Safety and monitoring information
      guardrailsApplied: true,
      executionTime: agentResponse.executionTime,
      sessionId: agentResponse.sessionId
    };

    // Handle agent errors with enhanced error information
    if (!agentResponse.success && agentResponse.error) {
      response.agentError = {
        type: agentResponse.error.type,
        message: agentResponse.error.message,
        iteration: agentResponse.error.iteration
      };
      
      // Add cost limit information if applicable
      if (agentResponse.costLimitExceeded) {
        response.costLimitExceeded = true;
      }
    }

    // Add system status for debugging (in development)
    if (process.env.NODE_ENV === 'development') {
      response.systemStatus = integratedSystem.getSystemStatus();
    }

    return Response.json(response);

  } catch (error) {
    console.error('Integrated agent system processing error:', error);
    
    // Create comprehensive error response
    const errorResponse = {
      error: {
        type: 'integrated_system_error',
        message: 'An error occurred during integrated agent processing',
        details: error.message
      },
      agentMode: true,
      guardrailsApplied: true,
      systemError: true
    };

    // Add system status if available
    if (integratedSystem && integratedSystem.initialized) {
      try {
        errorResponse.systemStatus = integratedSystem.getSystemStatus();
      } catch (statusError) {
        console.error('Failed to get system status:', statusError);
      }
    }

    return Response.json(errorResponse, { status: 500 });
    
  } finally {
    // Cleanup: shutdown integrated system if it was initialized
    if (integratedSystem && integratedSystem.initialized) {
      try {
        await integratedSystem.shutdown();
      } catch (shutdownError) {
        console.error('Error during system shutdown:', shutdownError);
      }
    }
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