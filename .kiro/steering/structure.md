# Project Structure

## Root Level
- **package.json**: Dependencies and scripts
- **next.config.js**: Next.js configuration with VM2 webpack externals
- **tailwind.config.js**: Tailwind CSS configuration
- **tsconfig.json**: TypeScript configuration
- **.env**: Environment variables (API keys, etc.)

## Application Structure

### `/app` - Next.js App Router
- **layout.jsx**: Root layout with global styles and metadata
- **page.jsx**: Main chat interface page
- **globals.css**: Global CSS styles and Tailwind imports
- **api/**: API route handlers
  - **chat/route.js**: Main chat processing endpoint
  - **calculate/route.js**: Calculation processing endpoint

### `/components` - React Components
UI components for the chat interface:
- **ChatView.jsx**: Main chat interface component
- **Messages.jsx**: Message display and management
- **DynamicUIRenderer.jsx**: Renders AI-generated UI components
- **factory/**: Component generation
  - **ComponentFactory.js**: Factory for creating dynamic components
- **README.md**: Component documentation and usage

### `/core` - Core System Integration
Core system orchestration and AI service integration:
- **integratedAgentSystem.js**: Main system orchestrator
- **enhancedAIService.js**: AI service with tool awareness

### `/agent` - Agent System Architecture
Modular agent system with decision-making, observation, interaction, and feedback:
- **decision/**: Agent reasoning and control logic
  - **agentController.js**: Main agent control loop
  - **stoppingConditions.js**: Stopping condition evaluation
- **observation/**: State management and monitoring
  - **agentState.js**: Agent state management
  - **observationGenerator.js**: Observation generation
  - **agentMonitoringSystem.js**: Performance and safety monitoring
- **interaction/**: Human and system interaction
  - **humanInteractionManager.js**: Human-in-the-loop integration
  - **humanInteractionAPI.js**: Human interaction API
  - **autonomousOperationManager.js**: Autonomous operation management
- **feedback/**: Learning and error recovery
  - **errorRecoverySystem.js**: Error handling and recovery
  - **feedbackIntegrator.js**: Feedback integration

### `/tools` - Tool System
Modular tool system with definitions, registry, and management:
- **base/**: Base tool class
  - **baseTool.js**: Foundation for all tools
- **definitions/**: Tool implementations
  - **areaCalculator.js**: Geometric area calculations
  - **percentageCalculator.js**: Percentage calculations
  - **mockServices.js**: Mock external services
- **registry/**: Tool registration and discovery
  - **toolRegistry.js**: Central tool registry
- **manager/**: Tool execution and lifecycle
  - **toolManager.js**: Tool management orchestration
  - **toolExecutor.js**: Safe tool execution

### `/prompt` - Prompt System
Prompt engineering and response parsing:
- **builder/**: Prompt construction
  - **agentPromptingSystem.js**: Agent prompt generation
- **parser/**: Response parsing
  - **agentResponseParser.js**: Agent response parsing
- **templates/**: Prompt templates (future)

### `/sandbox` - Secure Execution
Secure code execution environment:
- **sandboxExecutor.js**: VM2 sandbox for safe code execution

### `/store` - State Management
- **chatStore.js**: Zustand store for chat state and UI components

### `/utils` - Utilities
- **cn.js**: Tailwind class name utility function

### `/docs` - Documentation
- **autonomous-operation-guide.md**: Guide for autonomous agent operations

### `/examples` - Usage Examples
- **autonomousOperationDemo.js**: Demonstration of agent system usage

## File Naming Conventions
- **React Components**: PascalCase with .jsx extension
- **JavaScript Modules**: camelCase with .js extension
- **API Routes**: route.js in named folders
- **Configuration**: kebab-case or standard names (next.config.js)

## Import Patterns
- Use ES6 imports/exports throughout
- Relative imports for local modules
- Absolute imports for external packages
- Component imports use .jsx extension explicitly

## Architecture Layers
1. **Presentation**: React components and UI rendering
2. **API**: Next.js API routes for backend processing
3. **Core**: Agent system and AI processing logic
4. **Tools**: Executable utilities and calculators
5. **State**: Global and local state management
6. **Utils**: Shared utility functions