import React, { useRef, useEffect, useCallback } from 'react';
import Messages from './Messages';
import useChatStore from '../store/chatStore';
import { cn } from '../utils/cn';

/**
 * Message Input Component
 */
function MessageInput({ onSendMessage, disabled }) {
  const currentInput = useChatStore((state) => state.currentInput);
  const setCurrentInput = useChatStore((state) => state.setCurrentInput);
  const clearCurrentInput = useChatStore((state) => state.clearCurrentInput);
  
  const inputRef = useRef(null);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    
    if (!currentInput.trim() || disabled) {
      return;
    }

    onSendMessage(currentInput.trim());
    clearCurrentInput();
    
    // Focus back on input after sending
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, [currentInput, disabled, onSendMessage, clearCurrentInput]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);

  return (
    <form onSubmit={handleSubmit} className="border-t bg-white p-4">
      <div className="flex space-x-2">
        <textarea
          ref={inputRef}
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me a mathematical question..."
          disabled={disabled}
          className={cn(
            "flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            "disabled:bg-gray-100 disabled:cursor-not-allowed"
          )}
          rows={1}
          style={{
            minHeight: '40px',
            maxHeight: '120px'
          }}
        />
        <button
          type="submit"
          disabled={disabled || !currentInput.trim()}
          className={cn(
            "px-4 py-2 bg-blue-600 text-white rounded-lg",
            "hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
            "disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          )}
        >
          Send
        </button>
      </div>
    </form>
  );
}

/**
 * ChatView - Main chat container component
 */
export default function ChatView() {
  const isLoading = useChatStore((state) => state.isLoading);
  const addUserMessage = useChatStore((state) => state.addUserMessage);
  const addAIMessage = useChatStore((state) => state.addAIMessage);
  const setLoading = useChatStore((state) => state.setLoading);
  
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  /**
   * Handles sending a new message
   */
  const handleSendMessage = useCallback(async (message) => {
    try {
      // Add user message to store
      addUserMessage(message);
      setLoading(true);

      // Call the chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Add AI response to store
      addAIMessage(data.reasoning || 'I received your message.', data.uiComponents);
      
    } catch (error) {
      console.error('Error sending message:', error);
      addAIMessage(
        `Sorry, I encountered an error: ${error.message}. Please try again.`,
        null
      );
    } finally {
      setLoading(false);
    }
  }, [addUserMessage, addAIMessage, setLoading]);

  /**
   * Handles interactions with dynamic UI components
   */
  const handleUIInteraction = useCallback(async (interaction) => {
    try {
      setLoading(true);

      // Call the calculate API
      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(interaction),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Add calculation result as AI message
      if (data.solution) {
        addAIMessage(
          data.reasoning ? `${data.reasoning}\n\nResult: ${data.solution}` : `Result: ${data.solution}`,
          null
        );
      }
      
    } catch (error) {
      console.error('Error handling UI interaction:', error);
      addAIMessage(
        `Sorry, I encountered an error during calculation: ${error.message}`,
        null
      );
    } finally {
      setLoading(false);
    }
  }, [addAIMessage, setLoading]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="border-b bg-gray-50 px-4 py-3">
        <h1 className="text-lg font-semibold text-gray-900">AI Math Assistant</h1>
        <p className="text-sm text-gray-600">Ask mathematical questions and get interactive tools</p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <Messages onInteraction={handleUIInteraction} />
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <MessageInput 
        onSendMessage={handleSendMessage} 
        disabled={isLoading}
      />
    </div>
  );
}