import React from 'react';

/**
 * Sanitizes props to remove potentially dangerous attributes
 * @param {Object} props - Raw props object
 * @returns {Object} Sanitized props
 */
export function sanitizeProps(props = {}) {
  const sanitized = {};
  const allowedProps = [
    'id', 'className', 'style', 'placeholder', 'type', 'name', 'value', 
    'min', 'max', 'step', 'required', 'disabled', 'readOnly', 'pattern',
    'minLength', 'maxLength', 'title', 'autoComplete', 'inputMode'
  ];
  
  // Only allow safe props
  Object.keys(props).forEach(key => {
    if (allowedProps.includes(key)) {
      // Additional sanitization for specific props
      if (key === 'style' && typeof props[key] === 'object') {
        // Only allow safe CSS properties
        const safeStyles = {};
        const allowedStyles = ['color', 'backgroundColor', 'fontSize', 'fontWeight', 'margin', 'padding', 'width', 'height'];
        Object.keys(props[key]).forEach(styleKey => {
          if (allowedStyles.includes(styleKey)) {
            safeStyles[styleKey] = props[key][styleKey];
          }
        });
        sanitized[key] = safeStyles;
      } else if (key === 'className' && typeof props[key] === 'string') {
        // Allow only alphanumeric, hyphens, spaces, and colons for class names (for Tailwind)
        sanitized[key] = props[key].replace(/[^a-zA-Z0-9\s\-_:]/g, '');
      } else if (key === 'pattern' && typeof props[key] === 'string') {
        // Sanitize regex patterns to prevent ReDoS attacks
        try {
          new RegExp(props[key]);
          sanitized[key] = props[key];
        } catch (e) {
          console.warn('Invalid regex pattern ignored:', props[key]);
        }
      } else {
        sanitized[key] = props[key];
      }
    }
  });
  
  return sanitized;
}

/**
 * Sanitizes input-specific props
 * @param {Object} props - Raw input props
 * @returns {Object} Sanitized input props
 */
export function sanitizeInputProps(props = {}) {
  const sanitized = sanitizeProps(props);
  
  // Ensure type is safe for inputs
  const allowedInputTypes = ['text', 'number', 'email', 'password', 'tel', 'url', 'search', 'date', 'time', 'range'];
  if (sanitized.type && !allowedInputTypes.includes(sanitized.type)) {
    sanitized.type = 'text';
  }
  
  // Validate numeric constraints
  if (sanitized.type === 'number' || sanitized.type === 'range') {
    if (sanitized.min !== undefined) {
      sanitized.min = Number(sanitized.min);
      if (isNaN(sanitized.min)) delete sanitized.min;
    }
    if (sanitized.max !== undefined) {
      sanitized.max = Number(sanitized.max);
      if (isNaN(sanitized.max)) delete sanitized.max;
    }
    if (sanitized.step !== undefined) {
      sanitized.step = Number(sanitized.step);
      if (isNaN(sanitized.step)) delete sanitized.step;
    }
  }
  
  return sanitized;
}

/**
 * Validates component definition structure
 * @param {Object} definition - Component definition
 * @returns {boolean} Whether the definition is valid
 */
export function validateComponentDefinition(definition) {
  if (!definition || typeof definition !== 'object') {
    return false;
  }
  
  const allowedTypes = ['element', 'input', 'button', 'form'];
  if (!allowedTypes.includes(definition.type)) {
    return false;
  }
  
  // Validate children if present
  if (definition.children && Array.isArray(definition.children)) {
    return definition.children.every(child => 
      typeof child === 'string' || validateComponentDefinition(child)
    );
  }
  
  return true;
}

/**
 * Creates a React element from a component definition
 * @param {Object} definition - Component definition
 * @param {number} index - Index for React key
 * @returns {React.Element} React component
 */
export function createReactElement(definition, index = 0) {
  if (!validateComponentDefinition(definition)) {
    console.warn('Invalid component definition:', definition);
    return null;
  }
  
  const key = `component-${index}`;
  
  switch (definition.type) {
    case 'element':
      return createElement(definition, key);
    case 'input':
      return createInput(definition, key);
    case 'button':
      return createButton(definition, key);
    case 'form':
      return createForm(definition, key);
    default:
      return null;
  }
}

/**
 * Creates a generic HTML element
 */
function createElement(definition, key) {
  const { tag = 'div', props = {}, children = [] } = definition;
  const sanitizedProps = sanitizeProps(props);
  
  // Map common HTML tags to safe alternatives
  const allowedTags = ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label'];
  const safeTag = allowedTags.includes(tag) ? tag : 'div';
  
  const processedChildren = children.map((child, index) => {
    if (typeof child === 'string') {
      return child;
    }
    return createReactElement(child, index);
  }).filter(Boolean);
  
  return React.createElement(
    safeTag,
    { key, ...sanitizedProps },
    ...processedChildren
  );
}

/**
 * Creates an input element with enhanced validation styling
 */
function createInput(definition, key) {
  const { props = {} } = definition;
  const sanitizedProps = sanitizeInputProps(props);
  
  // Base classes for input styling
  const baseClasses = 'border rounded px-3 py-2 focus:outline-none focus:ring-2 transition-colors';
  const normalClasses = 'border-gray-300 focus:ring-blue-500 focus:border-blue-500';
  const errorClasses = 'border-red-500 focus:ring-red-500 focus:border-red-500';
  
  // Check if this input has error styling (will be added by DynamicUIRenderer)
  const hasError = sanitizedProps.className?.includes('border-red-500');
  const validationClasses = hasError ? errorClasses : normalClasses;
  
  const finalClassName = `${baseClasses} ${validationClasses} ${sanitizedProps.className || ''}`.trim();
  
  return React.createElement('input', {
    key,
    className: finalClassName,
    ...sanitizedProps
  });
}

/**
 * Creates a button element with enhanced state styling
 */
function createButton(definition, key) {
  const { props = {}, text = 'Button' } = definition;
  const sanitizedProps = sanitizeProps(props);
  
  // Base button classes
  const baseClasses = 'font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors';
  
  // State-based styling
  const enabledClasses = 'bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-500';
  const disabledClasses = 'bg-gray-400 text-gray-200 cursor-not-allowed';
  
  const stateClasses = sanitizedProps.disabled ? disabledClasses : enabledClasses;
  const finalClassName = `${baseClasses} ${stateClasses} ${sanitizedProps.className || ''}`.trim();
  
  return React.createElement('button', {
    key,
    className: finalClassName,
    type: 'button',
    ...sanitizedProps
  }, text);
}

/**
 * Creates a form element
 */
function createForm(definition, key) {
  const { props = {}, children = [] } = definition;
  const sanitizedProps = sanitizeProps(props);
  
  const processedChildren = children.map((child, index) => {
    if (typeof child === 'string') {
      return child;
    }
    return createReactElement(child, index);
  }).filter(Boolean);
  
  return React.createElement('form', {
    key,
    className: `space-y-4 ${sanitizedProps.className || ''}`,
    onSubmit: (e) => e.preventDefault(), // Prevent default form submission
    ...sanitizedProps
  }, ...processedChildren);
}

/**
 * Component factory class for managing component creation
 */
export class ComponentFactory {
  static create(definition, index = 0) {
    return createReactElement(definition, index);
  }
  
  static createMultiple(definitions) {
    if (!Array.isArray(definitions)) {
      return [];
    }
    
    return definitions
      .map((definition, index) => this.create(definition, index))
      .filter(Boolean);
  }
  
  static validate(definition) {
    return validateComponentDefinition(definition);
  }
  
  static sanitize(props) {
    return sanitizeProps(props);
  }
}

export default ComponentFactory;