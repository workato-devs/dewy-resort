/**
 * BedrockChatInterface Component
 * 
 * Reusable chat interface for Amazon Bedrock streaming chat.
 * Supports all user roles (guest, manager, housekeeping, maintenance)
 * with role-specific styling and features.
 * 
 * Features:
 * - Message list with auto-scroll
 * - Message input with send button
 * - Typing indicator during streaming
 * - Tool execution status indicators
 * - Error message display
 * - Clear conversation functionality
 * - Optional external hook support for debug integration
 * 
 * Usage:
 * - Without external hook: Component creates and manages its own internal hook (backward compatible)
 * - With external hook: Parent component provides hook for shared state management (enables debug integration)
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.4, 9.1, 9.2, 9.3, 10.1, 10.2, 10.3, 10.4, 10.5
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Send, 
  Loader2, 
  AlertCircle, 
  Trash2, 
  CheckCircle2,
  Clock,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBedrockChat, ChatMessage, UseBedrockChatReturn } from '@/hooks/use-bedrock-chat';

/**
 * Component props
 */
interface BedrockChatInterfaceProps {
  /** User role for role-specific styling and features */
  role: 'guest' | 'manager' | 'housekeeping' | 'maintenance';
  /** Optional conversation ID to resume existing conversation */
  conversationId?: string;
  /** Optional CSS class name for styling */
  className?: string;
  /** Optional error handler callback */
  onError?: (error: Error) => void;
  /** Optional external hook for shared state management (enables debug integration) */
  externalHook?: UseBedrockChatReturn;
}

/**
 * Role-specific configuration
 */
const roleConfig = {
  guest: {
    title: 'Chat with Dewy',
    subtitle: 'Your AI assistant is here to help with your stay',
    icon: '🤖',
    placeholder: 'Ask me anything about your stay...',
    emptyStateMessage: "Hi there! I'm Dewy, your AI assistant. Ask me anything!",
    headerClass: 'bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950',
  },
  manager: {
    title: 'Manager AI Assistant',
    subtitle: 'Your intelligent operations assistant',
    icon: '💼',
    placeholder: 'Ask about operations, analytics, or management tasks...',
    emptyStateMessage: "Hello, Manager! I can help you with operations, analytics, and management tasks.",
    headerClass: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950',
  },
  housekeeping: {
    title: 'Housekeeping Assistant',
    subtitle: 'Your task management assistant',
    icon: '🧹',
    placeholder: 'Ask about your tasks, room status, or supplies...',
    emptyStateMessage: "Hi! I can help you manage your cleaning tasks and room status.",
    headerClass: 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950',
  },
  maintenance: {
    title: 'Maintenance Assistant',
    subtitle: 'Your work order assistant',
    icon: '🔧',
    placeholder: 'Ask about work orders, equipment, or repairs...',
    emptyStateMessage: "Hello! I can help you with work orders and maintenance tasks.",
    headerClass: 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950',
  },
};

/**
 * BedrockChatInterface Component
 */
export function BedrockChatInterface({
  role,
  conversationId: initialConversationId,
  className,
  onError,
  externalHook,
}: BedrockChatInterfaceProps) {
  const config = roleConfig[role];
  
  // Create internal hook only if external hook not provided
  const internalHook = useBedrockChat({
    conversationId: initialConversationId,
    onError,
  });
  
  // Use external hook if provided, otherwise use internal hook
  const hook = externalHook || internalHook;
  
  // Destructure values from the selected hook (external or internal)
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    isConnected,
    loadConversation,
  } = hook;

  // Refs for auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const userScrolledUpRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isAutoScrollingRef = useRef(false);

  // Message input state
  const [messageInput, setMessageInput] = React.useState('');

  // Load conversation when conversationId changes
  useEffect(() => {
    if (initialConversationId && loadConversation) {
      loadConversation(initialConversationId);
    }
  }, [initialConversationId, loadConversation]);

  // Track user scroll position
  const handleScroll = () => {
    // Ignore scroll events triggered by auto-scroll
    if (isAutoScrollingRef.current) {
      return;
    }

    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50; // 50px threshold
    userScrolledUpRef.current = !isAtBottom;
  };

  // Smart auto-scroll: only scroll if user is at bottom, with debouncing
  useEffect(() => {
    // Clear any pending scroll
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Debounce scroll updates during streaming
    scrollTimeoutRef.current = setTimeout(() => {
      const container = messagesContainerRef.current;
      if (!container) return;

      // Check if user is at bottom before scrolling
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

      // Only auto-scroll if user hasn't scrolled up or if already at bottom
      if (!userScrolledUpRef.current || isAtBottom) {
        isAutoScrollingRef.current = true;
        
        // Use scrollTop instead of scrollIntoView to avoid layout thrashing
        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
          // Reset flag after a short delay
          setTimeout(() => {
            isAutoScrollingRef.current = false;
          }, 100);
        });
      }
    }, 50); // 50ms debounce

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [messages, isLoading]);

  /**
   * Handle send message
   */
  const handleSend = async () => {
    if (messageInput.trim() && !isLoading) {
      // Reset scroll flag when sending a new message
      userScrolledUpRef.current = false;
      await sendMessage(messageInput.trim());
      setMessageInput('');
      // Refocus the textarea after sending
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  };

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * Handle clear conversation
   */
  const handleClear = () => {
    if (confirm('Are you sure you want to clear this conversation?')) {
      clearMessages();
    }
  };

  return (
    <Card className={cn('flex flex-col min-h-[700px]', className)}>
      {/* Header */}
      <CardHeader className={cn('border-b', config.headerClass)}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">{config.icon}</span>
            <div>
              <div className="text-xl">{config.title}</div>
              <p className="text-sm font-normal text-muted-foreground">
                {config.subtitle}
              </p>
            </div>
          </CardTitle>
          
          {/* Clear button */}
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={isLoading}
              aria-label="Clear conversation"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
        
        {/* Connection status indicator */}
        {isConnected && (
          <div className="flex items-center gap-2 text-xs text-green-600 mt-2">
            <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
            Streaming...
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages area */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-4"
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
        >
          {/* Empty state */}
          {messages.length === 0 && !isLoading && (
            <div className="flex items-center justify-center h-full text-center">
              <div className="space-y-2 max-w-md">
                <p className="text-lg font-medium">
                  <span aria-hidden="true">👋</span> {config.emptyStateMessage}
                </p>
                <p className="text-sm text-muted-foreground">
                  Start a conversation by typing a message below.
                </p>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} role={role} />
          ))}

          {/* Typing indicator */}
          {isLoading && messages.length > 0 && !messages[messages.length - 1]?.isStreaming && (
            <TypingIndicator icon={config.icon} />
          )}

          {/* Error display */}
          {error && (
            <div className="flex justify-center">
              <div className="max-w-[80%] rounded-lg px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <p className="text-sm">{error.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Auto-scroll anchor */}
          <div ref={messagesEndRef} aria-hidden="true" />
        </div>

        {/* Input area */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={config.placeholder}
              disabled={isLoading}
              className="min-h-[60px] max-h-[300px] resize-y"
              rows={2}
              aria-label="Chat message input"
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !messageInput.trim()}
              size="icon"
              className="h-[60px] w-[60px] shrink-0"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-5 w-5" aria-hidden="true" />
              )}
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * MessageBubble Component
 * Displays a single message with role-based styling
 */
interface MessageBubbleProps {
  message: ChatMessage;
  role: 'guest' | 'manager' | 'housekeeping' | 'maintenance';
}

function MessageBubble({ message, role }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;

  // Role-specific colors for user messages
  const userBgColors = {
    guest: 'bg-blue-600',
    manager: 'bg-indigo-600',
    housekeeping: 'bg-green-600',
    maintenance: 'bg-orange-600',
  };

  return (
    <div
      className={cn(
        'flex w-full',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-3 space-y-2',
          isUser
            ? cn(userBgColors[role], 'text-white')
            : 'bg-muted dark:bg-gray-800'
        )}
      >
        {/* Assistant header */}
        {!isUser && (
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">
              {roleConfig[role].icon}
            </span>
            <span className="text-xs font-medium">AI Assistant</span>
            {isStreaming && (
              <Badge variant="secondary" className="text-xs">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Typing...
              </Badge>
            )}
          </div>
        )}

        {/* Message content */}
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content || (isStreaming ? '' : 'Thinking...')}
        </p>

        {/* Tool use indicators */}
        {message.toolUses && message.toolUses.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-current/20">
            {message.toolUses.map((toolUse, index) => (
              <ToolUseIndicator key={index} toolUse={toolUse} />
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p
          className={cn(
            'text-xs',
            isUser ? 'text-white/70' : 'text-muted-foreground'
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

/**
 * ToolUseIndicator Component
 * Shows status of tool execution
 */
interface ToolUseIndicatorProps {
  toolUse: {
    toolName: string;
    status: 'pending' | 'complete' | 'error';
    result?: any;
  };
}

function ToolUseIndicator({ toolUse }: ToolUseIndicatorProps) {
  const statusConfig = {
    pending: {
      icon: Clock,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/30',
      label: 'Executing',
    },
    complete: {
      icon: CheckCircle2,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/30',
      label: 'Complete',
    },
    error: {
      icon: XCircle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/30',
      label: 'Failed',
    },
  };

  const config = statusConfig[toolUse.status];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-2 text-xs rounded px-2 py-1', config.bgColor)}>
      <Icon className={cn('h-3 w-3', config.color, toolUse.status === 'pending' && 'animate-spin')} />
      <span className={config.color}>
        {config.label}: <span className="font-mono">{toolUse.toolName}</span>
      </span>
    </div>
  );
}

/**
 * TypingIndicator Component
 * Shows animated typing indicator
 */
interface TypingIndicatorProps {
  icon: string;
}

function TypingIndicator({ icon }: TypingIndicatorProps) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-lg px-4 py-3 bg-muted dark:bg-gray-800">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg" aria-hidden="true">{icon}</span>
          <span className="text-xs font-medium">AI Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
}
