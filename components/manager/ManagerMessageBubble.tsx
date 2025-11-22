/**
 * ManagerMessageBubble Component
 * Message bubble for manager chat with action confirmations
 */

'use client';

import { ChatMessage } from '@/types';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface ManagerMessageBubbleProps {
  message: ChatMessage;
}

export function ManagerMessageBubble({ message }: ManagerMessageBubbleProps) {
  const isUser = message.role === 'user';
  const metadata = message.metadata ? JSON.parse(message.metadata) : null;

  // Determine if this is an action confirmation
  const isActionConfirmation = metadata?.action || message.content.includes('✓');

  return (
    <div
      className={cn(
        'flex w-full',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-3 shadow-sm',
          isUser
            ? 'bg-blue-600 text-white'
            : isActionConfirmation
            ? 'bg-green-50 border border-green-200 text-green-900'
            : 'bg-gray-100 text-gray-900'
        )}
      >
        {/* Message content */}
        <div className="whitespace-pre-wrap break-words">
          {message.content}
        </div>

        {/* Action indicator for assistant messages */}
        {!isUser && isActionConfirmation && (
          <div className="flex items-center gap-1 mt-2 text-xs text-green-700">
            <CheckCircle2 className="h-3 w-3" />
            <span>Action completed</span>
          </div>
        )}

        {/* Timestamp */}
        <div
          className={cn(
            'text-xs mt-1',
            isUser ? 'text-blue-100' : 'text-gray-500'
          )}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
