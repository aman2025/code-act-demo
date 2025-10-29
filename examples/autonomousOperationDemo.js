/**
 * Autonomous Operation Demo
 * Demonstrates how the agent operates autonomously with human checkpoints
 */

import AgentController from '../core/agentController.js';
import HumanInteractionAPI from '../core/humanInteractionAPI.js';

class AutonomousOperationDemo {
  constructor() {
    this.agentController = new AgentController();
    this.humanAPI = new HumanInteractionAPI(this.agentController);
  }

  /**
   * Demo autonomous operation with different modes
   */
  async runDemo() {
    console.log('=== Autonomous Operation Demo ===\n');

    // Demo 1: Supervised mode (conservative, frequent checkpoints)
    await this.demoSupervisedMode();

    // Demo 2: Autonomous mode (agent operates independently)
    await this.demoAutonomousMode();

    // Demo 3: Manual mode (human input required for each step)
    await this.demoManualMode();

    // Demo 4: Blocker detection and resolution
    await this.demoBlockerHandling();

    console.log('\n=== Demo Complete ===');
  }

  /**
   * Demo supervised mode operation
   */
  async demoSupervisedMode() {
    console.log('--- Demo 1: Supervised Mode ---');
    
    // Configure for supervised mode
    this.agentController.setAutonomousMode('supervised');
    
    const query = "Calculate the area of a triangle with base 10 and height 8, then find what percentage this area is of a circle with radius 5";
    
    console.log(`Query: ${query}`);
    console.log('Mode: Supervised (conservative, more checkpoints)\n');

    try {
      // Start processing
      const result = await this.agentController.processQuery(query);
      
      // Check if human input is needed
      const status = this.humanAPI.getAgentStatus();
      
      if (status.humanInteraction.awaitingInput) {
        console.log('Agent is awaiting human input...');
        
        // Get pending checkpoints
        const checkpoints = this.humanAPI.getPendingCheckpoints();
        console.log(`Pending checkpoints: ${checkpoints.length}`);
        
        for (const checkpoint of checkpoints) {
          console.log(`- Checkpoint: ${checkpoint.reason} (Priority: ${checkpoint.priority})`);
          console.log(`  Recommendations: ${checkpoint.recommendedActions.join(', ')}`);
          
          // Simulate human input
          const humanInput = this.simulateHumanInput(checkpoint);
          console.log(`  Human input: ${humanInput.decision} - ${humanInput.guidance?.direction || 'continue'}`);
          
          // Provide input and resume
          const resumeResult = await this.humanAPI.provideHumanInput(checkpoint.id, humanInput);
          console.log(`  Resume result: ${resumeResult.message}\n`);
        }
      }
      
      console.log(`Final result: ${result.finalAnswer}`);
      console.log(`Confidence: ${(result.finalConfidence * 100).toFixed(1)}%`);
      console.log(`Iterations: ${result.iterations}\n`);
      
    } catch (error) {
      console.error('Error in supervised mode demo:', error.message);
    }
  }

  /**
   * Demo autonomous mode operation
   */
  async demoAutonomousMode() {
    console.log('--- Demo 2: Autonomous Mode ---');
    
    // Configure for autonomous mode
    this.agentController.setAutonomousMode('autonomous');
    
    const query = "What is 15% of 240, and then calculate the area of a rectangle with that result as width and 12 as height?";
    
    console.log(`Query: ${query}`);
    console.log('Mode: Autonomous (independent operation)\n');

    try {
      const result = await this.agentController.processQuery(query);
      
      console.log(`Final result: ${result.finalAnswer}`);
      console.log(`Confidence: ${(result.finalConfidence * 100).toFixed(1)}%`);
      console.log(`Iterations: ${result.iterations}`);
      
      // Show autonomous decisions made
      const autonomousStatus = this.humanAPI.getAgentStatus().autonomous;
      console.log(`Autonomous decisions: ${autonomousStatus.decisionHistory.length}`);
      
      const recentDecisions = autonomousStatus.decisionHistory.slice(-3);
      recentDecisions.forEach((decision, index) => {
        console.log(`  Decision ${index + 1}: ${decision.decision ? 'Continue' : 'Request human input'} (${decision.reason})`);
      });
      
      console.log();
      
    } catch (error) {
      console.error('Error in autonomous mode demo:', error.message);
    }
  }

  /**
   * Demo manual mode operation
   */
  async demoManualMode() {
    console.log('--- Demo 3: Manual Mode ---');
    
    // Configure for manual mode
    this.agentController.setAutonomousMode('manual');
    
    const query = "Calculate the area of a circle with radius 3";
    
    console.log(`Query: ${query}`);
    console.log('Mode: Manual (human input required for each step)\n');

    try {
      // Start processing - should immediately request human input
      const result = await this.agentController.processQuery(query);
      
      // In manual mode, agent should always request human input
      const status = this.humanAPI.getAgentStatus();
      
      if (status.humanInteraction.awaitingInput) {
        console.log('Agent immediately requested human input (manual mode)');
        
        const checkpoints = this.humanAPI.getPendingCheckpoints();
        console.log(`Checkpoints created: ${checkpoints.length}`);
        
        // Simulate human approval for each step
        for (const checkpoint of checkpoints) {
          console.log(`- Manual checkpoint: ${checkpoint.reason}`);
          
          const humanInput = {
            decision: 'continue',
            guidance: {
              direction: 'proceed with calculation',
              confidence: 0.8
            }
          };
          
          console.log('  Human approves: Continue');
          await this.humanAPI.provideHumanInput(checkpoint.id, humanInput);
        }
      }
      
      console.log(`Final result: ${result.finalAnswer}`);
      console.log(`Confidence: ${(result.finalConfidence * 100).toFixed(1)}%\n`);
      
    } catch (error) {
      console.error('Error in manual mode demo:', error.message);
    }
  }

  /**
   * Demo blocker detection and resolution
   */
  async demoBlockerHandling() {
    console.log('--- Demo 4: Blocker Detection and Resolution ---');
    
    // Configure for supervised mode to catch blockers
    this.agentController.setAutonomousMode('supervised');
    
    // Use a complex/ambiguous query to trigger blockers
    const query = "Calculate something complex with multiple steps that might be unclear or ambiguous";
    
    console.log(`Query: ${query}`);
    console.log('Purpose: Demonstrate blocker detection\n');

    try {
      const result = await this.agentController.processQuery(query);
      
      // Check for blockers
      const blockers = this.humanAPI.getActiveBlockers();
      
      if (blockers.length > 0) {
        console.log(`Blockers detected: ${blockers.length}`);
        
        for (const blocker of blockers) {
          console.log(`- Blocker: ${blocker.type} (${blocker.severity})`);
          console.log(`  Description: ${blocker.description}`);
          console.log(`  Recommendation: ${blocker.recommendation}`);
          
          // Simulate human guidance for blocker
          const guidance = this.simulateBlockerGuidance(blocker);
          console.log(`  Human guidance: ${guidance.approach}`);
          
          const guidanceResult = await this.humanAPI.provideBlockerGuidance(blocker.id, guidance);
          console.log(`  Guidance result: ${guidanceResult.message}\n`);
        }
      } else {
        console.log('No blockers detected in this demo run');
      }
      
      console.log(`Final result: ${result.finalAnswer}`);
      console.log(`Confidence: ${(result.finalConfidence * 100).toFixed(1)}%\n`);
      
    } catch (error) {
      console.error('Error in blocker handling demo:', error.message);
    }
  }

  /**
   * Simulate human input for checkpoint resolution
   * @param {Object} checkpoint - Checkpoint requiring input
   * @returns {Object} - Simulated human input
   */
  simulateHumanInput(checkpoint) {
    const inputTypes = {
      low_confidence: {
        decision: 'continue',
        guidance: {
          direction: 'proceed with current approach',
          confidence: 0.7,
          reasoning: 'The approach looks reasonable, continue with calculation'
        }
      },
      complexity_overload: {
        decision: 'modify',
        guidance: {
          strategy: 'focused',
          direction: 'break down into smaller steps',
          reasoning: 'Let\'s tackle this step by step'
        }
      },
      ambiguous_requirements: {
        decision: 'continue',
        clarification: 'Please proceed with standard mathematical calculations',
        guidance: {
          direction: 'use standard formulas and methods'
        }
      },
      autonomous_decision: {
        decision: 'continue',
        guidance: {
          direction: 'agent decision looks good, proceed',
          confidence: 0.8
        }
      }
    };

    return inputTypes[checkpoint.reason] || {
      decision: 'continue',
      guidance: {
        direction: 'proceed as planned',
        confidence: 0.7
      }
    };
  }

  /**
   * Simulate human guidance for blocker resolution
   * @param {Object} blocker - Blocker requiring guidance
   * @returns {Object} - Simulated guidance
   */
  simulateBlockerGuidance(blocker) {
    const guidanceTypes = {
      repeated_failures: {
        approach: 'alternative strategy',
        strategy: 'conservative',
        alternatives: ['try different calculation method', 'break into smaller steps']
      },
      low_confidence_stagnation: {
        approach: 'provide examples and clarification',
        strategy: 'focused',
        parameters: { confidence_boost: 0.3 }
      },
      complexity_overload: {
        approach: 'simplify and break down',
        strategy: 'step_by_step',
        constraints: ['one calculation at a time', 'verify each step']
      },
      ambiguous_requirements: {
        approach: 'clarify and specify',
        strategy: 'default',
        parameters: { clarification: 'use standard mathematical definitions' }
      },
      safety_constraints: {
        approach: 'review and validate',
        strategy: 'conservative',
        constraints: ['safety first', 'validate all operations']
      }
    };

    return guidanceTypes[blocker.type] || {
      approach: 'general guidance',
      strategy: 'default',
      priority: 'medium'
    };
  }

  /**
   * Show current agent status and human interaction opportunities
   */
  showAgentStatus() {
    const status = this.humanAPI.getAgentStatus();
    
    console.log('=== Current Agent Status ===');
    console.log(`Operation Mode: ${status.autonomous.operationMode}`);
    console.log(`Running: ${status.agent.isRunning}`);
    console.log(`Awaiting Human Input: ${status.humanInteraction.awaitingInput}`);
    console.log(`Current Iteration: ${status.agent.currentIteration}/${status.agent.maxIterations}`);
    console.log(`Confidence: ${(status.agent.confidence * 100).toFixed(1)}%`);
    
    if (status.needsAttention.urgent.length > 0) {
      console.log(`\nURGENT ATTENTION NEEDED:`);
      status.needsAttention.urgent.forEach(need => console.log(`  - ${need}`));
    }
    
    if (status.needsAttention.important.length > 0) {
      console.log(`\nIMPORTANT:`);
      status.needsAttention.important.forEach(need => console.log(`  - ${need}`));
    }
    
    console.log();
  }

  /**
   * Show reasoning explanation for human understanding
   */
  showReasoningExplanation() {
    const reasoning = this.humanAPI.getReasoningExplanation();
    
    if (!reasoning.hasReasoning) {
      console.log('No reasoning available yet');
      return;
    }
    
    console.log('=== Agent Reasoning Explanation ===');
    console.log(`Total Steps: ${reasoning.totalSteps}`);
    console.log(`Current Confidence: ${(reasoning.confidence * 100).toFixed(1)}%`);
    console.log(`Strategy: ${reasoning.strategy}`);
    console.log(`Progress: ${reasoning.progressSummary.progressPercentage.toFixed(1)}%`);
    console.log(`Confidence Trend: ${reasoning.progressSummary.confidenceTrend}`);
    
    console.log('\nRecent Reasoning Steps:');
    reasoning.reasoningSteps.slice(-3).forEach(step => {
      console.log(`  Step ${step.step}: ${step.summary}`);
      console.log(`    Confidence: ${(step.confidence * 100).toFixed(1)}%`);
    });
    
    console.log();
  }
}

// Export for use in other modules
export default AutonomousOperationDemo;

// If running directly, execute demo
if (import.meta.url === `file://${process.argv[1]}`) {
  const demo = new AutonomousOperationDemo();
  demo.runDemo().catch(console.error);
}