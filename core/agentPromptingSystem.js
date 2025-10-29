/**
 * Agent Prompting System - Handles LLM prompts for autonomous decision making
 * Implements ReAct (Reasoning and Acting) prompting patterns
 */

class AgentPromptingSystem {
  constructor(toolRegistry) {
    this.toolRegistry = toolRegistry;
    this.maxReasoningLength = 2000;
    this.maxIterations = 10;
  }

  /**
   * Create initial reasoning prompt for a user query
   * @param {string} userQuery - The user's question or request
   * @param {Object} context - Current agent context
   * @returns {string} - Formatted prompt for LLM
   */
  createInitialReasoningPrompt(userQuery, context = {}) {
    const availableTools = this.toolRegistry.getAvailableTools();
    const toolDescriptions = this.formatToolDescriptions(availableTools);

    return `You are an intelligent agent that can reason through problems and use tools to solve them. You follow a ReAct (Reasoning and Acting) approach where you think step by step, select appropriate tools, and learn from the results.

AVAILABLE TOOLS:
${toolDescriptions}

INSTRUCTIONS:
1. Think through the problem step by step
2. Identify what tools you need to use
3. Plan your approach before taking action
4. Consider dependencies between tools
5. Be specific about what information you need

USER QUERY: ${userQuery}

Please provide your reasoning and planned approach. Structure your response as:

REASONING:
[Your step-by-step thinking about the problem]

PLANNED_APPROACH:
[Your strategy for solving this problem, including which tools you'll use and in what order]

NEXT_ACTION:
[The specific next action you want to take - either use a tool or ask for clarification]

Begin your reasoning now:`;
  }

  /**
   * Create tool selection prompt based on current reasoning
   * @param {string} reasoning - Current reasoning from the agent
   * @param {string} userQuery - Original user query
   * @param {Array} availableTools - List of available tools
   * @param {Array} previousActions - Previous actions taken
   * @returns {string} - Tool selection prompt
   */
  createToolSelectionPrompt(reasoning, userQuery, availableTools, previousActions = []) {
    const toolDescriptions = this.formatToolDescriptions(availableTools);
    const actionHistory = this.formatActionHistory(previousActions);

    return `Based on your reasoning, you need to select the most appropriate tool to use next.

ORIGINAL QUERY: ${userQuery}

YOUR REASONING: ${reasoning}

AVAILABLE TOOLS:
${toolDescriptions}

${actionHistory ? `PREVIOUS ACTIONS:\n${actionHistory}\n` : ''}

Select the tool that best fits your current need. Respond with:

SELECTED_TOOL: [tool_name]
PARAMETERS: [JSON object with required parameters]
REASONING: [Why you selected this tool and these parameters]

If no tool is appropriate or you need more information, respond with:
SELECTED_TOOL: none
REASONING: [Explain what information you need or why no tool is suitable]

Your selection:`;
  }

  /**
   * Create continuation prompt after receiving tool results
   * @param {Object} context - Current agent context with history
   * @param {Object} lastObservation - Result from the last tool execution
   * @returns {string} - Continuation prompt
   */
  createContinuationPrompt(context, lastObservation) {
    const { userQuery, reasoning, actions, observations } = context;
    const actionHistory = this.formatActionHistory(actions);
    const observationHistory = this.formatObservationHistory(observations);

    return `Continue your reasoning based on the new information you received.

ORIGINAL QUERY: ${userQuery}

PREVIOUS REASONING: ${reasoning}

ACTION HISTORY:
${actionHistory}

OBSERVATION HISTORY:
${observationHistory}

LATEST RESULT: ${this.formatObservation(lastObservation)}

Based on this new information, what should you do next? Respond with:

UPDATED_REASONING:
[How does this new information change your understanding? What have you learned?]

NEXT_ACTION:
[What should you do next? Use another tool, combine results, or provide final answer?]

STATUS:
[Are you ready to provide a final answer, or do you need more information?]

Continue your reasoning:`;
  }

  /**
   * Create final answer prompt when agent is ready to conclude
   * @param {Object} context - Complete agent context
   * @returns {string} - Final answer prompt
   */
  createFinalAnswerPrompt(context) {
    const { userQuery, reasoning, actions, observations } = context;
    const actionHistory = this.formatActionHistory(actions);
    const observationHistory = this.formatObservationHistory(observations);

    return `You have gathered enough information to provide a comprehensive answer to the user's query.

ORIGINAL QUERY: ${userQuery}

YOUR REASONING PROCESS: ${reasoning}

ACTIONS TAKEN:
${actionHistory}

RESULTS OBTAINED:
${observationHistory}

Now provide a complete, helpful answer to the user. Structure your response as:

SUMMARY:
[Brief summary of what you discovered and how you solved the problem]

ANSWER:
[Direct answer to the user's question, incorporating all relevant information from your tool usage]

EXPLANATION:
[Explain your reasoning process and how the tools helped you reach this conclusion]

Provide your final response:`;
  }

  /**
   * Create error recovery prompt when something goes wrong
   * @param {Object} context - Current agent context
   * @param {Object} error - Error that occurred
   * @returns {string} - Error recovery prompt
   */
  createErrorRecoveryPrompt(context, error) {
    const { userQuery, reasoning, actions } = context;
    const actionHistory = this.formatActionHistory(actions);

    return `An error occurred during your problem-solving process. You need to adapt your approach.

ORIGINAL QUERY: ${userQuery}

YOUR PREVIOUS REASONING: ${reasoning}

ACTIONS ATTEMPTED:
${actionHistory}

ERROR ENCOUNTERED: ${error.message || 'Unknown error'}
ERROR TYPE: ${error.type || 'unknown'}

How should you adapt your approach? Consider:
1. Can you try a different tool?
2. Do you need different parameters?
3. Should you break down the problem differently?
4. Can you work around this limitation?

Respond with:

ANALYSIS:
[What went wrong and why?]

ADAPTED_STRATEGY:
[How will you modify your approach to work around this error?]

NEXT_ACTION:
[What specific action will you take next?]

Your recovery plan:`;
  }

  /**
   * Create planning prompt for complex multi-step problems
   * @param {string} userQuery - User's complex query
   * @param {Array} availableTools - Available tools
   * @returns {string} - Planning prompt
   */
  createPlanningPrompt(userQuery, availableTools) {
    const toolDescriptions = this.formatToolDescriptions(availableTools);

    return `You need to create a step-by-step plan to solve this complex problem.

USER QUERY: ${userQuery}

AVAILABLE TOOLS:
${toolDescriptions}

Break down this problem into manageable steps. Consider:
1. What information do you need to gather?
2. What calculations or operations are required?
3. What dependencies exist between steps?
4. What tools are needed for each step?

Create a detailed plan:

PROBLEM_ANALYSIS:
[Break down what the user is asking for]

REQUIRED_INFORMATION:
[What data or inputs do you need?]

STEP_BY_STEP_PLAN:
1. [First step - what tool to use and why]
2. [Second step - building on the first]
3. [Continue until complete]

EXPECTED_OUTCOME:
[What should the final result look like?]

Your plan:`;
  }

  /**
   * Format tool descriptions for prompts
   * @param {Array} tools - Array of tool objects
   * @returns {string} - Formatted tool descriptions
   */
  formatToolDescriptions(tools) {
    if (!tools || tools.length === 0) {
      return "No tools available.";
    }

    return tools.map(tool => {
      const params = tool.parameters ? 
        tool.parameters.map(p => `${p.name} (${p.type}${p.required ? ', required' : ', optional'})`).join(', ') :
        'No parameters';
      
      return `- ${tool.name}: ${tool.description}
  Category: ${tool.category}
  Parameters: ${params}`;
    }).join('\n\n');
  }

  /**
   * Format action history for prompts
   * @param {Array} actions - Array of action objects
   * @returns {string} - Formatted action history
   */
  formatActionHistory(actions) {
    if (!actions || actions.length === 0) {
      return "No previous actions.";
    }

    return actions.map((action, index) => {
      const timestamp = action.timestamp ? new Date(action.timestamp).toLocaleTimeString() : 'Unknown time';
      
      if (action.type === 'tool_call') {
        const params = action.parameters ? JSON.stringify(action.parameters, null, 2) : 'No parameters';
        return `${index + 1}. [${timestamp}] Used tool: ${action.toolName}
   Parameters: ${params}
   Reasoning: ${action.reasoning || 'No reasoning provided'}`;
      } else {
        return `${index + 1}. [${timestamp}] ${action.type}: ${action.reasoning || 'No details'}`;
      }
    }).join('\n\n');
  }

  /**
   * Format observation history for prompts
   * @param {Array} observations - Array of observation objects
   * @returns {string} - Formatted observation history
   */
  formatObservationHistory(observations) {
    if (!observations || observations.length === 0) {
      return "No previous observations.";
    }

    return observations.map((obs, index) => {
      const timestamp = obs.timestamp ? new Date(obs.timestamp).toLocaleTimeString() : 'Unknown time';
      return `${index + 1}. [${timestamp}] ${obs.type.toUpperCase()}: ${obs.content}
   ${obs.toolName ? `Tool: ${obs.toolName}` : ''}`;
    }).join('\n\n');
  }

  /**
   * Format a single observation for prompts
   * @param {Object} observation - Observation object
   * @returns {string} - Formatted observation
   */
  formatObservation(observation) {
    if (!observation) return "No observation available.";

    const timestamp = observation.timestamp ? new Date(observation.timestamp).toLocaleTimeString() : 'Unknown time';
    let formatted = `[${timestamp}] ${observation.type.toUpperCase()}: ${observation.content}`;
    
    if (observation.toolName) {
      formatted += `\nTool: ${observation.toolName}`;
    }
    
    if (observation.data && typeof observation.data === 'object') {
      formatted += `\nData: ${JSON.stringify(observation.data, null, 2)}`;
    }
    
    return formatted;
  }

  /**
   * Validate prompt length and truncate if necessary
   * @param {string} prompt - The prompt to validate
   * @returns {string} - Validated and potentially truncated prompt
   */
  validatePromptLength(prompt) {
    const maxLength = 8000; // Conservative limit for most LLMs
    
    if (prompt.length <= maxLength) {
      return prompt;
    }

    console.warn(`Prompt length (${prompt.length}) exceeds maximum (${maxLength}), truncating...`);
    
    // Truncate from the middle, keeping beginning and end
    const keepStart = Math.floor(maxLength * 0.4);
    const keepEnd = Math.floor(maxLength * 0.4);
    const truncationMessage = '\n\n[... content truncated for length ...]\n\n';
    
    return prompt.substring(0, keepStart) + 
           truncationMessage + 
           prompt.substring(prompt.length - keepEnd);
  }

  /**
   * Create context-aware prompt based on current agent state
   * @param {string} promptType - Type of prompt to create
   * @param {Object} context - Current agent context
   * @param {Object} additionalData - Additional data for prompt
   * @returns {string} - Generated prompt
   */
  createContextualPrompt(promptType, context, additionalData = {}) {
    let prompt;

    switch (promptType) {
      case 'initial':
        prompt = this.createInitialReasoningPrompt(context.userQuery, context);
        break;
      case 'tool_selection':
        prompt = this.createToolSelectionPrompt(
          context.reasoning,
          context.userQuery,
          additionalData.availableTools || this.toolRegistry.getAvailableTools(),
          context.actions
        );
        break;
      case 'continuation':
        prompt = this.createContinuationPrompt(context, additionalData.lastObservation);
        break;
      case 'final_answer':
        prompt = this.createFinalAnswerPrompt(context);
        break;
      case 'error_recovery':
        prompt = this.createErrorRecoveryPrompt(context, additionalData.error);
        break;
      case 'planning':
        prompt = this.createPlanningPrompt(
          context.userQuery,
          additionalData.availableTools || this.toolRegistry.getAvailableTools()
        );
        break;
      default:
        throw new Error(`Unknown prompt type: ${promptType}`);
    }

    return this.validatePromptLength(prompt);
  }

  /**
   * Get prompt configuration for different scenarios
   * @returns {Object} - Prompt configuration settings
   */
  getPromptConfiguration() {
    return {
      maxReasoningLength: this.maxReasoningLength,
      maxIterations: this.maxIterations,
      supportedPromptTypes: [
        'initial',
        'tool_selection', 
        'continuation',
        'final_answer',
        'error_recovery',
        'planning'
      ],
      promptLengthLimit: 8000
    };
  }
}

export default AgentPromptingSystem;