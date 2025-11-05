#!/bin/bash

echo "🔍 Verifying Refactored Project Structure..."
echo ""

# Check if all required directories exist
echo "📁 Checking directories..."
dirs=(
  "agent/decision"
  "agent/observation"
  "agent/interaction"
  "agent/feedback"
  "tools/base"
  "tools/definitions"
  "tools/registry"
  "tools/manager"
  "prompt/builder"
  "prompt/parser"
  "prompt/templates"
  "sandbox"
  "core"
  "components/factory"
)

all_dirs_exist=true
for dir in "${dirs[@]}"; do
  if [ -d "$dir" ]; then
    echo "  ✅ $dir"
  else
    echo "  ❌ $dir (missing)"
    all_dirs_exist=false
  fi
done

echo ""
echo "📄 Checking key files..."

files=(
  "core/integratedAgentSystem.js"
  "core/enhancedAIService.js"
  "agent/decision/agentController.js"
  "agent/decision/stoppingConditions.js"
  "agent/observation/agentState.js"
  "agent/observation/observationGenerator.js"
  "agent/observation/agentMonitoringSystem.js"
  "agent/interaction/humanInteractionManager.js"
  "agent/interaction/humanInteractionAPI.js"
  "agent/interaction/autonomousOperationManager.js"
  "agent/feedback/errorRecoverySystem.js"
  "agent/feedback/feedbackIntegrator.js"
  "tools/base/baseTool.js"
  "tools/definitions/areaCalculator.js"
  "tools/definitions/percentageCalculator.js"
  "tools/definitions/mockServices.js"
  "tools/registry/toolRegistry.js"
  "tools/manager/toolManager.js"
  "tools/manager/toolExecutor.js"
  "prompt/builder/agentPromptingSystem.js"
  "prompt/parser/agentResponseParser.js"
  "sandbox/sandboxExecutor.js"
  "components/factory/ComponentFactory.js"
)

all_files_exist=true
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file (missing)"
    all_files_exist=false
  fi
done

echo ""
echo "🗑️  Checking old files are removed..."

old_files=(
  "tools/areaCalculator.js"
  "tools/percentageCalculator.js"
  "tools/mockServices.js"
  "components/ComponentFactory.js"
  "core/agentController.js"
  "core/toolManager.js"
  "core/sandboxExecutor.js"
)

old_files_removed=true
for file in "${old_files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ⚠️  $file (should be removed)"
    old_files_removed=false
  else
    echo "  ✅ $file (removed)"
  fi
done

echo ""
echo "📊 Summary:"
if [ "$all_dirs_exist" = true ] && [ "$all_files_exist" = true ] && [ "$old_files_removed" = true ]; then
  echo "  ✅ All checks passed! Structure is correct."
  exit 0
else
  echo "  ❌ Some checks failed. Please review above."
  exit 1
fi
