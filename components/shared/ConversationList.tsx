/**
 * ConversationList Component
 * 
 * Displays a list of past conversations with metadata.
 * Allows users to select and load past conversations.
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.6
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Search, Clock, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * Conversation metadata
 */
export interface ConversationMetadata {
  conversationId: string;
  userId: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage: string;
  lastMessagePreview: string;
}

/**
 * ConversationList props
 */
export interface ConversationListProps {
  onSelectConversation: (conversationId: string) => void;
  currentConversationId?: string | null;
  className?: string;
}

/**
 * Format timestamp to relative time
 */
function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * ConversationList Component
 */
export function ConversationList({
  onSelectConversation,
  currentConversationId,
  className = '',
}: ConversationListProps) {
  const [conversations, setConversations] = useState<ConversationMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  /**
   * Fetch conversations from API
   */
  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/conversations?limit=50');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to load conversations');
      }

      const data = await response.json();
      setConversations(data.conversations || []);
      
    } catch (err) {
      console.error('Error fetching conversations:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load conversations';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  /**
   * Filter conversations by search query
   */
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery.trim()) {
      return true;
    }
    
    const query = searchQuery.toLowerCase();
    return (
      conv.lastMessage.toLowerCase().includes(query) ||
      conv.conversationId.toLowerCase().includes(query)
    );
  });

  /**
   * Handle conversation selection
   */
  const handleSelectConversation = (conversationId: string) => {
    onSelectConversation(conversationId);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Past Conversations
        </CardTitle>
        <CardDescription>
          Load and continue previous chat sessions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and refresh */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchConversations}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Loading state */}
        {isLoading && conversations.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground">Loading conversations...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="text-center py-8">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchConversations}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && conversations.length === 0 && (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No conversations yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start a new conversation to see it here
            </p>
          </div>
        )}

        {/* Conversation list */}
        {!isLoading && !error && filteredConversations.length > 0 && (
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {filteredConversations.map((conv) => (
              <Card
                key={conv.conversationId}
                className={`cursor-pointer transition-colors hover:bg-accent ${
                  currentConversationId === conv.conversationId
                    ? 'border-primary bg-accent'
                    : ''
                }`}
                onClick={() => handleSelectConversation(conv.conversationId)}
              >
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {/* Header with timestamp and message count */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(conv.updatedAt)}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {conv.messageCount} message{conv.messageCount !== 1 ? 's' : ''}
                      </Badge>
                    </div>

                    {/* Last message preview */}
                    <p className="text-sm line-clamp-2">
                      {conv.lastMessagePreview || 'No messages'}
                    </p>

                    {/* Role badge */}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {conv.role}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* No results from search */}
        {!isLoading && !error && conversations.length > 0 && filteredConversations.length === 0 && (
          <div className="text-center py-8">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No conversations match your search</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="mt-2"
            >
              Clear Search
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
