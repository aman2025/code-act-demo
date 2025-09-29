import React from 'react';
import ChatView from '../ChatView';

/**
 * Example usage of the ChatView component
 * This demonstrates how to integrate the chat interface into an application
 */
export default function ChatExample() {
  return (
    <div className="h-screen w-full">
      <ChatView />
    </div>
  );
}

/**
 * Example of how to use the chat components in a custom layout
 */
export function CustomChatLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-4xl h-screen">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden h-full">
          <ChatView />
        </div>
      </div>
    </div>
  );
}