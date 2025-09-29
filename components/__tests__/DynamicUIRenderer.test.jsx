import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DynamicUIRenderer, { useDynamicUI } from '../DynamicUIRenderer';

// Mock ComponentFactory
jest.mock('../ComponentFactory', () => {
  const mockReact = require('react');
  return {
    __esModule: true,
    default: {
      validate: jest.fn(() => true),
      create: jest.fn((definition, index) => {
        if (definition.type === 'input') {
          return mockReact.createElement('input', {
            key: index,
            name: definition.props?.name,
            onChange: definition.props?.onChange,
            value: definition.props?.value || '',
            'data-testid': `input-${definition.props?.name}`
          });
        }
        if (definition.type === 'button') {
          return mockReact.createElement('button', {
            key: index,
            onClick: definition.props?.onClick,
            disabled: definition.props?.disabled,
            'data-testid': 'test-button'
          }, definition.text);
        }
        return mockReact.createElement('div', { key: index }, 'Mock Component');
      })
    }
  };
});

describe('DynamicUIRenderer', () => {
  const mockOnInteraction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty state when no components provided', () => {
    const { container } = render(
      <DynamicUIRenderer 
        components={[]} 
        messageId="test-message"
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('should render components with proper structure', () => {
    const components = [
      {
        type: 'input',
        props: { name: 'amount', placeholder: 'Enter amount' }
      }
    ];

    render(
      <DynamicUIRenderer 
        components={components}
        messageId="test-message"
        onInteraction={mockOnInteraction}
      />
    );

    expect(screen.getByText('Interactive Component')).toBeInTheDocument();
    expect(screen.getByTestId('input-amount')).toBeInTheDocument();
  });

  it('should handle input changes', () => {
    const components = [
      {
        type: 'input',
        props: { name: 'amount' }
      }
    ];

    render(
      <DynamicUIRenderer 
        components={components}
        messageId="test-message"
        onInteraction={mockOnInteraction}
      />
    );

    const input = screen.getByTestId('input-amount');
    fireEvent.change(input, { target: { name: 'amount', value: '100' } });

    // The input should reflect the change
    expect(input.value).toBe('100');
  });

  it('should handle button clicks and call onInteraction', async () => {
    const components = [
      {
        type: 'button',
        props: { onClick: 'calculate' },
        text: 'Calculate'
      }
    ];

    render(
      <DynamicUIRenderer 
        components={components}
        messageId="test-message"
        onInteraction={mockOnInteraction}
      />
    );

    const button = screen.getByTestId('test-button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnInteraction).toHaveBeenCalledWith({
        action: 'calculate',
        componentId: 'test-message-component-0',
        values: {},
        messageId: 'test-message'
      });
    });
  });

  it('should show loading state during calculation', async () => {
    const components = [
      {
        type: 'button',
        props: { onClick: 'calculate' },
        text: 'Calculate'
      }
    ];

    // Mock onInteraction to return a promise that we can control
    const mockInteraction = jest.fn(() => new Promise(resolve => {
      setTimeout(resolve, 100);
    }));

    render(
      <DynamicUIRenderer 
        components={components}
        messageId="test-message"
        onInteraction={mockInteraction}
      />
    );

    const button = screen.getByTestId('test-button');
    fireEvent.click(button);

    // Should show processing state
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText('Processing...')).not.toBeInTheDocument();
    });
  });

  it('should handle invalid component definitions gracefully', () => {
    // Mock ComponentFactory.validate to return false for invalid components
    const ComponentFactory = require('../ComponentFactory').default;
    ComponentFactory.validate.mockReturnValueOnce(false);

    const components = [
      {
        type: 'invalid-type'
      }
    ];

    render(
      <DynamicUIRenderer 
        components={components}
        messageId="test-message"
      />
    );

    expect(screen.getByText('Invalid component definition')).toBeInTheDocument();
  });
});

describe('useDynamicUI', () => {
  function TestComponent() {
    const { uiState, updateComponentState, getComponentState, clearComponentState } = useDynamicUI();
    
    return (
      <div>
        <div data-testid="ui-state">{JSON.stringify(uiState)}</div>
        <button 
          data-testid="update-btn"
          onClick={() => updateComponentState('comp1', { value: 'test' })}
        >
          Update
        </button>
        <button 
          data-testid="get-btn"
          onClick={() => {
            const state = getComponentState('comp1');
            document.body.setAttribute('data-state', JSON.stringify(state));
          }}
        >
          Get
        </button>
        <button 
          data-testid="clear-btn"
          onClick={() => clearComponentState('comp1')}
        >
          Clear
        </button>
      </div>
    );
  }

  it('should manage component state correctly', () => {
    render(<TestComponent />);
    
    // Initial state should be empty
    expect(screen.getByTestId('ui-state')).toHaveTextContent('{}');
    
    // Update state
    fireEvent.click(screen.getByTestId('update-btn'));
    expect(screen.getByTestId('ui-state')).toHaveTextContent('{"comp1":{"value":"test"}}');
    
    // Get state
    fireEvent.click(screen.getByTestId('get-btn'));
    expect(document.body.getAttribute('data-state')).toBe('{"value":"test"}');
    
    // Clear state
    fireEvent.click(screen.getByTestId('clear-btn'));
    expect(screen.getByTestId('ui-state')).toHaveTextContent('{}');
  });
});