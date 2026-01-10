/**
 * ManagerChatInterface Component
 * Chat interface for Manager AI assistant
 */

'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatMessage } from '@/types';
import { ManagerMessageBubble } from '@/components/manager/ManagerMessageBubble';
import { MessageInput } from '@/components/guest/MessageInput';
import { TypingIndicator } from '@/components/guest/TypingIndicator';
import { Button } from '@/components/ui/button';

interface ManagerChatInterfaceProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (content: string) => void;
}

export function ManagerChatInterface({ 
  messages, 
  isLoading, 
  onSendMessage 
}: ManagerChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Quick action buttons for common tasks
  const quickActions = [
    { label: 'Room Status', message: 'Show me room status overview' },
    { label: 'Pending Tasks', message: 'Show me pending maintenance tasks' },
    { label: 'Service Requests', message: 'Show me active service requests' },
  ];

  const handleQuickAction = (message: string) => {
    if (!isLoading) {
      onSendMessage(message);
    }
  };

  return (
    <Card className="flex flex-col h-[700px]">
      <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <div>
            <div className="text-xl">Manager AI Assistant</div>
            <p className="text-sm font-normal text-muted-foreground">
              Your intelligent operations assistant
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="space-y-2">
                <p className="text-lg font-medium">👋 Hello, Manager!</p>
                <p className="text-sm text-muted-foreground max-w-md">
                  I&apos;m your AI assistant for hotel operations. I can help you create service requests, 
                  manage maintenance tasks, check room status, and more!
                </p>
              </div>
              
              {/* Quick action buttons */}
              <div className="flex flex-wrap gap-2 justify-center pt-4">
                {quickActions.map((action) => (
                  <Button
                    key={action.label}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAction(action.message)}
                    disabled={isLoading}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <ManagerMessageBubble key={message.id} message={message} />
          ))}
          
          {isLoading && <TypingIndicator />}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick actions bar (shown when there are messages) */}
        {messages.length > 0 && (
          <div className="border-t px-4 py-2 bg-muted/30">
            <div className="flex gap-2 overflow-x-auto">
              <span className="text-xs text-muted-foreground self-center whitespace-nowrap">
                Quick:
              </span>
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleQuickAction(action.message)}
                  disabled={isLoading}
                  className="text-xs"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="border-t p-4">
          <MessageInput 
            onSend={onSendMessage} 
            disabled={isLoading}
            placeholder="Ask me to create tasks, check status, or manage operations..."
          />
        </div>
      </CardContent>
    </Card>
  );
}
