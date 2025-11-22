/**
 * BedrockChatInterface Usage Examples
 * 
 * This file demonstrates the two ways to use BedrockChatInterface:
 * 1. Without external hook (backward compatible - uses internal hook)
 * 2. With external hook (for debug integration)
 */

'use client';

import React from 'react';
import { BedrockChatInterface } from './BedrockChatInterface';
import { useBedrockChat } from '@/hooks/use-bedrock-chat';

/**
 * Example 1: Using BedrockChatInterface without external hook
 * This is the backward-compatible usage pattern.
 * The component creates and manages its own internal hook.
 */
export function Example1_InternalHook() {
  const handleError = (error: Error) => {
    console.error('Chat error:', error);
  };

  return (
    <BedrockChatInterface
      role="guest"
      conversationId="example-conversation-1"
      onError={handleError}
    />
  );
}

/**
 * Example 2: Using BedrockChatInterface with external hook
 * This is the new pattern that enables debug integration.
 * The parent component creates the hook and passes it to the interface.
 */
export function Example2_ExternalHook() {
  // Create the hook in the parent component
  const chatHook = useBedrockChat({
    conversationId: 'example-conversation-2',
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  // Pass the hook to the interface
  return (
    <div className="space-y-4">
      <BedrockChatInterface
        role="manager"
        externalHook={chatHook}
      />
      
      {/* Parent component can access hook state */}
      <div className="text-sm text-muted-foreground">
        Messages: {chatHook.messages.length}
        {chatHook.isLoading && ' (Loading...)'}
        {chatHook.isConnected && ' (Connected)'}
      </div>
    </div>
  );
}

/**
 * Example 3: Using external hook for debug integration
 * This demonstrates how the debug hook will be used.
 */
export function Example3_DebugIntegration() {
  // In the actual implementation, this would be useBedrockChatDebug
  const chatHook = useBedrockChat({
    conversationId: 'example-conversation-3',
  });

  return (
    <div className="flex gap-4">
      {/* Chat interface uses the external hook */}
      <div className="flex-1">
        <BedrockChatInterface
          role="housekeeping"
          externalHook={chatHook}
        />
      </div>
      
      {/* Debug panel can access the same hook state */}
      <div className="w-96 border rounded-lg p-4">
        <h3 className="font-semibold mb-2">Debug Panel</h3>
        <div className="space-y-2 text-sm">
          <div>Messages: {chatHook.messages.length}</div>
          <div>Loading: {chatHook.isLoading ? 'Yes' : 'No'}</div>
          <div>Connected: {chatHook.isConnected ? 'Yes' : 'No'}</div>
          <div>Conversation ID: {chatHook.conversationId || 'None'}</div>
        </div>
      </div>
    </div>
  );
}
