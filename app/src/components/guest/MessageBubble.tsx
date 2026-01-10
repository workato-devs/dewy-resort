/**
 * MessageBubble Component
 * Displays a single chat message with different styling for user vs assistant
 */

'use client';

import { ChatMessage } from '@/types';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  return (
    <div
      className={cn(
        'flex w-full',
        isUser && 'justify-end',
        isAssistant && 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-2 space-y-1',
          isUser && 'bg-primary text-primary-foreground',
          isAssistant && 'bg-muted'
        )}
      >
        {isAssistant && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🤖</span>
            <span className="text-xs font-medium">Dewy</span>
          </div>
        )}
        
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>
        
        <p
          className={cn(
            'text-xs',
            isUser && 'text-primary-foreground/70',
            isAssistant && 'text-muted-foreground'
          )}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}
