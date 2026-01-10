/**
 * ChatDebugPanel Component
 * 
 * Debug panel for chat interfaces that displays:
 * - Message history with full details
 * - API call information
 * - Streaming events
 * - Tool execution details
 * - Connection status
 * - Error logs
 * 
 * Enabled via NEXT_PUBLIC_ENABLE_CHAT_DEBUG=true
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChevronRight,
  ChevronDown,
  Bug,
  MessageSquare,
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
 * Props
 */
interface ChatDebugPanelProps {
  events: DebugEvent[];
  messages: any[];
  conversationId: string | null;
  isConnected: boolean;
  onClear?: () => void;
  className?: string;
}

/**
 * ChatDebugPanel Component
 */
export function ChatDebugPanel({
  events,
  messages,
  conversationId,
  isConnected,
  onClear,
  className,
}: ChatDebugPanelProps) {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  // Auto-expand error events
  React.useEffect(() => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      events.forEach(event => {
        if (event.status === 'error' && !next.has(event.id)) {
          next.add(event.id);
        }
      });
      return next;
    });
  }, [events]);

  const toggleEvent = (eventId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedEvents(new Set(events.map(e => e.id)));
  };

  const collapseAll = () => {
    setExpandedEvents(new Set());
  };

  // Filter events by type - memoized to prevent unnecessary recalculations
  const apiCalls = React.useMemo(() => events.filter(e => e.type === 'api_call'), [events]);
  const sseEvents = React.useMemo(() => events.filter(e => e.type === 'sse_event'), [events]);
  const toolEvents = React.useMemo(() => events.filter(e => e.type === 'tool_execution'), [events]);
  const errorEvents = React.useMemo(() => events.filter(e => e.type === 'error'), [events]);
  const connectionEvents = React.useMemo(() => events.filter(e => e.type === 'connection'), [events]);

  // Extract model info from message_start event
  const modelInfo = React.useMemo(() => {
    const messageStartEvent = sseEvents.find(e => e.data?.eventType === 'message_start');
    return messageStartEvent?.data?.model || null;
  }, [sseEvents]);

  return (
    <Card className={cn('flex flex-col min-h-[700px]', className)}>
      <CardHeader className="border-b bg-slate-50 dark:bg-slate-900 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bug className="h-5 w-5 text-orange-600" />
            Chat Debug Panel
          </CardTitle>
          <div className="flex items-center gap-2">
            {isConnected && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse mr-2" />
                Connected
              </Badge>
            )}
            {onClear && (
              <Button variant="ghost" size="sm" onClick={onClear}>
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
        
        {/* Conversation info */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
          <div>
            <span className="font-medium">Conversation:</span>{' '}
            {conversationId || 'None'}
          </div>
          <div>
            <span className="font-medium">Messages:</span> {messages.length}
          </div>
          <div>
            <span className="font-medium">Events:</span> {events.length}
          </div>
          {modelInfo && (
            <div>
              <span className="font-medium">Model:</span>{' '}
              <span className="font-mono text-blue-600">{modelInfo}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <Tabs defaultValue="events" className="h-full flex flex-col">
          <div className="overflow-x-auto flex-shrink-0">
            <TabsList className="w-full justify-start rounded-none border-b px-4 flex-nowrap">
              <TabsTrigger value="events" className="gap-2 flex-shrink-0">
                <Activity className="h-4 w-4" />
                Events ({events.length})
              </TabsTrigger>
              <TabsTrigger value="messages" className="gap-2 flex-shrink-0">
                <MessageSquare className="h-4 w-4" />
                Messages ({messages.length})
              </TabsTrigger>
              <TabsTrigger value="api" className="gap-2 flex-shrink-0">
                API ({apiCalls.length})
              </TabsTrigger>
              <TabsTrigger value="sse" className="gap-2 flex-shrink-0">
                SSE ({sseEvents.length})
              </TabsTrigger>
              <TabsTrigger value="tools" className="gap-2 flex-shrink-0">
                Tools ({toolEvents.length})
              </TabsTrigger>
              <TabsTrigger value="errors" className="gap-2 flex-shrink-0">
                <AlertCircle className="h-4 w-4" />
                Errors ({errorEvents.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* All Events Tab */}
          <TabsContent value="events" className="flex-1 m-0">
            <div className="h-full overflow-y-auto">
              <div className="p-4 space-y-2">
                <div className="flex gap-2 mb-4">
                  <Button variant="outline" size="sm" onClick={expandAll}>
                    Expand All
                  </Button>
                  <Button variant="outline" size="sm" onClick={collapseAll}>
                    Collapse All
                  </Button>
                </div>
                {events.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No events yet
                  </div>
                ) : (
                  events.map(event => (
                    <DebugEventItem
                      key={event.id}
                      event={event}
                      isExpanded={expandedEvents.has(event.id)}
                      onToggle={() => toggleEvent(event.id)}
                    />
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="flex-1 m-0">
            <div className="h-full overflow-y-auto">
              <div className="p-4 space-y-2">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No messages yet
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <MessageDebugItem key={message.id || index} message={message} />
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* API Calls Tab */}
          <TabsContent value="api" className="flex-1 m-0">
            <div className="h-full overflow-y-auto">
              <div className="p-4 space-y-2">
                {apiCalls.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No API calls yet
                  </div>
                ) : (
                  apiCalls.map(event => (
                    <DebugEventItem
                      key={event.id}
                      event={event}
                      isExpanded={expandedEvents.has(event.id)}
                      onToggle={() => toggleEvent(event.id)}
                    />
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* SSE Events Tab */}
          <TabsContent value="sse" className="flex-1 m-0">
            <div className="h-full overflow-y-auto">
              <div className="p-4 space-y-2">
                {sseEvents.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No SSE events yet
                  </div>
                ) : (
                  sseEvents.map(event => (
                    <DebugEventItem
                      key={event.id}
                      event={event}
                      isExpanded={expandedEvents.has(event.id)}
                      onToggle={() => toggleEvent(event.id)}
                    />
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tool Executions Tab */}
          <TabsContent value="tools" className="flex-1 m-0">
            <div className="h-full overflow-y-auto">
              <div className="p-4 space-y-2">
                {toolEvents.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No tool executions yet
                  </div>
                ) : (
                  toolEvents.map(event => (
                    <DebugEventItem
                      key={event.id}
                      event={event}
                      isExpanded={expandedEvents.has(event.id)}
                      onToggle={() => toggleEvent(event.id)}
                    />
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* Errors Tab */}
          <TabsContent value="errors" className="flex-1 m-0">
            <div className="h-full overflow-y-auto">
              <div className="p-4 space-y-2">
                {errorEvents.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No errors
                  </div>
                ) : (
                  errorEvents.map(event => (
                    <DebugEventItem
                      key={event.id}
                      event={event}
                      isExpanded={expandedEvents.has(event.id)}
                      onToggle={() => toggleEvent(event.id)}
                    />
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

/**
 * DebugEventItem Component
 */
interface DebugEventItemProps {
  event: DebugEvent;
  isExpanded: boolean;
  onToggle: () => void;
}

function DebugEventItem({ event, isExpanded, onToggle }: DebugEventItemProps) {
  const getEventIcon = () => {
    switch (event.type) {
      case 'api_call':
        return <Activity className="h-4 w-4" />;
      case 'sse_event':
        return <MessageSquare className="h-4 w-4" />;
      case 'tool_execution':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      case 'connection':
        return <Clock className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusBadge = () => {
    if (!event.status) return null;
    
    const config = {
      pending: { color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300', icon: Clock },
      success: { color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300', icon: CheckCircle2 },
      error: { color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300', icon: XCircle },
    };
    
    const { color, icon: Icon } = config[event.status];
    
    return (
      <Badge variant="outline" className={cn('text-xs', color)}>
        <Icon className="h-3 w-3 mr-1" />
        {event.status}
      </Badge>
    );
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
        )}
        {getEventIcon()}
        <span className="text-sm font-medium flex-1">{event.type}</span>
        {getStatusBadge()}
        <span className="text-xs text-muted-foreground">
          {event.timestamp.toLocaleTimeString()}
        </span>
      </button>
      
      {isExpanded && (
        <div className="border-t bg-slate-50 dark:bg-slate-900 p-3 overflow-hidden">
          <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words font-mono">
            {JSON.stringify(event.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

/**
 * MessageDebugItem Component
 */
interface MessageDebugItemProps {
  message: any;
}

function MessageDebugItem({ message }: MessageDebugItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
        )}
        <Badge variant={message.role === 'user' ? 'default' : 'secondary'}>
          {message.role}
        </Badge>
        <span className="text-sm flex-1 truncate">{message.content}</span>
        <span className="text-xs text-muted-foreground">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </button>
      
      {isExpanded && (
        <div className="border-t bg-slate-50 dark:bg-slate-900 p-3 space-y-2 overflow-hidden">
          <div className="text-xs">
            <span className="font-medium">ID:</span> {message.id}
          </div>
          <div className="text-xs">
            <span className="font-medium">Content:</span>
            <pre className="mt-1 whitespace-pre-wrap break-words font-mono">{message.content}</pre>
          </div>
          {message.toolUses && message.toolUses.length > 0 && (
            <div className="text-xs">
              <span className="font-medium">Tool Uses:</span>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words font-mono">
                {JSON.stringify(message.toolUses, null, 2)}
              </pre>
            </div>
          )}
          {message.isStreaming !== undefined && (
            <div className="text-xs">
              <span className="font-medium">Streaming:</span> {message.isStreaming ? 'Yes' : 'No'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
