/**
 * BedrockChatWithHistory Component
 * 
 * Combines BedrockChatInterface with ConversationList for conversation recall.
 * Allows users to view past conversations and load them into the chat interface.
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7
 */

'use client';

import { useState, useCallback } from 'react';
import { BedrockChatInterfaceAuto } from './BedrockChatInterfaceWithDebug';
import { ConversationList } from './ConversationList';
import { Button } from '@/components/ui/button';
import { MessageSquare, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * BedrockChatWithHistory props
 */
export interface BedrockChatWithHistoryProps {
  role: 'guest' | 'manager' | 'housekeeping' | 'maintenance';
  onError?: (error: Error) => void;
  showHistoryByDefault?: boolean;
}

/**
 * BedrockChatWithHistory Component
 */
export function BedrockChatWithHistory({
  role,
  onError,
  showHistoryByDefault = false,
}: BedrockChatWithHistoryProps) {
  const [showHistory, setShowHistory] = useState(showHistoryByDefault);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversationKey, setConversationKey] = useState(0);
  const { toast } = useToast();

  /**
   * Handle conversation selection
   */
  const handleSelectConversation = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId);
    // Force re-render of chat interface with new conversation
    setConversationKey(prev => prev + 1);
    setShowHistory(false);
    
    toast({
      title: 'Conversation Loaded',
      description: 'Previous conversation has been loaded into the chat.',
    });
  }, [toast]);

  /**
   * Handle starting a new conversation
   */
  const handleNewConversation = useCallback(() => {
    setSelectedConversationId(null);
    setConversationKey(prev => prev + 1);
    setShowHistory(false);
    
    toast({
      title: 'New Conversation',
      description: 'Started a new conversation.',
    });
  }, [toast]);

  /**
   * Toggle history panel
   */
  const toggleHistory = useCallback(() => {
    setShowHistory(prev => !prev);
  }, []);

  return (
    <div className="flex gap-4">
      {/* Main chat interface */}
      <div className="flex-1">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant={showHistory ? 'default' : 'outline'}
              size="sm"
              onClick={toggleHistory}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {showHistory ? 'Hide' : 'Show'} History
            </Button>
            
            {selectedConversationId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewConversation}
              >
                <X className="h-4 w-4 mr-2" />
                New Conversation
              </Button>
            )}
          </div>
          
          {selectedConversationId && (
            <div className="text-sm text-muted-foreground">
              Viewing past conversation
            </div>
          )}
        </div>

        <BedrockChatInterfaceAuto
          key={conversationKey}
          role={role}
          conversationId={selectedConversationId || undefined}
          onError={onError}
        />
      </div>

      {/* Conversation history sidebar */}
      {showHistory && (
        <div className="w-80">
          <ConversationList
            onSelectConversation={handleSelectConversation}
            currentConversationId={selectedConversationId}
          />
        </div>
      )}
    </div>
  );
}
