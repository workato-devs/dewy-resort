/**
 * BedrockChatInterfaceWithDebug Component
 * 
 * Enhanced version of BedrockChatInterface with integrated debug panel.
 * Shows debug panel on the right side when NEXT_PUBLIC_ENABLE_CHAT_DEBUG=true
 * 
 * Features:
 * - All features from BedrockChatInterface
 * - Side-by-side debug panel
 * - Real-time event tracking
 * - Message history inspection
 * - API call monitoring
 */

'use client';

import React from 'react';
import { BedrockChatInterface } from './BedrockChatInterface';
import { ChatDebugPanel } from './ChatDebugPanel';
import { useBedrockChatDebug } from '@/hooks/use-bedrock-chat-debug';
import { cn } from '@/lib/utils';

/**
 * Component props
 */
interface BedrockChatInterfaceWithDebugProps {
  role: 'guest' | 'manager' | 'housekeeping' | 'maintenance';
  conversationId?: string;
  className?: string;
  onError?: (error: Error) => void;
}

/**
 * Check if debug mode is enabled
 */
function isDebugEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_CHAT_DEBUG === 'true';
}

/**
 * BedrockChatInterfaceWithDebug Component
 */
export function BedrockChatInterfaceWithDebug({
  role,
  conversationId: initialConversationId,
  className,
  onError,
}: BedrockChatInterfaceWithDebugProps) {
  const debugEnabled = isDebugEnabled();

  // Create debug hook instance with conversationId and onError options
  const debugHook = useBedrockChatDebug({
    conversationId: initialConversationId,
    onError,
  });

  // If debug is not enabled, just render the normal interface
  if (!debugEnabled) {
    return (
      <BedrockChatInterface
        role={role}
        conversationId={initialConversationId}
        className={className}
        onError={onError}
      />
    );
  }
  
  return (
    <div className={cn('flex gap-4 min-h-[700px]', className)}>
      {/* Main chat interface - 60% width */}
      <div className="flex-[3]">
        <BedrockChatInterface
          role={role}
          conversationId={initialConversationId}
          onError={onError}
          externalHook={debugHook}
        />
      </div>

      {/* Debug panel - 40% width */}
      <div className="flex-[2] min-w-[400px]">
        <ChatDebugPanel
          events={debugHook.debugEvents}
          messages={debugHook.messages}
          conversationId={debugHook.conversationId || null}
          isConnected={debugHook.isConnected}
          onClear={debugHook.clearDebugEvents}
        />
      </div>
    </div>
  );
}

/**
 * Export a wrapper that automatically chooses the right component
 */
export function BedrockChatInterfaceAuto(
  props: BedrockChatInterfaceWithDebugProps
) {
  const debugEnabled = isDebugEnabled();

  if (debugEnabled) {
    return <BedrockChatInterfaceWithDebug {...props} />;
  }

  return <BedrockChatInterface {...props} />;
}
