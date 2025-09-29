# Dynamic UI Components

This directory contains the implementation of the UI component factory and renderer for AI-generated dynamic user interfaces.

## Components

### ComponentFactory.js

A factory class for creating and validating React components from JSON definitions.

**Key Features:**
- Component validation and sanitization
- Props sanitization for security
- Support for multiple component types (element, input, button, form)
- Safe HTML tag mapping
- Input type validation

**Usage:**
```javascript
import ComponentFactory from './ComponentFactory';

const definition = {
  type: 'input',
  props: { name: 'email', type: 'email', placeholder: 'Enter email' }
};

const component = ComponentFactory.create(definition);
```

### DynamicUIRenderer.jsx

A React component that renders AI-generated UI components safely with interaction handling.

**Key Features:**
- Safe rendering of dynamic components
- Event handling for user interactions
- State management for component values
- Loading states during processing
- Error handling for invalid components

**Usage:**
```javascript
import DynamicUIRenderer from './DynamicUIRenderer';

const components = [
  {
    type: 'input',
    props: { name: 'amount', type: 'number', placeholder: 'Enter amount' }
  },
  {
    type: 'button',
    props: { onClick: 'calculate' },
    text: 'Calculate'
  }
];

function MyComponent() {
  const handleInteraction = async ({ action, componentId, values, messageId }) => {
    console.log('User interaction:', { action, values });
    // Process the interaction
  };

  return (
    <DynamicUIRenderer
      components={components}
      onInteraction={handleInteraction}
      messageId="my-component"
    />
  );
}
```

## Component Definition Format

Components are defined using a JSON structure:

```javascript
{
  type: 'element' | 'input' | 'button' | 'form',
  tag?: string,           // For 'element' type (div, span, p, h1-h6, label)
  props?: {               // HTML attributes and event handlers
    className?: string,
    id?: string,
    name?: string,        // For inputs
    type?: string,        // For inputs (text, number, email, etc.)
    placeholder?: string,
    required?: boolean,
    onClick?: string      // Action name for buttons
  },
  text?: string,          // Text content for buttons
  children?: Array<ComponentDefinition | string>  // Child components or text
}
```

## Security Features

### Props Sanitization
- Only allows safe HTML attributes
- Removes dangerous props like `onClick`, `onLoad`, `dangerouslySetInnerHTML`
- Sanitizes `className` to remove special characters
- Filters CSS properties to safe subset

### Input Validation
- Restricts input types to safe values (text, number, email, password, tel, url, search)
- Validates component structure before rendering
- Prevents XSS through prop sanitization

### Component Validation
- Validates component type against allowed types
- Recursively validates nested children
- Rejects invalid component definitions

## Supported Component Types

### Element
Generic HTML elements with restricted tag types:
```javascript
{
  type: 'element',
  tag: 'div',
  props: { className: 'container' },
  children: ['Hello World']
}
```

### Input
Form input elements with type validation:
```javascript
{
  type: 'input',
  props: {
    name: 'email',
    type: 'email',
    placeholder: 'Enter your email',
    required: true
  }
}
```

### Button
Interactive buttons with action handling:
```javascript
{
  type: 'button',
  props: { onClick: 'submit-form' },
  text: 'Submit'
}
```

### Form
Container for form elements:
```javascript
{
  type: 'form',
  props: { className: 'my-form' },
  children: [
    // Input and button components
  ]
}
```

## Event Handling

The `DynamicUIRenderer` handles user interactions and calls the `onInteraction` callback:

```javascript
const handleInteraction = async ({ action, componentId, values, messageId }) => {
  // action: The action name from button onClick or default 'calculate'
  // componentId: Unique ID for the component instance
  // values: Object containing all input values from the component
  // messageId: ID of the message containing these components
};
```

## Testing

Run the test suites:
```bash
npm test components/__tests__/
```

Tests cover:
- Component validation and sanitization
- Props sanitization security
- React element creation
- Event handling
- State management
- Error handling

## Examples

See `components/examples/DynamicUIExample.jsx` for complete usage examples including:
- Calculator interface
- Survey form
- Contact form
- Number processing

## Integration

These components are designed to work with:
- AI services that generate component definitions
- Chat interfaces that need dynamic UI
- Sandbox execution environments
- Message-based interaction systems