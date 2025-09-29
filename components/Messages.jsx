import React from 'react';
import DynamicUIRenderer from './DynamicUIRenderer';
import useChatStore from '../store/chatStore';
import { cn } from '../utils/cn';

/**
 * Individual Message Component
 */
function Message({ message, onInteraction }) {
  const isUser = message.type === 'user';
  
  return (
    <div className={cn("flex mb-4", isUser ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[80%] rounded-lg px-4 py-2",
        isUser 
          ? "bg-blue-600 text-white" 
          : "bg-gray-100 text-gray-900"
      )}>
        {/* Message content */}
        <div className="whitespace-pre-wrap">
          {message.content}
        </div>
        
        {/* Render dynamic UI components for AI messages */}
        {!isUser && message.uiComponents && message.uiComponents.length > 0 && (
          <DynamicUIRenderer
            components={message.uiComponents}
            messageId={message.id}
            onInteraction={onInteraction}
          />
        )}
        
        {/* Timestamp */}
        <div className={cn(
          "text-xs mt-2",
          isUser ? "text-blue-100" : "text-gray-500"
        )}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

/**
 * Messages Component - Renders all chat messages
 */
export default function Messages({ onInteraction }) {
  const messages = useChatStore((state) => state.messages);
  const isLoading = useChatStore((state) => state.isLoading);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center">
            <div className="text-lg font-medium mb-2">Welcome to AI Chat</div>
            <div className="text-sm">Ask me a mathematical question and I&apos;ll create interactive tools to help you!</div>
          </div>
        </div>
      ) : (
        messages.map((message) => (
          <Message
            key={message.id}
            message={message}
            onInteraction={onInteraction}
          />
        ))
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-start mb-4">
          <div className="bg-gray-100 rounded-lg px-4 py-2">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
              <span className="text-gray-600">AI is thinking...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}