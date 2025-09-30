import React, { useState, useCallback, useEffect, useRef } from 'react';
import ComponentFactory from './ComponentFactory';
import useChatStore from '../store/chatStore';

/**
 * DynamicUIRenderer - Renders AI-generated UI components safely
 * @param {Object} props
 * @param {Array} props.components - Array of component definitions
 * @param {Function} props.onInteraction - Callback for user interactions
 * @param {string} props.messageId - ID of the message containing these components
 */
export default function DynamicUIRenderer({ 
  components = [], 
  onInteraction,
  messageId 
}) {
  const [componentStates, setComponentStates] = useState({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [calculationResults, setCalculationResults] = useState({});
  const [autoCalculateEnabled, setAutoCalculateEnabled] = useState(false);
  
  // Get UI state from store for persistence
  const updateUIState = useChatStore((state) => state.updateUIState);
  const getUIState = useChatStore((state) => state.getUIState);
  
  // Refs for debouncing
  const debounceTimeouts = useRef({});

  // Initialize component states from store on mount
  useEffect(() => {
    if (components && components.length > 0) {
      const initialStates = {};
      
      components.forEach((component, index) => {
        const componentId = `component-${index}`;
        
        // First check if we have stored state
        const storedState = getUIState(`${messageId}-${componentId}`);
        if (storedState) {
          initialStates[componentId] = storedState;
        } else {
          // Initialize with default values from AI response
          const defaultState = {};
          const extractDefaults = (comp) => {
            if (comp.type === 'input' && comp.props?.name && comp.props?.value) {
              defaultState[comp.props.name] = comp.props.value;
            }
            if (comp.children && Array.isArray(comp.children)) {
              comp.children.forEach(child => {
                if (typeof child === 'object') {
                  extractDefaults(child);
                }
              });
            }
          };
          extractDefaults(component);
          
          if (Object.keys(defaultState).length > 0) {
            initialStates[componentId] = defaultState;
          }
        }
      });
      
      if (Object.keys(initialStates).length > 0) {
        setComponentStates(initialStates);
      }
    }
  }, [components, messageId, getUIState]);

  /**
   * Validates input value based on type and constraints
   */
  const validateInput = useCallback((name, value, type, props = {}) => {
    const errors = [];
    
    // Type-specific validation
    switch (type) {
      case 'number':
        if (value !== '' && isNaN(Number(value))) {
          errors.push('Must be a valid number');
        } else if (value !== '') {
          const numValue = Number(value);
          if (props.min !== undefined && numValue < props.min) {
            errors.push(`Must be at least ${props.min}`);
          }
          if (props.max !== undefined && numValue > props.max) {
            errors.push(`Must be at most ${props.max}`);
          }
        }
        break;
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.push('Must be a valid email address');
        }
        break;
      case 'tel':
        if (value && !/^[\d\s\-\+\(\)]+$/.test(value)) {
          errors.push('Must be a valid phone number');
        }
        break;
      case 'select':
        // Select validation - value should be one of the allowed options
        // This is typically handled by the browser, but we can add custom validation if needed
        break;
    }
    
    // Required field validation
    if (props.required && (!value || value.toString().trim() === '')) {
      errors.push('This field is required');
    }
    
    return errors;
  }, []);

  /**
   * Validates all inputs in a component before calculation
   */
  const validateComponent = useCallback((componentId) => {
    const componentState = componentStates[componentId] || {};
    const errors = {};
    let hasErrors = false;
    
    // Check for validation errors
    Object.keys(validationErrors).forEach(key => {
      if (key.startsWith(`${componentId}-`) && validationErrors[key].length > 0) {
        errors[key] = validationErrors[key];
        hasErrors = true;
      }
    });
    
    return { isValid: !hasErrors, errors };
  }, [componentStates, validationErrors]);

  /**
   * Handles button clicks in generated components with validation
   */
  const handleButtonClick = useCallback(async (componentId, action) => {
    if (!onInteraction) return;
    
    // Validate component inputs before proceeding
    const validation = validateComponent(componentId);
    if (!validation.isValid) {
      // Show validation errors
      console.warn('Validation errors:', validation.errors);
      return;
    }
    
    setIsCalculating(true);
    try {
      const componentState = componentStates[componentId] || {};
      
      // Call the interaction handler
      const result = await onInteraction({
        action,
        componentId,
        values: componentState,
        messageId
      });
      
      // Store calculation result for display
      if (result && result.solution) {
        setCalculationResults(prev => ({
          ...prev,
          [componentId]: {
            solution: result.solution,
            reasoning: result.reasoning,
            timestamp: new Date()
          }
        }));
      }
      
    } catch (error) {
      console.error('Error handling button click:', error);
      setCalculationResults(prev => ({
        ...prev,
        [componentId]: {
          error: error.message,
          timestamp: new Date()
        }
      }));
    } finally {
      setIsCalculating(false);
    }
  }, [componentStates, onInteraction, messageId, validateComponent]);

  /**
   * Handles input changes in generated components with validation
   */
  const handleInputChange = useCallback((componentId, name, value, type, props = {}) => {
    // Update component state
    const newState = {
      ...componentStates[componentId],
      [name]: value
    };
    
    setComponentStates(prev => ({
      ...prev,
      [componentId]: newState
    }));
    
    // Update global UI state for persistence
    updateUIState(`${messageId}-${componentId}`, newState);
    
    // Validate input
    const errors = validateInput(name, value, type, props);
    setValidationErrors(prev => ({
      ...prev,
      [`${componentId}-${name}`]: errors
    }));
    
    // Clear previous calculation results when inputs change
    if (calculationResults[componentId]) {
      setCalculationResults(prev => ({
        ...prev,
        [componentId]: null
      }));
    }
    
    // Auto-calculate with debouncing if enabled and all required fields are filled
    if (autoCalculateEnabled && onInteraction) {
      // Clear existing timeout
      if (debounceTimeouts.current[componentId]) {
        clearTimeout(debounceTimeouts.current[componentId]);
      }
      
      // Set new timeout for auto-calculation
      debounceTimeouts.current[componentId] = setTimeout(() => {
        const validation = validateComponent(componentId);
        if (validation.isValid) {
          // Check if we have meaningful values (not just empty strings)
          const hasValues = Object.values(newState).some(val => 
            val !== null && val !== undefined && val.toString().trim() !== ''
          );
          
          if (hasValues) {
            handleButtonClick(componentId, 'calculate');
          }
        }
      }, 1500); // 1.5 second delay
    }
  }, [componentStates, updateUIState, validateInput, calculationResults, autoCalculateEnabled, onInteraction, validateComponent, handleButtonClick]);

  /**
   * Enhances component definitions with event handlers and validation
   */
  const enhanceComponentWithHandlers = useCallback((definition, componentId) => {
    if (!definition || typeof definition !== 'object') {
      return definition;
    }

    const enhanced = { ...definition };
    const hasResult = calculationResults[componentId] && !calculationResults[componentId].error;

    // Add event handlers based on component type
    switch (definition.type) {
      case 'input':
        const inputName = enhanced.props?.name;
        const inputType = enhanced.props?.type || 'text';
        // Use stored value, or fall back to the original value from AI, or empty string
        const currentValue = componentStates[componentId]?.[inputName] ?? enhanced.props?.value ?? '';
        const hasError = validationErrors[`${componentId}-${inputName}`]?.length > 0;
        
        enhanced.props = {
          ...enhanced.props,
          onChange: (e) => {
            const { name, value } = e.target;
            if (name) {
              handleInputChange(componentId, name, value, inputType, enhanced.props);
            }
          },
          value: currentValue,
          disabled: hasResult || isCalculating, // Disable after successful calculation
          className: `${enhanced.props?.className || ''} ${hasError ? 'border-red-500 focus:ring-red-500' : ''}`.trim()
        };
        break;

      case 'select':
        const selectName = enhanced.props?.name;
        const currentSelectValue = componentStates[componentId]?.[selectName] ?? enhanced.props?.value ?? '';
        const hasSelectError = validationErrors[`${componentId}-${selectName}`]?.length > 0;
        
        enhanced.props = {
          ...enhanced.props,
          onChange: (e) => {
            const { name, value } = e.target;
            if (name) {
              handleInputChange(componentId, name, value, 'select', enhanced.props);
            }
          },
          value: currentSelectValue,
          disabled: hasResult || isCalculating, // Disable after successful calculation
          className: `${enhanced.props?.className || ''} ${hasSelectError ? 'border-red-500 focus:ring-red-500' : ''}`.trim()
        };
        break;

      case 'button':
        const validation = validateComponent(componentId);
        enhanced.props = {
          ...enhanced.props,
          onClick: () => {
            // Extract action from props or use default
            let action = 'calculate';
            if (enhanced.props?.onClick) {
              action = typeof enhanced.props.onClick === 'string' 
                ? enhanced.props.onClick 
                : 'calculate';
            }
            handleButtonClick(componentId, action);
          },
          disabled: hasResult || isCalculating // Disable after successful calculation or while calculating
        };
        
        // Update button text based on state
        if (isCalculating && enhanced.text) {
          enhanced.text = 'Calculating...';
        } else if (hasResult && enhanced.text) {
          enhanced.text = 'Calculated';
        }
        break;

      case 'form':
      case 'element':
        // Recursively enhance children
        if (enhanced.children && Array.isArray(enhanced.children)) {
          enhanced.children = enhanced.children.map(child => {
            if (typeof child === 'string') {
              return child;
            }
            return enhanceComponentWithHandlers(child, componentId);
          });
        }
        break;
    }

    return enhanced;
  }, [componentStates, validationErrors, handleInputChange, handleButtonClick, isCalculating, validateComponent]);

  /**
   * Renders validation errors for a component
   */
  const renderValidationErrors = useCallback((componentId) => {
    const componentErrors = Object.keys(validationErrors)
      .filter(key => key.startsWith(`${componentId}-`))
      .reduce((acc, key) => {
        const fieldName = key.replace(`${componentId}-`, '');
        const errors = validationErrors[key];
        if (errors.length > 0) {
          acc[fieldName] = errors;
        }
        return acc;
      }, {});

    if (Object.keys(componentErrors).length === 0) return null;

    return (
      <div className="mt-2 space-y-1">
        {Object.entries(componentErrors).map(([fieldName, errors]) => (
          <div key={fieldName} className="text-red-600 text-sm">
            <strong>{fieldName}:</strong> {errors.join(', ')}
          </div>
        ))}
      </div>
    );
  }, [validationErrors]);

  /**
   * Handles resetting a component to allow recalculation
   */
  const handleReset = useCallback((componentId) => {
    // Clear calculation results
    setCalculationResults(prev => ({
      ...prev,
      [componentId]: null
    }));
    
    // Clear validation errors
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      Object.keys(newErrors).forEach(key => {
        if (key.startsWith(`${componentId}-`)) {
          delete newErrors[key];
        }
      });
      return newErrors;
    });
  }, []);

  /**
   * Renders calculation results for a component
   */
  const renderCalculationResult = useCallback((componentId) => {
    const result = calculationResults[componentId];
    if (!result) return null;

    if (result.error) {
      return (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="text-red-800 font-medium">Calculation Error</div>
            <button
              onClick={() => handleReset(componentId)}
              className="text-red-600 hover:text-red-800 text-sm underline"
            >
              Try Again
            </button>
          </div>
          <div className="text-red-600 text-sm mt-1">{result.error}</div>
        </div>
      );
    }

    return (
      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="text-green-800 font-medium">Result</div>
          <button
            onClick={() => handleReset(componentId)}
            className="text-green-600 hover:text-green-800 text-sm underline"
          >
            Recalculate
          </button>
        </div>
        <div className="text-green-700 text-lg font-semibold mt-1">{result.solution}</div>
        {result.reasoning && (
          <div className="text-green-600 text-sm mt-2 whitespace-pre-wrap">{result.reasoning}</div>
        )}
        <div className="text-green-500 text-xs mt-2">
          Calculated at {result.timestamp.toLocaleTimeString()}
        </div>
      </div>
    );
  }, [calculationResults, handleReset]);

  /**
   * Renders a single component definition
   */
  const renderComponent = useCallback((definition, index) => {
    if (!definition) return null;

    // Generate a unique component ID
    const componentId = `component-${index}`;
    
    // Validate the component definition
    if (!ComponentFactory.validate(definition)) {
      console.warn('Invalid component definition skipped:', definition);
      return (
        <div key={componentId} className="text-red-500 text-sm p-2 bg-red-50 rounded">
          Invalid component definition
        </div>
      );
    }

    try {
      // Enhance with event handlers
      const enhancedDefinition = enhanceComponentWithHandlers(definition, componentId);
      
      // Create the React element
      const element = ComponentFactory.create(enhancedDefinition, index);
      
      if (!element) {
        return (
          <div key={componentId} className="text-yellow-600 text-sm p-2 bg-yellow-50 rounded">
            Component could not be rendered
          </div>
        );
      }

      return (
        <div key={componentId} className="dynamic-component">
          {element}
          {renderValidationErrors(componentId)}
          {renderCalculationResult(componentId)}
        </div>
      );
    } catch (error) {
      console.error('Error rendering component:', error);
      return (
        <div key={componentId} className="text-red-500 text-sm p-2 bg-red-50 rounded">
          Error rendering component: {error.message}
        </div>
      );
    }
  }, [messageId, enhanceComponentWithHandlers, renderValidationErrors, renderCalculationResult]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    const timeouts = debounceTimeouts.current;
    return () => {
      Object.values(timeouts).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  // Handle empty or invalid components array
  if (!Array.isArray(components) || components.length === 0) {
    return null;
  }

  return (
    <div className="dynamic-ui-container space-y-4 mt-4 p-4 bg-gray-50 rounded-lg border">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600 font-medium">Interactive Component</div>
        <label className="flex items-center space-x-2 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={autoCalculateEnabled}
            onChange={(e) => setAutoCalculateEnabled(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span>Auto-calculate</span>
        </label>
      </div>
      {components.map((component, index) => renderComponent(component, index))}
      {isCalculating && (
        <div className="flex items-center space-x-2 text-blue-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm">
            {autoCalculateEnabled ? 'Auto-calculating...' : 'Processing...'}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Hook for managing dynamic UI state
 */
export function useDynamicUI() {
  const [uiState, setUiState] = useState({});

  const updateComponentState = useCallback((componentId, state) => {
    setUiState(prev => ({
      ...prev,
      [componentId]: {
        ...prev[componentId],
        ...state
      }
    }));
  }, []);

  const getComponentState = useCallback((componentId) => {
    return uiState[componentId] || {};
  }, [uiState]);

  const clearComponentState = useCallback((componentId) => {
    setUiState(prev => {
      const newState = { ...prev };
      delete newState[componentId];
      return newState;
    });
  }, []);

  return {
    uiState,
    updateComponentState,
    getComponentState,
    clearComponentState
  };
}