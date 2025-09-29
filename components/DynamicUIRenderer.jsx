import React, { useState, useCallback } from 'react';
import ComponentFactory from './ComponentFactory';

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

  /**
   * Handles input changes in generated components
   */
  const handleInputChange = useCallback((componentId, name, value) => {
    setComponentStates(prev => ({
      ...prev,
      [componentId]: {
        ...prev[componentId],
        [name]: value
      }
    }));
  }, []);

  /**
   * Handles button clicks in generated components
   */
  const handleButtonClick = useCallback(async (componentId, action) => {
    if (!onInteraction) return;
    
    setIsCalculating(true);
    try {
      const componentState = componentStates[componentId] || {};
      await onInteraction({
        action,
        componentId,
        values: componentState,
        messageId
      });
    } catch (error) {
      console.error('Error handling button click:', error);
    } finally {
      setIsCalculating(false);
    }
  }, [componentStates, onInteraction, messageId]);

  /**
   * Enhances component definitions with event handlers
   */
  const enhanceComponentWithHandlers = useCallback((definition, componentId) => {
    if (!definition || typeof definition !== 'object') {
      return definition;
    }

    const enhanced = { ...definition };

    // Add event handlers based on component type
    switch (definition.type) {
      case 'input':
        enhanced.props = {
          ...enhanced.props,
          onChange: (e) => {
            const { name, value } = e.target;
            if (name) {
              handleInputChange(componentId, name, value);
            }
          },
          value: componentStates[componentId]?.[enhanced.props?.name] || ''
        };
        break;

      case 'button':
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
          disabled: isCalculating
        };
        
        // Update button text if calculating
        if (isCalculating && enhanced.text) {
          enhanced.text = 'Calculating...';
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
  }, [componentStates, handleInputChange, handleButtonClick, isCalculating]);

  /**
   * Renders a single component definition
   */
  const renderComponent = useCallback((definition, index) => {
    if (!definition) return null;

    // Generate a unique component ID
    const componentId = `${messageId}-component-${index}`;
    
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
  }, [messageId, enhanceComponentWithHandlers]);

  // Handle empty or invalid components array
  if (!Array.isArray(components) || components.length === 0) {
    return null;
  }

  return (
    <div className="dynamic-ui-container space-y-4 mt-4 p-4 bg-gray-50 rounded-lg border">
      <div className="text-sm text-gray-600 font-medium">Interactive Component</div>
      {components.map((component, index) => renderComponent(component, index))}
      {isCalculating && (
        <div className="flex items-center space-x-2 text-blue-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm">Processing...</span>
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