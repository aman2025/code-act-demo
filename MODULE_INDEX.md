# Module Index

Quick reference guide for navigating the refactored codebase.

## 🎯 Core System

**Location:** `/core`

| File | Purpose | Key Exports |
|------|---------|-------------|
| `integratedAgentSystem.js` | Main system orchestrator | `IntegratedAgentSystem` |
| `enhancedAIService.js` | AI service integration | `EnhancedAIService` |

**When to use:**
- Starting the agent system
- Coordinating between modules
- AI service integration

---

## 🤖 Agent Module

**Location:** `/agent`

### Decision (`/agent/decision`)
| File | Purpose | Key Exports |
|------|---------|-------------|
| `agentController.js` | Main agent control loop | `AgentController` |
| `stoppingConditions.js` | Stopping condition evaluation | `StoppingConditions` |

### Observation (`/agent/observation`)
| File | Purpose | Key Exports |
|------|---------|-------------|
| `agentState.js` | Agent state management | `AgentState` |
| `observationGenerator.js` | Generate observations | `ObservationGenerator` |
| `agentMonitoringSystem.js` | Performance monitoring | `AgentMonitoringSystem` |

### Interaction (`/agent/interaction`)
| File | Purpose | Key Exports |
|------|---------|-------------|
| `humanInteractionManager.js` | Human-in-the-loop | `HumanInteractionManager` |
| `humanInteractionAPI.js` | Interaction API | `HumanInteractionAPI` |
| `autonomousOperationManager.js` | Autonomous operations | `AutonomousOperationManager` |

### Feedback (`/agent/feedback`)
| File | Purpose | Key Exports |
|------|---------|-------------|
| `errorRecoverySystem.js` | Error handling | `ErrorRecoverySystem` |
| `feedbackIntegrator.js` | Feedback integration | `FeedbackIntegrator` |

**When to use:**
- Implementing agent decision logic
- Managing agent state
- Adding human interaction
- Handling errors and feedback

---

## 🔧 Tools Module

**Location:** `/tools`

### Base (`/tools/base`)
| File | Purpose | Key Exports |
|------|---------|-------------|
| `baseTool.js` | Base class for all tools | `BaseTool` |

### Definitions (`/tools/definitions`)
| File | Purpose | Key Exports |
|------|---------|-------------|
| `areaCalculator.js` | Geometric calculations | `AreaCalculator` |
| `percentageCalculator.js` | Percentage operations | `PercentageCalculator` |
| `mockServices.js` | Mock external services | `WeatherService`, `FlightService` |

### Registry (`/tools/registry`)
| File | Purpose | Key Exports |
|------|---------|-------------|
| `toolRegistry.js` | Central tool registry | `ToolRegistry` |

### Manager (`/tools/manager`)
| File | Purpose | Key Exports |
|------|---------|-------------|
| `toolManager.js` | Tool orchestration | `ToolManager` |
| `toolExecutor.js` | Safe tool execution | `ToolExecutor` |

**When to use:**
- Creating new tools (extend `BaseTool`)
- Registering tools
- Executing tools
- Managing tool lifecycle

---

## 💬 Prompt Module

**Location:** `/prompt`

### Builder (`/prompt/builder`)
| File | Purpose | Key Exports |
|------|---------|-------------|
| `agentPromptingSystem.js` | Build prompts for LLM | `AgentPromptingSystem` |

### Parser (`/prompt/parser`)
| File | Purpose | Key Exports |
|------|---------|-------------|
| `agentResponseParser.js` | Parse LLM responses | `AgentResponseParser` |

### Templates (`/prompt/templates`)
| Status | Purpose |
|--------|---------|
| 📁 Empty | Future prompt templates |

**When to use:**
- Modifying prompt structure
- Parsing LLM responses
- Adding new prompt templates

---

## 🔒 Sandbox Module

**Location:** `/sandbox`

| File | Purpose | Key Exports |
|------|---------|-------------|
| `sandboxExecutor.js` | Secure code execution | `SandboxExecutor` |

**When to use:**
- Executing AI-generated code safely
- Generating dynamic UI components
- Security validation

---

## 🎨 Components Module

**Location:** `/components`

### Factory (`/components/factory`)
| File | Purpose | Key Exports |
|------|---------|-------------|
| `ComponentFactory.js` | Component generation | `ComponentFactory` |

### UI Components
| File | Purpose | Key Exports |
|------|---------|-------------|
| `ChatView.jsx` | Main chat interface | `ChatView` |
| `Messages.jsx` | Message display | `Messages` |
| `DynamicUIRenderer.jsx` | Render dynamic UI | `DynamicUIRenderer` |

**When to use:**
- Building UI components
- Rendering dynamic components
- Managing chat interface

---

## 📡 API Routes

**Location:** `/app/api`

| Route | Purpose | Dependencies |
|-------|---------|--------------|
| `/api/chat` | Main chat endpoint | Core, Sandbox, Tools |
| `/api/calculate` | Calculation endpoint | Core |

---

## 🗂️ Common Tasks

### Adding a New Tool

1. Create tool class in `/tools/definitions/yourTool.js`
2. Extend `BaseTool` from `/tools/base/baseTool.js`
3. Implement `execute()` method
4. Register in `/tools/manager/toolManager.js`

```javascript
import BaseTool from '../base/baseTool.js';

class YourTool extends BaseTool {
  constructor() {
    super('yourTool', 'Description', 'category');
    this.setupParameters();
  }
  
  async execute(params) {
    // Implementation
  }
}
```

### Modifying Agent Behavior

1. Update decision logic in `/agent/decision/agentController.js`
2. Modify stopping conditions in `/agent/decision/stoppingConditions.js`
3. Adjust state management in `/agent/observation/agentState.js`

### Changing Prompts

1. Modify prompt generation in `/prompt/builder/agentPromptingSystem.js`
2. Update response parsing in `/prompt/parser/agentResponseParser.js`

### Adding UI Components

1. Create component in `/components/yourComponent.jsx`
2. Update factory if needed in `/components/factory/ComponentFactory.js`
3. Import in parent components

---

## 🔍 Finding Code

| Looking for... | Check... |
|----------------|----------|
| Agent decision logic | `/agent/decision/` |
| Tool implementations | `/tools/definitions/` |
| Tool execution | `/tools/manager/` |
| Prompt generation | `/prompt/builder/` |
| Response parsing | `/prompt/parser/` |
| Secure execution | `/sandbox/` |
| System orchestration | `/core/` |
| UI components | `/components/` |
| State management | `/agent/observation/` |
| Error handling | `/agent/feedback/` |
| Human interaction | `/agent/interaction/` |

---

## 📚 Documentation

- **Architecture Overview:** `docs/refactored-architecture.md`
- **Refactoring Summary:** `REFACTORING_SUMMARY.md`
- **Project Structure:** `.kiro/steering/structure.md`
- **Component Docs:** `components/README.md`
- **Autonomous Operations:** `docs/autonomous-operation-guide.md`

---

## 🚀 Quick Start

```javascript
// Initialize the system
import IntegratedAgentSystem from './core/integratedAgentSystem.js';

const system = new IntegratedAgentSystem();
await system.initialize();

// Execute a query
const result = await system.processQuery('Your query here');
```

---

## 💡 Tips

- Each module is self-contained and can be understood independently
- Start with `/core` to understand system orchestration
- Check `/tools/base/baseTool.js` before creating new tools
- Use `/agent/decision/agentController.js` as the main agent entry point
- All security-critical code is in `/sandbox`
