import aiService from '../../../core/aiService.js';

/**
 * POST /api/calculate - Calculation API route for user interactions
 * Handles user input values from generated forms and returns calculation results
 */
export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { action, componentId, values, context } = body;

    // Validate input
    if (!action || !values || typeof values !== 'object') {
      return Response.json(
        { 
          error: {
            type: 'validation_error',
            message: 'Action and values are required. Values must be an object.'
          }
        },
        { status: 400 }
      );
    }

    // Create calculation prompt with user values
    const calculationPrompt = createCalculationPrompt(action, values, context);

    // Get AI response for calculation
    const aiResponse = await aiService.generateCalculationResponse(calculationPrompt);

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

    // Return calculation result
    return Response.json({
      reasoning: aiResponse.reasoning,
      solution: aiResponse.solution,
      componentId: componentId || null
    });

  } catch (error) {
    console.error('Calculate API Error:', error);
    
    return Response.json(
      {
        error: {
          type: 'server_error',
          message: 'An unexpected error occurred while processing the calculation'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * Create a calculation prompt with user input values
 * @param {string} action - The calculation action (e.g., 'calculateLoan', 'calculateArea')
 * @param {Object} values - User input values from the form
 * @param {string} context - Original question context
 * @returns {string} - Formatted calculation prompt
 */
function createCalculationPrompt(action, values, context) {
  // Convert values object to a readable format
  const valuesList = Object.entries(values)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');

  return `Please perform the calculation "${action}" with the following user-provided values: ${valuesList}

${context ? `Original context: ${context}` : ''}

Please structure your response with:
1. <thought>Your calculation process and reasoning</thought>
2. <solution>The final numerical result or answer</solution>

Show your work in the thought section and provide the clean final answer in the solution section.`;
}

/**
 * Handle unsupported HTTP methods
 */
export async function GET() {
  return Response.json(
    {
      error: {
        type: 'method_not_allowed',
        message: 'GET method not supported. Use POST to send calculation requests.'
      }
    },
    { status: 405 }
  );
}