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
- **ChatView.jsx**: Main chat interface component
- **Messages.jsx**: Message display and management
- **DynamicUIRenderer.jsx**: Renders AI-generated UI components
- **ComponentFactory.js**: Factory for creating dynamic components
- **README.md**: Component documentation and usage

### `/core` - Agent System Architecture
Core AI agent system with integrated tool execution:
- **integratedAgentSystem.js**: Main system orchestrator
- **agentController.js**: Agent reasoning and control logic
- **agentState.js**: State management for agent operations
- **enhancedAIService.js**: AI service with tool awareness
- **toolManager.js**: Tool registration and execution
- **toolExecutor.js**: Safe tool execution environment
- **agentMonitoringSystem.js**: Performance and safety monitoring
- **humanInteractionManager.js**: Human-in-the-loop integration
- **errorRecoverySystem.js**: Error handling and recovery

### `/tools` - Executable Tools
- **areaCalculator.js**: Geometric area calculations
- **percentageCalculator.js**: Percentage calculations
- **mockServices.js**: Mock external services for testing

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