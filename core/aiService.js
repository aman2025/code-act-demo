/**
 * AI Service for Mistral API integration
 * Handles structured responses with <thought> and <ui> tags
 */

const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

class AIService {
  constructor() {
    this.apiKey = process.env.MISTRAL_API_KEY;
    if (!this.apiKey) {
      console.warn('MISTRAL_API_KEY not found in environment variables');
    }
  }

  /**
   * Generate a structured prompt for mathematical UI generation
   * @param {string} userMessage - The user's mathematical question
   * @returns {string} - Formatted prompt for Mistral
   */
  createPrompt(userMessage) {
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
   * Send request to Mistral API
   * @param {string} message - User's message
   * @returns {Promise<Object>} - API response
   */
  async callMistralAPI(message) {
    if (!this.apiKey) {
      throw new Error('Mistral API key not configured');
    }

    const prompt = this.createPrompt(message);

    try {
      const response = await fetch(MISTRAL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'mistral-large-latest',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Mistral API error: ${response.status} - ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to Mistral API');
      }
      throw error;
    }
  }

  /**
   * Parse structured response to extract thought and UI sections
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
   * Generate a calculation response for user input values
   * @param {string} calculationPrompt - The calculation prompt with user values
   * @returns {Promise<Object>} - Structured response with reasoning and solution
   */
  async generateCalculationResponse(calculationPrompt) {
    try {
      // Validate API key
      if (!this.apiKey) {
        throw new Error('Mistral API key not configured');
      }

      // Validate input
      if (!calculationPrompt || typeof calculationPrompt !== 'string') {
        throw new Error('Invalid calculation prompt provided');
      }

      // Call Mistral API directly with calculation prompt
      const response = await fetch(MISTRAL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'mistral-large-latest',
          messages: [
            {
              role: 'user',
              content: calculationPrompt
            }
          ],
          temperature: 0.3, // Lower temperature for more precise calculations
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Mistral API error: ${response.status} - ${errorData.message || response.statusText}`);
      }

      const data = await response.json();

      // Extract content from API response
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from Mistral API');
      }

      const content = data.choices[0].message.content;

      // Parse calculation response
      const parsedResponse = this.parseCalculationResponse(content);

      return {
        success: true,
        reasoning: parsedResponse.reasoning,
        solution: parsedResponse.solution,
        rawContent: content
      };

    } catch (error) {
      console.error('AI Service Calculation Error:', error);
      
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
   * Parse calculation response to extract thought and solution sections
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
   * Main method to get AI response for mathematical questions
   * @param {string} userMessage - User's mathematical question
   * @returns {Promise<Object>} - Structured response with reasoning and UI code
   */
  async generateResponse(userMessage) {
    try {
      // Validate input
      if (!userMessage || typeof userMessage !== 'string') {
        throw new Error('Invalid user message provided');
      }

      // Call Mistral API
      const apiResponse = await this.callMistralAPI(userMessage);

      // Extract content from API response
      if (!apiResponse.choices || !apiResponse.choices[0] || !apiResponse.choices[0].message) {
        throw new Error('Invalid response format from Mistral API');
      }

      const content = apiResponse.choices[0].message.content;

      // Parse structured response
      const parsedResponse = this.parseStructuredResponse(content);

      return {
        success: true,
        reasoning: parsedResponse.reasoning,
        uiCode: parsedResponse.uiCode,
        hasUI: parsedResponse.hasUI,
        rawContent: content
      };

    } catch (error) {
      console.error('AI Service Error:', error);
      
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
   * Categorize error types for better error handling
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

// Export singleton instance
const aiService = new AIService();
export default aiService;