# Mistral AI Integration with Tool Calling

This document explains how the Enhanced AI Service integrates with Mistral AI's native tool calling capabilities.

## Overview

The `EnhancedAIService` now uses the official `@mistralai/mistralai` package to provide:

- **Native Tool Calling**: Mistral AI automatically decides when and how to use tools
- **Multi-turn Conversations**: Handle complex queries requiring multiple tool calls
- **Structured Responses**: Parse tool calls and responses automatically
- **Error Recovery**: Robust error handling with retry logic
- **Tool Validation**: Automatic parameter validation and tool existence checking

## Key Features

### 1. Native Tool Calling Support

```javascript
// Tools are automatically converted to Mistral's format
const tools = toolRegistry.getAvailableTools();
const mistralTools = aiService.convertToolsToMistralFormat(tools);

// API call with tool support
const response = await aiService.callMistralWithRetry(messages, {
  enableTools: true,
  tools: availableTools,
  temperature: 0.7
});
```

### 2. Conversation Management

```javascript
// Execute a complete tool conversation
const result = await aiService.executeToolConversation(
  "What's the area of a circle with radius 10?",
  { maxTurns: 5 }
);
```

### 3. Tool Parameter Schema

Tools are automatically converted to JSON Schema format:

```javascript
// Tool parameter definition
{
  name: 'radius',
  type: 'number',
  required: true,
  description: 'Radius of the circle'
}

// Converted to JSON Schema
{
  type: 'object',
  properties: {
    radius: {
      type: 'number',
      description: 'Radius of the circle'
    }
  },
  required: ['radius']
}
```

## API Methods

### Core Methods

#### `callMistralWithRetry(messages, options)`
- **Purpose**: Make API calls to Mistral with retry logic and tool support
- **Parameters**:
  - `messages`: String or array of conversation messages
  - `options`: Configuration object
- **Returns**: API response with tool calls if any

#### `generateToolSelection(reasoning, userQuery, context)`
- **Purpose**: Generate tool selection using native tool calling
- **Features**: Automatic tool validation and parameter parsing
- **Returns**: Tool selection result with execution details

#### `executeToolConversation(userQuery, options)`
- **Purpose**: Execute a complete multi-turn conversation with tools
- **Features**: Automatic tool execution and response handling
- **Returns**: Complete conversation history and final result

### Utility Methods

#### `convertToolsToMistralFormat(tools)`
- **Purpose**: Convert internal tool format to Mistral API format
- **Returns**: Array of tools in Mistral's expected format

#### `convertParametersToJsonSchema(parameters)`
- **Purpose**: Convert tool parameters to JSON Schema
- **Returns**: JSON Schema object for tool parameters

#### `createToolMessage(toolCallId, toolResult)`
- **Purpose**: Create tool response message for conversation
- **Returns**: Formatted tool message

## Configuration

### Environment Variables

```bash
MISTRAL_API_KEY=your_mistral_api_key_here
```

### Service Configuration

```javascript
const aiService = new EnhancedAIService(toolRegistry);

// Update configuration
aiService.updateConfiguration({
  maxRetries: 3,
  retryDelay: 1000,
  temperatureSettings: {
    reasoning: 0.7,
    toolSelection: 0.3,
    finalAnswer: 0.5
  }
});
```

## Usage Examples

### Basic Tool Calling

```javascript
import EnhancedAIService from './core/enhancedAIService.js';
import ToolManager from './core/toolManager.js';

// Initialize
const toolManager = new ToolManager();
await toolManager.initialize();

const aiService = new EnhancedAIService(toolManager.toolRegistry);

// Test connection
const connectionTest = await aiService.testConnection();
console.log('Connected:', connectionTest.success);

// Execute tool conversation
const result = await aiService.executeToolConversation(
  "Calculate the area of a rectangle with width 5 and height 3"
);

console.log('Result:', result.finalResponse);
console.log('Tools used:', result.conversationHistory
  .filter(entry => entry.role === 'tool')
  .map(entry => entry.toolName)
);
```

### Integration with Chat API

```javascript
// In your API route
export async function POST(request) {
  const { message } = await request.json();
  
  const toolManager = new ToolManager();
  await toolManager.initialize();
  
  const aiService = new EnhancedAIService(toolManager.toolRegistry);
  
  const result = await aiService.executeToolConversation(message, {
    maxTurns: 5,
    temperature: 0.7
  });
  
  return Response.json({
    reasoning: result.finalResponse,
    toolsUsed: extractToolsUsed(result.conversationHistory),
    success: result.success
  });
}
```

### Custom Tool Integration

```javascript
// Add custom tool
class CustomTool extends BaseTool {
  constructor() {
    super('custom-tool', 'Custom tool description', 'custom');
    this.addParameter('param1', 'string', true, 'Parameter description');
  }
  
  async execute(params) {
    // Tool implementation
    return this.createSuccessResult(result, 'Success message');
  }
}

// Register tool
const customTool = new CustomTool();
toolManager.registerCustomTool(customTool);

// Tool is now available for Mistral to use
```

## Error Handling

The service includes comprehensive error handling:

```javascript
// Connection errors
const connectionTest = await aiService.testConnection();
if (!connectionTest.success) {
  console.error('Connection failed:', connectionTest.message);
}

// Tool execution errors
const result = await aiService.executeToolConversation(query);
if (!result.success) {
  console.error('Conversation failed:', result.error);
}

// Individual tool call errors are handled automatically
// and included in the conversation history
```

## Monitoring and Debugging

### Service Information

```javascript
const serviceInfo = aiService.getServiceInfo();
console.log('Service status:', {
  mistralClientInitialized: serviceInfo.mistralClientInitialized,
  toolCallingEnabled: serviceInfo.toolCallingEnabled,
  availableTools: serviceInfo.availableTools
});
```

### Available Models

```javascript
const models = await aiService.getAvailableModels();
console.log('Available models:', models.models);
```

## Best Practices

### 1. Tool Design
- Keep tool parameters simple and well-documented
- Use descriptive parameter names and descriptions
- Validate parameters in your tool implementation
- Return structured, consistent results

### 2. Conversation Management
- Set reasonable `maxTurns` limits (3-5 for most cases)
- Use appropriate temperature settings for different tasks
- Handle tool execution timeouts gracefully

### 3. Error Recovery
- Always check connection before processing
- Implement fallback strategies for tool failures
- Log errors for debugging and monitoring

### 4. Performance
- Cache tool registry initialization
- Use connection pooling for high-traffic scenarios
- Monitor API usage and costs

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check `MISTRAL_API_KEY` environment variable
   - Verify API key permissions
   - Check network connectivity

2. **Tool Not Found**
   - Ensure tool is registered in tool registry
   - Check tool name spelling
   - Verify tool validation passes

3. **Parameter Validation Errors**
   - Check parameter types match schema
   - Ensure required parameters are provided
   - Validate parameter values in tool implementation

4. **Conversation Timeouts**
   - Reduce `maxTurns` setting
   - Optimize tool execution time
   - Implement proper timeout handling

### Debug Mode

```javascript
// Enable debug logging
process.env.NODE_ENV = 'development';

// Get detailed service information
const serviceInfo = aiService.getServiceInfo();
console.log('Debug info:', JSON.stringify(serviceInfo, null, 2));
```

## Migration from Previous Version

If you're upgrading from the previous fetch-based implementation:

1. **Install the package**: `npm install @mistralai/mistralai`
2. **Update imports**: The service now uses the official client
3. **Tool format**: Tools are automatically converted to Mistral format
4. **Response handling**: Tool calls are now parsed automatically
5. **Error handling**: Enhanced error recovery and retry logic

The API remains backward compatible for basic usage, but new features require the updated methods.