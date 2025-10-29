# Autonomous Operation Guide

This guide explains how to use the autonomous operation features of the AI Agent Enhancement system.

## Overview

The autonomous operation system allows the agent to operate independently while providing human checkpoints for guidance and feedback when needed. The system includes three operation modes and sophisticated blocker detection.

## Operation Modes

### 1. Autonomous Mode
- Agent operates independently with minimal human intervention
- Only requests human input for critical issues or safety concerns
- Best for routine tasks and when high confidence in agent capabilities

```javascript
agentController.setAutonomousMode('autonomous');
```

### 2. Supervised Mode (Default)
- Agent operates with regular checkpoints for human review
- More conservative approach with frequent human interaction opportunities
- Best for complex tasks or when learning agent behavior

```javascript
agentController.setAutonomousMode('supervised');
```

### 3. Manual Mode
- Human input required for each step
- Maximum control and oversight
- Best for critical tasks or when full human control is needed

```javascript
agentController.setAutonomousMode('manual');
```

## Key Components

### AutonomousOperationManager
Handles decision-making logic for when to continue vs when to seek human input.

**Key Features:**
- Evaluates confidence, complexity, error rate, progress, uncertainty, safety, and resources
- Makes autonomous decisions based on configurable thresholds
- Detects task completion for autonomous termination
- Records decision history for learning

### HumanInteractionManager
Manages checkpoints, blocker detection, and communication with humans.

**Key Features:**
- Creates checkpoints when human input is needed
- Detects blockers that require human intervention
- Provides clear communication of agent reasoning and progress
- Manages checkpoint resolution and blocker guidance

### HumanInteractionAPI
Provides interface for humans to interact with the agent system.

**Key Features:**
- Get agent status and pending checkpoints
- Provide human input to resolve checkpoints
- Get progress communication and reasoning explanations
- Configure operation parameters

## Usage Examples

### Basic Autonomous Operation

```javascript
import AgentController from './core/agentController.js';
import HumanInteractionAPI from './core/humanInteractionAPI.js';

const agent = new AgentController();
const humanAPI = new HumanInteractionAPI(agent);

// Set autonomous mode
agent.setAutonomousMode('autonomous');

// Process query
const result = await agent.processQuery("Calculate the area of a triangle with base 10 and height 8");

console.log(result.finalAnswer);
```

### Handling Human Checkpoints

```javascript
// Check if human input is needed
const status = humanAPI.getAgentStatus();

if (status.humanInteraction.awaitingInput) {
    // Get pending checkpoints
    const checkpoints = humanAPI.getPendingCheckpoints();
    
    for (const checkpoint of checkpoints) {
        console.log(`Checkpoint: ${checkpoint.reason}`);
        console.log(`Priority: ${checkpoint.priority}`);
        console.log(`Recommendations: ${checkpoint.recommendedActions.join(', ')}`);
        
        // Provide human input
        const humanInput = {
            decision: 'continue',
            guidance: {
                direction: 'proceed with current approach',
                confidence: 0.8
            }
        };
        
        // Resume agent operation
        const resumeResult = await humanAPI.provideHumanInput(checkpoint.id, humanInput);
        console.log(resumeResult.message);
    }
}
```

### Handling Blockers

```javascript
// Check for active blockers
const blockers = humanAPI.getActiveBlockers();

for (const blocker of blockers) {
    console.log(`Blocker: ${blocker.type} (${blocker.severity})`);
    console.log(`Description: ${blocker.description}`);
    
    // Provide guidance for blocker resolution
    const guidance = {
        approach: 'alternative strategy',
        strategy: 'conservative',
        alternatives: ['try different method', 'break into smaller steps']
    };
    
    const guidanceResult = await humanAPI.provideBlockerGuidance(blocker.id, guidance);
    console.log(guidanceResult.message);
}
```

### Configuration

```javascript
// Configure autonomous operation parameters
agent.configureAutonomousOperation({
    operationMode: 'supervised',
    thresholds: {
        confidenceThreshold: 0.7,
        errorThreshold: 2,
        complexityThreshold: 0.8
    },
    humanInteraction: {
        interactionMode: 'checkpoint',
        blockerDetectionEnabled: true,
        progressCommunicationEnabled: true
    }
});
```

## Checkpoint Types

The system creates checkpoints for various reasons:

- **low_confidence**: Agent confidence is below threshold
- **repeated_failures**: Multiple similar errors detected
- **complexity_overload**: Task complexity exceeds agent capabilities
- **ambiguous_requirements**: Requirements need clarification
- **safety_concern**: Potential safety issues detected
- **resource_limit**: Approaching resource constraints
- **autonomous_decision**: General autonomous operation decision point

## Blocker Types

The system detects several types of blockers:

- **repeated_failures**: Pattern of similar failures
- **low_confidence_stagnation**: Low confidence with no progress
- **resource_exhaustion**: Resource limits being approached
- **complexity_overload**: Task too complex for agent
- **ambiguous_requirements**: Unclear or ambiguous requirements
- **safety_constraints**: Safety concerns detected

## Human Input Types

When providing human input, you can include:

```javascript
const humanInput = {
    decision: 'continue', // 'continue', 'stop', 'modify'
    guidance: {
        strategy: 'focused',
        confidence: 0.8,
        maxIterations: 15,
        reasoning: 'Additional context or direction',
        direction: 'Specific guidance for next steps'
    },
    clarification: 'Clarification of requirements',
    feedback: 'General feedback on agent performance'
};
```

## Monitoring and Status

### Get Agent Status
```javascript
const status = humanAPI.getAgentStatus();
console.log(`Mode: ${status.autonomous.operationMode}`);
console.log(`Awaiting Input: ${status.humanInteraction.awaitingInput}`);
console.log(`Confidence: ${status.agent.confidence}`);
```

### Get Progress Communication
```javascript
const progress = humanAPI.getProgressCommunication();
console.log(progress.summary);
console.log(`Next Steps: ${progress.nextSteps.join(', ')}`);
```

### Get Reasoning Explanation
```javascript
const reasoning = humanAPI.getReasoningExplanation();
console.log(`Total Steps: ${reasoning.totalSteps}`);
console.log(`Confidence Trend: ${reasoning.progressSummary.confidenceTrend}`);
```

## Best Practices

1. **Start with Supervised Mode**: Use supervised mode initially to understand agent behavior
2. **Monitor Checkpoints**: Regularly check for pending checkpoints and provide timely input
3. **Address Blockers Quickly**: High-severity blockers should be addressed immediately
4. **Provide Clear Guidance**: When giving human input, be specific and actionable
5. **Configure Thresholds**: Adjust thresholds based on your use case and risk tolerance
6. **Review Decision History**: Analyze autonomous decisions to improve configuration

## Demo

Run the autonomous operation demo to see the system in action:

```bash
node examples/autonomousOperationDemo.js
```

This demo shows all three operation modes and demonstrates checkpoint and blocker handling.