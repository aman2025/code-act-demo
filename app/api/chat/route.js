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

    // For now, return a simple response to test the route
    const response = {
      reasoning: `I received your message: "${message}". The AI service integration is temporarily simplified for testing.`,
      uiComponents: null,
      hasUI: false
    };

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