/**
 * useBedrockChat Hook
 * 
 * React hook for managing streaming chat with Amazon Bedrock.
 * Handles EventSource connection, message state, streaming tokens,
 * tool use tracking, error handling, and connection cleanup.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useApiError } from './use-api-error';

/**
 * Chat message interface
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  toolUses?: Array<{
    toolName: string;
    status: 'pending' | 'complete' | 'error';
    result?: any;
  }>;
}

/**
 * Hook options
 */
export interface UseBedrockChatOptions {
  conversationId?: string;
  onError?: (error: Error) => void;
  autoReconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  onSSEEvent?: (eventType: string, data: any) => void;
  onToolExecution?: (toolName: string, phase: 'start' | 'complete' | 'error', data: any) => void;
}

/**
 * Hook return value
 */
export interface UseBedrockChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: Error | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  conversationId: string | null;
  isConnected: boolean;
  cancelStream: () => void;
  loadConversation: (conversationId: string) => Promise<void>;
}

/**
 * SSE event types from the API
 */
interface SSETokenEvent {
  type: 'token';
  content: string;
}

interface SSEToolUseEvent {
  type: 'tool_use_start';
  toolName: string;
  input?: any;
}

interface SSEToolResultEvent {
  type: 'tool_result';
  toolName: string;
  result: any;
}

interface SSEToolErrorEvent {
  type: 'tool_error';
  toolName: string;
  error: string;
}

interface SSEDoneEvent {
  type: 'done';
  conversationId: string;
}

interface SSEErrorEvent {
  type: 'error';
  error: string;
}

type SSEEvent = SSETokenEvent | SSEToolUseEvent | SSEToolResultEvent | SSEToolErrorEvent | SSEDoneEvent | SSEErrorEvent;

/**
 * useBedrockChat Hook
 * 
 * Manages streaming chat with Amazon Bedrock via Server-Sent Events.
 * 
 * @param options - Configuration options
 * @returns Chat state and control functions
 */
export function useBedrockChat(
  options: UseBedrockChatOptions = {}
): UseBedrockChatReturn {
  const {
    conversationId: initialConversationId,
    onError,
    autoReconnect = false,
    reconnectDelay = 2000,
    maxReconnectAttempts = 3,
    onSSEEvent,
    onToolExecution,
  } = options;

  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null);
  const [isConnected, setIsConnected] = useState(false);

  // Refs for managing EventSource and streaming state
  const eventSourceRef = useRef<EventSource | null>(null);
  const currentMessageRef = useRef<ChatMessage | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Error handling
  const { handleError: showErrorToast } = useApiError();

  /**
   * Close EventSource connection
   */
  const closeConnection = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsConnected(false);
  }, []);

  /**
   * Cancel ongoing stream
   */
  const cancelStream = useCallback(() => {
    closeConnection();
    setIsLoading(false);
    
    // Mark current streaming message as complete
    if (currentMessageRef.current) {
      setMessages(prev => {
        const updated = [...prev];
        const lastMessage = updated[updated.length - 1];
        if (lastMessage && lastMessage.isStreaming) {
          lastMessage.isStreaming = false;
        }
        return updated;
      });
      currentMessageRef.current = null;
    }
  }, [closeConnection]);

  /**
   * Handle SSE events
   */
  const handleSSEEvent = useCallback((event: MessageEvent, eventType: string) => {
    try {
      const data: SSEEvent = JSON.parse(event.data);

      // Call onSSEEvent callback for all events except individual tokens
      if (onSSEEvent && data.type !== 'token') {
        onSSEEvent(data.type, data);
      }

      switch (data.type) {
        case 'token':
          // Append token to current streaming message
          if (currentMessageRef.current) {
            currentMessageRef.current.content += data.content;
            setMessages(prev => {
              const updated = [...prev];
              const lastMessage = updated[updated.length - 1];
              if (lastMessage && lastMessage.id === currentMessageRef.current?.id) {
                lastMessage.content = currentMessageRef.current.content;
              }
              return updated;
            });
          }
          break;

        case 'tool_use_start':
          // Call onToolExecution callback for tool start
          if (onToolExecution) {
            onToolExecution(data.toolName, 'start', { 
              toolName: data.toolName,
              input: data.input || {}
            });
          }
          
          // Add tool use to current message
          if (currentMessageRef.current) {
            if (!currentMessageRef.current.toolUses) {
              currentMessageRef.current.toolUses = [];
            }
            currentMessageRef.current.toolUses.push({
              toolName: data.toolName,
              status: 'pending',
            });
            setMessages(prev => {
              const updated = [...prev];
              const lastMessage = updated[updated.length - 1];
              if (lastMessage && lastMessage.id === currentMessageRef.current?.id) {
                lastMessage.toolUses = [...(currentMessageRef.current.toolUses || [])];
              }
              return updated;
            });
          }
          break;

        case 'tool_result':
          // Call onToolExecution callback for tool complete
          if (onToolExecution) {
            onToolExecution(data.toolName, 'complete', { 
              toolName: data.toolName, 
              result: data.result 
            });
          }
          
          // Update tool use status to complete
          if (currentMessageRef.current?.toolUses) {
            const toolUse = currentMessageRef.current.toolUses.find(
              t => t.toolName === data.toolName && t.status === 'pending'
            );
            if (toolUse) {
              toolUse.status = 'complete';
              toolUse.result = data.result;
              setMessages(prev => {
                const updated = [...prev];
                const lastMessage = updated[updated.length - 1];
                if (lastMessage && lastMessage.id === currentMessageRef.current?.id) {
                  lastMessage.toolUses = [...(currentMessageRef.current.toolUses || [])];
                }
                return updated;
              });
            }
          }
          break;

        case 'tool_error':
          // Call onToolExecution callback for tool error
          if (onToolExecution) {
            onToolExecution(data.toolName, 'error', { 
              toolName: data.toolName, 
              error: data.error 
            });
          }
          
          // Update tool use status to error
          if (currentMessageRef.current?.toolUses) {
            const toolUse = currentMessageRef.current.toolUses.find(
              t => t.toolName === data.toolName && t.status === 'pending'
            );
            if (toolUse) {
              toolUse.status = 'error';
              setMessages(prev => {
                const updated = [...prev];
                const lastMessage = updated[updated.length - 1];
                if (lastMessage && lastMessage.id === currentMessageRef.current?.id) {
                  lastMessage.toolUses = [...(currentMessageRef.current.toolUses || [])];
                }
                return updated;
              });
            }
          }
          break;

        case 'done':
          // Stream complete - don't close connection here, let the stream end naturally
          if (currentMessageRef.current) {
            currentMessageRef.current.isStreaming = false;
            setMessages(prev => {
              const updated = [...prev];
              const lastMessage = updated[updated.length - 1];
              if (lastMessage && lastMessage.id === currentMessageRef.current?.id) {
                lastMessage.isStreaming = false;
              }
              return updated;
            });
          }
          setConversationId(data.conversationId);
          setIsLoading(false);
          // Don't call closeConnection() here - the stream will close naturally when done
          currentMessageRef.current = null;
          reconnectAttemptsRef.current = 0;
          break;

        case 'error':
          // Stream error
          const streamError = new Error(data.error);
          setError(streamError);
          setIsLoading(false);
          closeConnection();
          currentMessageRef.current = null;
          
          if (onError) {
            onError(streamError);
          } else {
            showErrorToast(streamError);
          }
          break;
      }
    } catch (err) {
      console.error('Failed to parse SSE event:', err);
    }
  }, [closeConnection, onError, showErrorToast, onSSEEvent, onToolExecution]);

  /**
   * Handle connection errors
   */
  const handleConnectionError = useCallback((err: Event) => {
    console.error('EventSource connection error:', err);
    
    const connectionError = new Error('Connection lost. Please try again.');
    setError(connectionError);
    
    closeConnection();
    
    // Attempt reconnection if enabled
    if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
      reconnectAttemptsRef.current++;
      reconnectTimeoutRef.current = setTimeout(() => {
        // Retry last message if we have one
        if (currentMessageRef.current) {
          const lastUserMessage = messages.find(m => m.role === 'user');
          if (lastUserMessage) {
            // Will be handled by sendMessage retry logic
          }
        }
      }, reconnectDelay);
    } else {
      setIsLoading(false);
      if (currentMessageRef.current) {
        currentMessageRef.current.isStreaming = false;
        setMessages(prev => {
          const updated = [...prev];
          const lastMessage = updated[updated.length - 1];
          if (lastMessage && lastMessage.isStreaming) {
            lastMessage.isStreaming = false;
          }
          return updated;
        });
        currentMessageRef.current = null;
      }
      
      if (onError) {
        onError(connectionError);
      } else {
        showErrorToast(connectionError);
      }
    }
  }, [autoReconnect, maxReconnectAttempts, reconnectDelay, closeConnection, messages, onError, showErrorToast]);

  /**
   * Send a message and start streaming response
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) {
      return;
    }

    // Prevent sending while already loading
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    // Add user message to UI
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Create assistant message placeholder for streaming
    const assistantMessage: ChatMessage = {
      id: `msg_${Date.now()}_assistant`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages(prev => [...prev, assistantMessage]);
    currentMessageRef.current = assistantMessage;

    try {
      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      // Make POST request to start streaming
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content.trim(),
          conversationId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Check if response is SSE
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('text/event-stream')) {
        throw new Error('Expected Server-Sent Events response');
      }

      // Create EventSource-like reader from fetch response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body not readable');
      }

      setIsConnected(true);
      const decoder = new TextDecoder();
      let buffer = '';

      // Read stream
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        let currentData = '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.substring(6).trim();
          } else if (line.startsWith('data:')) {
            currentData = line.substring(5).trim();
          } else if (line === '' && currentData) {
            // End of event, process it
            handleSSEEvent(
              { data: currentData } as MessageEvent,
              currentEvent
            );
            currentEvent = '';
            currentData = '';
          }
        }
      }

      // Stream ended naturally, clean up
      setIsConnected(false);
      if (abortControllerRef.current) {
        abortControllerRef.current = null;
      }
      
    } catch (err) {
      console.error('Send message error:', err);
      
      // Remove the streaming assistant message on error
      setMessages(prev => prev.filter(m => m.id !== assistantMessage.id));
      currentMessageRef.current = null;
      
      const sendError = err instanceof Error ? err : new Error('Failed to send message');
      setError(sendError);
      setIsLoading(false);
      setIsConnected(false);
      
      if (onError) {
        onError(sendError);
      } else {
        showErrorToast(sendError);
      }
    }
  }, [isLoading, conversationId, handleSSEEvent, onError, showErrorToast]);

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    cancelStream();
    setMessages([]);
    setConversationId(null);
    setError(null);
    currentMessageRef.current = null;
  }, [cancelStream]);

  /**
   * Load an existing conversation by ID
   * 
   * Requirement 12.4: Load past conversation into chat interface
   */
  const loadConversation = useCallback(async (convId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch conversation from API
      const response = await fetch(`/api/conversations/${convId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to load conversation');
      }

      const data = await response.json();

      // Set conversation ID
      setConversationId(data.conversationId);

      // Transform and load messages into state
      const loadedMessages: ChatMessage[] = data.messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        toolUses: msg.toolUses,
      }));

      setMessages(loadedMessages);
      setIsLoading(false);

    } catch (err) {
      console.error('Load conversation error:', err);
      
      const loadError = err instanceof Error ? err : new Error('Failed to load conversation');
      setError(loadError);
      setIsLoading(false);
      
      if (onError) {
        onError(loadError);
      } else {
        showErrorToast(loadError);
      }
    }
  }, [onError, showErrorToast]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      closeConnection();
    };
  }, [closeConnection]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    conversationId,
    isConnected,
    cancelStream,
    loadConversation,
  };
}
