/**
 * Manager Chat Page
 * Chat interface with Manager AI assistant
 * 
 * Features:
 * - Bedrock streaming chat when available (Cognito + Identity Pool)
 * - Fallback to intent-based chat when Bedrock unavailable
 * - Automatic feature detection
 * 
 * Requirements: 2.1, 2.5, 15.4
 */

'use client';

import { useState, useEffect } from 'react';
import { ManagerChatInterface } from '@/components/manager/ManagerChatInterface';
import { BedrockChatInterfaceAuto } from '@/components/shared/BedrockChatInterfaceWithDebug';
import { ChatMessage } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useTokenRefresh } from '@/hooks/use-token-refresh';

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

export default function ManagerChatPage() {
  // State for intent-based chat (fallback)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // State for feature detection
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [bedrockEnabled, setBedrockEnabled] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  
  const { toast } = useToast();

  // Enable proactive token refresh to prevent session expiration
  useTokenRefresh({
    enabled: bedrockEnabled, // Only refresh when using Bedrock chat
    onRefreshError: (error) => {
      console.error('Token refresh failed:', error);
      // Session will be invalidated on next API call
    },
  });

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
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('/api/chat/config', {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
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
      
      // Check if it's a timeout/abort error
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Config check timed out');
        setConfigError('Chat service is not responding');
      } else {
        setConfigError('Unable to check AI chat availability');
      }
      
      setBedrockEnabled(false);
      
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
      const response = await fetch('/api/manager/chat');
      
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
      const response = await fetch('/api/manager/chat', {
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
          title: 'Service Request Created',
          description: 'The service request has been created successfully.',
        });
      } else if (data.action === 'maintenance_task_created') {
        toast({
          title: 'Maintenance Task Created',
          description: 'The maintenance task has been created and assigned.',
        });
      } else if (data.action === 'room_status_updated') {
        toast({
          title: 'Room Status Updated',
          description: 'The room status has been updated successfully.',
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
    
    // Check if error indicates session expiration
    const errorMessage = error.message || '';
    const isAuthError = 
      errorMessage.includes('session has expired') ||
      errorMessage.includes('Please log in again') ||
      errorMessage.includes('Failed to exchange ID token') ||
      errorMessage.toLowerCase().includes('authentication') ||
      errorMessage.toLowerCase().includes('unauthorized');
    
    if (isAuthError) {
      // Show clear message and redirect to login
      toast({
        title: 'Session Expired',
        description: 'Your session has expired. Redirecting to login...',
        variant: 'destructive',
      });
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } else {
      // Generic error
      toast({
        title: 'Chat Error',
        description: error.message || 'An error occurred in the chat',
        variant: 'destructive',
      });
    }
  };

  // Show loading state while checking configuration
  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center h-[700px]">
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
        <h1 className="text-3xl font-bold dark:text-gray-100">AI Assistant</h1>
        <p className="text-muted-foreground">
          Your intelligent assistant for hotel operations and management tasks
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
          role="manager"
          onError={handleBedrockError}
        />
      ) : (
        <ManagerChatInterface
          messages={messages}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
        />
      )}
    </div>
  );
}
