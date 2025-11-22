/**
 * Example usage of useBedrockChat hook
 * 
 * This example demonstrates how to use the useBedrockChat hook
 * in a React component for streaming chat with Amazon Bedrock.
 */

import React, { useState } from 'react';
import { useBedrockChat } from '../use-bedrock-chat';

export function BedrockChatExample() {
  const [inputValue, setInputValue] = useState('');
  
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    conversationId,
    isConnected,
    cancelStream,
  } = useBedrockChat({
    onError: (error) => {
      console.error('Chat error:', error);
    },
    autoReconnect: true,
    reconnectDelay: 2000,
    maxReconnectAttempts: 3,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      await sendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleCancel = () => {
    cancelStream();
  };

  const handleClear = () => {
    clearMessages();
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Bedrock Chat</h1>
        <div className="flex gap-2">
          {isConnected && (
            <span className="text-sm text-green-600">● Connected</span>
          )}
          {conversationId && (
            <span className="text-sm text-gray-500">
              ID: {conversationId.substring(0, 8)}...
            </span>
          )}
          <button
            onClick={handleClear}
            className="text-sm text-gray-600 hover:text-gray-900"
            disabled={isLoading}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error.message}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {/* Message content */}
              <div className="whitespace-pre-wrap">{message.content}</div>
              
              {/* Streaming indicator */}
              {message.isStreaming && (
                <div className="mt-2 flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150" />
                </div>
              )}

              {/* Tool uses */}
              {message.toolUses && message.toolUses.length > 0 && (
                <div className="mt-2 space-y-1">
                  {message.toolUses.map((tool, idx) => (
                    <div
                      key={idx}
                      className="text-xs flex items-center gap-2 opacity-75"
                    >
                      <span>🔧 {tool.toolName}</span>
                      {tool.status === 'pending' && (
                        <span className="text-yellow-600">⏳ Running...</span>
                      )}
                      {tool.status === 'complete' && (
                        <span className="text-green-600">✓ Complete</span>
                      )}
                      {tool.status === 'error' && (
                        <span className="text-red-600">✗ Error</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Timestamp */}
              <div className="text-xs opacity-50 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        {isLoading ? (
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            Cancel
          </button>
        ) : (
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            disabled={!inputValue.trim() || isLoading}
          >
            Send
          </button>
        )}
      </form>
    </div>
  );
}
