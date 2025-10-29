import EnhancedAIService from '../../../core/enhancedAIService.js';

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

    // Validate that values object is not empty
    if (Object.keys(values).length === 0) {
      return Response.json(
        {
          error: {
            type: 'validation_error',
            message: 'At least one input value is required for calculation.'
          }
        },
        { status: 400 }
      );
    }

    // Sanitize values to prevent injection attacks
    const sanitizedValues = {};
    for (const [key, value] of Object.entries(values)) {
      // Only allow alphanumeric keys
      if (!/^[a-zA-Z0-9_]+$/.test(key)) {
        return Response.json(
          {
            error: {
              type: 'validation_error',
              message: `Invalid field name: ${key}. Only alphanumeric characters and underscores are allowed.`
            }
          },
          { status: 400 }
        );
      }
      
      // Sanitize string values
      if (typeof value === 'string') {
        sanitizedValues[key] = value.trim().slice(0, 1000); // Limit length
      } else {
        sanitizedValues[key] = value;
      }
    }

    // Create calculation prompt with sanitized values
    const calculationPrompt = createCalculationPrompt(action, sanitizedValues, context);

    // Create enhanced AI service instance for calculation
    const enhancedAIService = new EnhancedAIService(null); // No tool registry needed for calculations
    
    // Get AI response for calculation
    const aiResponse = await enhancedAIService.generateCalculationResponse(calculationPrompt);

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
  // Convert values object to a readable format with type information
  const valuesList = Object.entries(values)
    .map(([key, value]) => {
      // Provide type context for better AI understanding
      const numValue = Number(value);
      const isNumber = !isNaN(numValue) && value !== '';
      return `${key}: ${value}${isNumber ? ` (numeric: ${numValue})` : ' (text)'}`;
    })
    .join(', ');

  // Enhanced prompt with better context and validation
  return `Please perform the calculation "${action}" with the following user-provided values:

Input Values:
${valuesList}

${context ? `Original Question Context: ${context}` : ''}

Instructions:
1. Validate that all required inputs are provided and reasonable
2. Perform the calculation step by step
3. Round results to appropriate precision (typically 2-4 decimal places)
4. Include units in your final answer when applicable

Please structure your response with:
<thought>
- Validate inputs and identify any issues
- Show your calculation process step by step
- Explain any assumptions or formulas used
</thought>
<solution>The final numerical result with appropriate units and formatting</solution>

If any inputs are invalid or missing, explain the issue in the thought section and provide guidance in the solution section.`;
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