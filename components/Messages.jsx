'use client';

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
    <div className={cn("flex mb-6", isUser ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[85%] sm:max-w-[75%] md:max-w-[70%] rounded-xl px-4 py-3 shadow-sm",
        isUser 
          ? "bg-blue-600 text-white" 
          : "bg-white border border-gray-200 text-gray-900"
      )}>
        {/* Message content */}
        <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
          {message.content}
        </div>
        
        {/* Render dynamic UI components for AI messages */}
        {!isUser && message.uiComponents && message.uiComponents.length > 0 && (
          <div className="mt-4">
            <DynamicUIRenderer
              components={message.uiComponents}
              messageId={message.id}
              onInteraction={onInteraction}
            />
          </div>
        )}
        
        {/* Timestamp */}
        <div className={cn(
          "text-xs mt-2 opacity-75",
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
    <div className="message-area">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center px-4">
            <div className="text-xl sm:text-2xl font-medium mb-3 text-gray-700">Welcome!</div>
            <div className="text-sm sm:text-base max-w-md mx-auto leading-relaxed">
              Ask me a mathematical question and I&apos;ll create interactive calculators and tools to help you solve it!
            </div>
            <div className="mt-6 text-xs sm:text-sm text-gray-400">
              Try asking: &quot;Create a loan calculator&quot; or &quot;Help me calculate compound interest&quot;
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {messages.map((message) => (
            <Message
              key={message.id}
              message={message}
              onInteraction={onInteraction}
            />
          ))}
        </div>
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-start mb-6">
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-gray-600 text-sm">AI is thinking...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}