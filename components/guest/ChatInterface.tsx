/**
 * ChatInterface Component
 * Main chat interface for Dewy AI assistant
 */

'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatMessage } from '@/types';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (content: string) => void;
}

export function ChatInterface({ messages, isLoading, onSendMessage }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          Chat with Dewy
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Your AI assistant is here to help with your stay
        </p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages area */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-4"
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
        >
          {messages.length === 0 && !isLoading && (
            <div className="flex items-center justify-center h-full text-center">
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  <span aria-hidden="true">👋</span> Hi there!
                </p>
                <p className="text-sm text-muted-foreground">
                  I&apos;m Dewy, your AI assistant. Ask me anything!
                </p>
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          
          {isLoading && <TypingIndicator />}
          
          <div ref={messagesEndRef} aria-hidden="true" />
        </div>

        {/* Input area */}
        <div className="border-t p-4">
          <MessageInput onSend={onSendMessage} disabled={isLoading} />
        </div>
      </CardContent>
    </Card>
  );
}
