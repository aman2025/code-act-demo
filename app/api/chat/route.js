import aiService from '../../../core/aiService.js';
import SandboxExecutor from '../../../core/sandboxExecutor.js';

/**
 * POST /api/chat - Main chat API route
 * Handles user messages, integrates with AI service, and executes UI code safely
 */
export async function POST(request) {
  console.log("Chat API called");
  try {
    // Parse request body
    const body = await request.json();
    const { message } = body;

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

    // Get AI response
    const aiResponse = await aiService.generateResponse(message);

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
      hasUI: aiResponse.hasUI
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