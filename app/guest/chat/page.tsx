/**
 * Guest Chat Page
 * Chat interface with Dewy AI assistant
 * 
 * Features:
 * - Bedrock streaming chat when available (Cognito + Identity Pool)
 * - Fallback to intent-based chat when Bedrock unavailable
 * - Automatic feature detection
 * 
 * Requirements: 1.1, 1.5, 15.4
 */

'use client';

import { useState, useEffect } from 'react';
import { ChatInterface } from '@/components/guest/ChatInterface';
import { BedrockChatInterfaceAuto } from '@/components/shared/BedrockChatInterfaceWithDebug';
import { ChatMessage } from '@/types';
import { useToast } from '@/hooks/use-toast';

/**
 * Chat configuration from API
 */
interface ChatConfig {
  enabled: boolean;
  reason?: string;
  features: {
    streaming: boolean;
    tools: boolean;
  };
}

export default function ChatPage() {
  // State for intent-based chat (fallback)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // State for feature detection
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [bedrockEnabled, setBedrockEnabled] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  
  const { toast } = useToast();

  // Check Bedrock availability on mount
  useEffect(() => {
    checkBedrockAvailability();
  }, []);

  /**
   * Check if Bedrock chat is available
   * Requirements: 15.1, 15.2, 15.3, 15.4
   */
  const checkBedrockAvailability = async () => {
    try {
      const response = await fetch('/api/chat/config');
      
      if (!response.ok) {
        throw new Error('Failed to check chat configuration');
      }

      const config: ChatConfig = await response.json();
      
      setBedrockEnabled(config.enabled);
      
      if (!config.enabled && config.reason) {
        setConfigError(config.reason);
        console.info('Bedrock chat not available:', config.reason);
      }
      
      // If Bedrock is not available, load intent-based chat history
      if (!config.enabled) {
        await loadMessages();
      }
    } catch (error) {
      console.error('Error checking Bedrock availability:', error);
      setBedrockEnabled(false);
      setConfigError('Unable to check AI chat availability');
      
      // Fall back to intent-based chat
      await loadMessages();
    } finally {
      setIsInitialLoading(false);
    }
  };

  /**
   * Load message history for intent-based chat (fallback)
   */
  const loadMessages = async () => {
    try {
      const response = await fetch('/api/guest/chat');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to load messages');
      }

      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load chat history',
        variant: 'destructive',
      });
    }
  };

  /**
   * Handle sending message in intent-based chat (fallback)
   */
  const handleSendMessage = async (content: string) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/guest/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to send message');
      }

      const data = await response.json();
      
      // Add both user message and AI response to the chat
      setMessages((prev) => [
        ...prev,
        data.userMessage,
        data.assistantMessage,
      ]);

      // Show success toast for certain actions
      if (data.action === 'service_request_created') {
        toast({
          title: 'Request Submitted',
          description: 'Your service request has been created successfully.',
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle errors from Bedrock chat
   */
  const handleBedrockError = (error: Error) => {
    console.error('Bedrock chat error:', error);
    toast({
      title: 'Chat Error',
      description: error.message || 'An error occurred in the chat',
      variant: 'destructive',
    });
  };

  // Show loading state while checking configuration
  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Chat with Dewy</h1>
        <p className="text-muted-foreground">
          Your AI assistant is here to help with anything you need during your stay
        </p>
        
        {/* Show info message if using fallback chat */}
        {!bedrockEnabled && configError && (
          <p className="text-sm text-muted-foreground mt-2">
            Note: {configError}. Using standard chat mode.
          </p>
        )}
      </div>

      {/* Render Bedrock chat if available, otherwise fallback to intent-based chat */}
      {bedrockEnabled ? (
        <BedrockChatInterfaceAuto
          role="guest"
          onError={handleBedrockError}
        />
      ) : (
        <ChatInterface
          messages={messages}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
        />
      )}
    </div>
  );
}
