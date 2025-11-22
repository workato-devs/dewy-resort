/**
 * useBedrockChatDebug Hook
 * 
 * Extended version of useBedrockChat with debug event tracking.
 * Captures all API calls, SSE events, tool executions, and errors.
 * 
 * Only active when NEXT_PUBLIC_ENABLE_CHAT_DEBUG=true
 */

import { useState, useCallback, useRef } from 'react';
import { useBedrockChat, UseBedrockChatOptions, UseBedrockChatReturn } from './use-bedrock-chat';

/**
 * Debug event types
 */
export interface DebugEvent {
  id: string;
  timestamp: Date;
  type: 'api_call' | 'sse_event' | 'tool_execution' | 'error' | 'connection' | 'message';
  data: any;
  status?: 'pending' | 'success' | 'error';
}

/**
 * Extended return type with debug events
 */
export interface UseBedrockChatDebugReturn extends UseBedrockChatReturn {
  debugEvents: DebugEvent[];
  clearDebugEvents: () => void;
}

/**
 * Cache feature flag value to avoid repeated environment lookups
 * This ensures zero performance overhead when debug is disabled
 */
const DEBUG_ENABLED = process.env.NEXT_PUBLIC_ENABLE_CHAT_DEBUG === 'true';

/**
 * Check if debug mode is enabled (uses cached value)
 */
function isDebugEnabled(): boolean {
  return DEBUG_ENABLED;
}

/**
 * Maximum number of events to keep in the circular buffer
 */
const MAX_DEBUG_EVENTS = 200;

/**
 * useBedrockChatDebug Hook
 * 
 * Wraps useBedrockChat and adds debug event tracking.
 */
export function useBedrockChatDebug(
  options: UseBedrockChatOptions = {}
): UseBedrockChatDebugReturn {
  const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([]);
  const eventIdCounter = useRef(0);
  const toolExecutionStartTimes = useRef<Map<string, number>>(new Map());

  /**
   * Add a debug event with circular buffer logic
   * Early return when debug disabled ensures zero performance overhead
   */
  const addDebugEvent = useCallback((
    type: DebugEvent['type'],
    data: any,
    status?: DebugEvent['status']
  ) => {
    // Early return for zero overhead when debug disabled
    if (!isDebugEnabled()) return;

    const event: DebugEvent = {
      id: `event_${Date.now()}_${eventIdCounter.current++}`,
      timestamp: new Date(),
      type,
      data,
      status,
    };

    setDebugEvents(prev => {
      const updated = [...prev, event];
      // Implement circular buffer: keep only last 200 events
      return updated.length > MAX_DEBUG_EVENTS 
        ? updated.slice(-MAX_DEBUG_EVENTS) 
        : updated;
    });
  }, []);

  /**
   * Clear debug events only (not messages)
   */
  const clearDebugEvents = useCallback(() => {
    setDebugEvents([]);
    eventIdCounter.current = 0;
    toolExecutionStartTimes.current.clear();
  }, []);

  /**
   * SSE event callback - tracks all SSE events except individual tokens
   */
  const handleSSEEvent = useCallback((eventType: string, data: any) => {
    // Track message_start events with message metadata and model info
    if (eventType === 'message_start') {
      addDebugEvent('sse_event', {
        eventType: 'message_start',
        model: data.model,
        conversationId: data.conversationId,
        timestamp: data.timestamp,
      });
    }
    
    // Track tool_use_start events with tool name and parameters
    if (eventType === 'tool_use_start') {
      addDebugEvent('sse_event', {
        eventType: 'tool_use_start',
        toolName: data.toolName,
        input: data.input || {},
      });
      
      // Also add as tool_execution event for better visibility in Tools tab
      addDebugEvent('tool_execution', {
        toolName: data.toolName,
        input: data.input || {},
        phase: 'start',
      }, 'pending');
    }
    
    // Track tool_result events with tool output
    if (eventType === 'tool_result') {
      addDebugEvent('sse_event', {
        eventType: 'tool_result',
        toolName: data.toolName,
        result: data.result,
      });
    }
    
    // Track error events with error details
    if (eventType === 'error') {
      addDebugEvent('sse_event', {
        eventType: 'error',
        error: data.error,
      });
      
      // Also log as error event
      addDebugEvent('error', {
        message: data.error,
        context: 'sse_stream',
        errorType: 'SSE',
      }, 'error');
    }
    
    // Track done events
    if (eventType === 'done') {
      addDebugEvent('sse_event', {
        eventType: 'done',
        conversationId: data.conversationId,
      });
    }
  }, [addDebugEvent]);

  /**
   * Tool execution callback - tracks tool invocations, completions, and errors
   */
  const handleToolExecution = useCallback((
    toolName: string, 
    phase: 'start' | 'complete' | 'error', 
    data: any
  ) => {
    if (phase === 'start') {
      // Log tool invocation with tool name and input parameters
      toolExecutionStartTimes.current.set(toolName, Date.now());
      addDebugEvent('tool_execution', {
        toolName,
        input: data.input || {},
        phase: 'start',
      }, 'pending');
    } else if (phase === 'complete') {
      // Update existing pending tool execution event to success or error
      const startTime = toolExecutionStartTimes.current.get(toolName);
      const duration = startTime ? Date.now() - startTime : undefined;
      toolExecutionStartTimes.current.delete(toolName);
      
      // Check if the result indicates a failure (success: false in output)
      const isFailure = data.result?.success === false || data.result?.error;
      const finalStatus = isFailure ? 'error' : 'success';
      
      setDebugEvents(prev => {
        const updated = [...prev];
        // Find the most recent pending tool_execution event for this tool
        for (let i = updated.length - 1; i >= 0; i--) {
          if (
            updated[i].type === 'tool_execution' &&
            updated[i].data.toolName === toolName &&
            updated[i].status === 'pending'
          ) {
            // Update the existing event
            updated[i] = {
              ...updated[i],
              status: finalStatus,
              data: {
                ...updated[i].data,
                output: data.result,
                duration,
                phase: 'complete',
              },
            };
            break;
          }
        }
        return updated;
      });
      
      // If it's a failure, also log as error event
      if (isFailure) {
        addDebugEvent('error', {
          message: data.result?.error || 'Tool execution returned success: false',
          context: 'tool_execution',
          errorType: 'Tool',
          toolName,
        }, 'error');
      }
    } else if (phase === 'error') {
      // Update existing pending tool execution event to error
      const startTime = toolExecutionStartTimes.current.get(toolName);
      const duration = startTime ? Date.now() - startTime : undefined;
      toolExecutionStartTimes.current.delete(toolName);
      
      setDebugEvents(prev => {
        const updated = [...prev];
        // Find the most recent pending tool_execution event for this tool
        for (let i = updated.length - 1; i >= 0; i--) {
          if (
            updated[i].type === 'tool_execution' &&
            updated[i].data.toolName === toolName &&
            updated[i].status === 'pending'
          ) {
            // Update the existing event
            updated[i] = {
              ...updated[i],
              status: 'error',
              data: {
                ...updated[i].data,
                error: data.error,
                duration,
                phase: 'error',
              },
            };
            break;
          }
        }
        return updated;
      });
      
      // Also log as error event
      addDebugEvent('error', {
        message: data.error,
        context: 'tool_execution',
        errorType: 'Tool',
        toolName,
      }, 'error');
    }
  }, [addDebugEvent]);

  /**
   * Wrap the original onError to capture errors
   */
  const wrappedOnError = useCallback((error: Error) => {
    // Log errors with message, stack trace, and context
    // Categorize errors by type (API, SSE, Tool, Connection)
    addDebugEvent('error', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      context: 'chat_operation',
      errorType: 'general',
    }, 'error');

    if (options.onError) {
      options.onError(error);
    }
  }, [options, addDebugEvent]);

  // Use the underlying hook with event callbacks
  const chatHook = useBedrockChat({
    ...options,
    onError: wrappedOnError,
    onSSEEvent: handleSSEEvent,
    onToolExecution: handleToolExecution,
  });

  /**
   * Wrap sendMessage to add API call tracking
   */
  const wrappedSendMessage = useCallback(async (content: string) => {
    if (!content.trim()) {
      return;
    }

    const apiCallId = `api_${Date.now()}`;
    let eventId: string | null = null;

    // Log API call start event before calling underlying sendMessage
    if (isDebugEnabled()) {
      const event: DebugEvent = {
        id: `event_${Date.now()}_${eventIdCounter.current++}`,
        timestamp: new Date(),
        type: 'api_call',
        data: {
          id: apiCallId,
          endpoint: '/api/chat/stream',
          method: 'POST',
          payload: {
            message: content,
            conversationId: chatHook.conversationId,
          },
        },
        status: 'pending',
      };
      eventId = event.id;
      
      setDebugEvents(prev => {
        const updated = [...prev, event];
        return updated.length > MAX_DEBUG_EVENTS 
          ? updated.slice(-MAX_DEBUG_EVENTS) 
          : updated;
      });
    }

    // Log user message
    addDebugEvent('message', {
      role: 'user',
      content,
    });

    try {
      // Delegate actual API call to underlying hook
      await chatHook.sendMessage(content);
      
      // Update API call event to success
      if (eventId) {
        setDebugEvents(prev => {
          const updated = [...prev];
          const index = updated.findIndex(e => e.id === eventId);
          if (index !== -1) {
            updated[index] = {
              ...updated[index],
              status: 'success',
              data: {
                ...updated[index].data,
                status: 'completed',
              },
            };
          }
          return updated;
        });
      }
      
    } catch (error) {
      // Update API call event to error
      const err = error instanceof Error ? error : new Error('Unknown error');
      if (eventId) {
        setDebugEvents(prev => {
          const updated = [...prev];
          const index = updated.findIndex(e => e.id === eventId);
          if (index !== -1) {
            updated[index] = {
              ...updated[index],
              status: 'error',
              data: {
                ...updated[index].data,
                error: err.message,
              },
            };
          }
          return updated;
        });
      }
      
      throw error;
    }
  }, [chatHook, addDebugEvent]);

  /**
   * Wrap loadConversation to add debug tracking
   */
  const wrappedLoadConversation = useCallback(async (conversationId: string) => {
    const apiCallId = `api_${Date.now()}`;
    let eventId: string | null = null;

    // Log API call start event
    if (isDebugEnabled()) {
      const event: DebugEvent = {
        id: `event_${Date.now()}_${eventIdCounter.current++}`,
        timestamp: new Date(),
        type: 'api_call',
        data: {
          id: apiCallId,
          endpoint: `/api/conversations/${conversationId}`,
          method: 'GET',
          action: 'load_conversation',
        },
        status: 'pending',
      };
      eventId = event.id;
      
      setDebugEvents(prev => {
        const updated = [...prev, event];
        return updated.length > MAX_DEBUG_EVENTS 
          ? updated.slice(-MAX_DEBUG_EVENTS) 
          : updated;
      });
    }

    try {
      await chatHook.loadConversation(conversationId);
      
      // Update API call event to success
      if (eventId) {
        setDebugEvents(prev => {
          const updated = [...prev];
          const index = updated.findIndex(e => e.id === eventId);
          if (index !== -1) {
            updated[index] = {
              ...updated[index],
              status: 'success',
              data: {
                ...updated[index].data,
                status: 'completed',
              },
            };
          }
          return updated;
        });
      }
    } catch (error) {
      // Update API call event to error
      const err = error instanceof Error ? error : new Error('Unknown error');
      if (eventId) {
        setDebugEvents(prev => {
          const updated = [...prev];
          const index = updated.findIndex(e => e.id === eventId);
          if (index !== -1) {
            updated[index] = {
              ...updated[index],
              status: 'error',
              data: {
                ...updated[index].data,
                error: err.message,
              },
            };
          }
          return updated;
        });
      }
      
      throw error;
    }
  }, [chatHook, addDebugEvent]);

  return {
    // Pass through all values from underlying hook (including messages)
    ...chatHook,
    // Override with wrapped functions
    sendMessage: wrappedSendMessage,
    loadConversation: wrappedLoadConversation,
    // Add debug-specific returns
    debugEvents,
    clearDebugEvents,
  };
}


