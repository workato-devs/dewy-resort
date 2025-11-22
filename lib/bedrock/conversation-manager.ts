/**
 * Conversation Manager
 * 
 * Manages conversation history and context for Bedrock chat sessions.
 * Implements in-memory storage with automatic expiration and context limiting.
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */

import { randomUUID } from 'crypto';
import { ConversationNotFoundError } from './errors';
import { BedrockLogger } from './logger';
import { ConversationStorage, createConversationStorage } from './conversation-storage';

/**
 * Tool use request within a message
 */
export interface ConversationToolUse {
  toolName: string;
  toolInput: any;
  toolUseId?: string;
}

/**
 * Individual message in a conversation
 */
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolUses?: ConversationToolUse[];
}

/**
 * Complete conversation with metadata
 */
export interface Conversation {
  id: string;
  userId: string;
  role: string;
  messages: ConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Bedrock message format for API calls
 * Note: Also defined in client.ts - using that as the canonical definition
 */
interface BedrockMessageInternal {
  role: 'user' | 'assistant';
  content: string;
}

// Re-export from client for consistency
export type { BedrockMessage } from './client';

/**
 * Get maximum messages per conversation from environment or use default
 */
function getMaxMessagesPerConversation(): number {
  return parseInt(process.env.CHAT_MAX_MESSAGES_PER_CONVERSATION || '100');
}

/**
 * In-memory conversation storage
 */
interface ConversationStore {
  conversations: Map<string, Conversation>;
  expirationMs: number; // 24 hours
  cleanupIntervalMs: number; // 1 hour
  cleanupTimer?: NodeJS.Timeout;
}

/**
 * Conversation Manager
 * 
 * Manages conversation lifecycle, message storage, and context limiting.
 * Uses persistent storage (SQLite for mock mode, DynamoDB for production).
 */
export class ConversationManager {
  private store: ConversationStore;
  private storage: ConversationStorage | null = null;
  private usePersistentStorage: boolean;

  constructor(credentials?: any) {
    const expirationHours = parseInt(process.env.CHAT_CONVERSATION_EXPIRATION_HOURS || '24');
    const cleanupHours = parseInt(process.env.CHAT_CLEANUP_INTERVAL_HOURS || '1');
    
    this.store = {
      conversations: new Map(),
      expirationMs: expirationHours * 60 * 60 * 1000,
      cleanupIntervalMs: cleanupHours * 60 * 60 * 1000,
    };

    // Determine if we should use persistent storage
    this.usePersistentStorage = process.env.CHAT_STORAGE_MODE !== 'memory';
    
    if (this.usePersistentStorage) {
      this.storage = createConversationStorage(credentials);
      console.log('[ConversationManager] Using persistent storage');
    } else {
      console.log('[ConversationManager] Using in-memory storage');
      // Start automatic cleanup for in-memory mode
      this.startCleanup();
    }
  }

  /**
   * Create a new conversation
   * 
   * Requirement 12.1: Maintain conversation history in frontend state
   * 
   * @param userId - User ID from session
   * @param role - User role (guest, manager, housekeeping, maintenance)
   * @returns New conversation object
   */
  async createConversation(userId: string, role: string): Promise<Conversation> {
    const conversationId = randomUUID();

    if (this.usePersistentStorage && this.storage) {
      const conversation = await this.storage.createConversation(userId, role, conversationId);
      BedrockLogger.logConversationCreate(userId, role, conversation.id);
      return conversation;
    }

    // In-memory fallback
    const conversation: Conversation = {
      id: conversationId,
      userId,
      role,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.store.conversations.set(conversation.id, conversation);
    
    BedrockLogger.logConversationCreate(userId, role, conversation.id);

    return conversation;
  }

  /**
   * Get conversation by ID
   * 
   * Requirement 12.1: Maintain conversation history
   * 
   * @param conversationId - Conversation ID
   * @param userId - User ID for access control
   * @returns Conversation object or null if not found/expired
   */
  async getConversation(conversationId: string, userId?: string): Promise<Conversation | null> {
    if (this.usePersistentStorage && userId && this.storage) {
      return await this.storage.getConversation(conversationId, userId);
    }

    // In-memory fallback
    const conversation = this.store.conversations.get(conversationId);

    if (!conversation) {
      return null;
    }

    // Check if conversation has expired
    if (this.isExpired(conversation)) {
      this.store.conversations.delete(conversationId);
      return null;
    }

    // Access control for in-memory mode
    if (userId && conversation.userId !== userId) {
      return null;
    }

    return conversation;
  }

  /**
   * Add a message to a conversation
   * 
   * Requirement 12.2: Include previous messages as context
   * 
   * @param conversationId - Conversation ID
   * @param message - Message to add
   * @param userId - User ID for access control
   */
  async addMessage(
    conversationId: string,
    message: ConversationMessage,
    userId?: string
  ): Promise<void> {
    if (this.usePersistentStorage && userId && this.storage) {
      await this.storage.addMessage(conversationId, userId, message);
      return;
    }

    // In-memory fallback
    const conversation = await this.getConversation(conversationId, userId);

    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    conversation.messages.push(message);
    conversation.updatedAt = new Date();

    // Enforce maximum message limit to prevent unbounded growth
    const maxMessages = getMaxMessagesPerConversation();
    if (conversation.messages.length > maxMessages) {
      // Keep only the most recent messages
      conversation.messages = conversation.messages.slice(-maxMessages);
      console.log(`[ConversationManager] Trimmed conversation ${conversationId} to ${maxMessages} messages`);
    }

    this.store.conversations.set(conversationId, conversation);
    
    BedrockLogger.logConversationMessage(
      conversation.userId,
      conversation.role,
      conversationId,
      message.role
    );
  }

  /**
   * Get recent messages for context, limited to most recent N messages
   * 
   * Requirement 12.3: Limit conversation history to most recent 10 messages
   * Requirement 12.4: Format conversation history according to Bedrock format
   * 
   * @param conversation - Conversation object
   * @param limit - Maximum number of messages to return (default: 10)
   * @param userId - User ID for persistent storage access
   * @returns Array of messages in Bedrock format
   */
  async getRecentMessages(
    conversation: Conversation, 
    limit: number = 10,
    userId?: string
  ): Promise<BedrockMessageInternal[]> {
    let messages: ConversationMessage[];

    // If using persistent storage, fetch messages from storage
    if (this.usePersistentStorage && userId && this.storage) {
      messages = await this.storage.getRecentMessages(conversation.id, userId, limit);
    } else {
      // In-memory: get from conversation object
      messages = conversation.messages.slice(-limit);
    }

    // Convert to Bedrock message format
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * Clear all messages from a conversation
   * 
   * Requirement 12.5: Clear conversation history when starting new conversation
   * 
   * @param conversationId - Conversation ID
   */
  async clearConversation(conversationId: string): Promise<void> {
    const conversation = await this.getConversation(conversationId);

    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found or expired`);
    }

    conversation.messages = [];
    conversation.updatedAt = new Date();

    this.store.conversations.set(conversationId, conversation);
  }

  /**
   * Delete a conversation completely
   * 
   * @param conversationId - Conversation ID
   */
  async deleteConversation(conversationId: string): Promise<void> {
    this.store.conversations.delete(conversationId);
  }

  /**
   * Get all conversations for a user
   * 
   * @param userId - User ID
   * @param role - Optional role filter
   * @param limit - Maximum number of conversations to return
   * @returns Array of conversations for the user
   */
  async getUserConversations(userId: string, role?: string, limit?: number): Promise<Conversation[]> {
    if (this.usePersistentStorage && this.storage) {
      return await this.storage.getUserConversations(userId, role, limit);
    }

    // In-memory fallback
    const conversations: Conversation[] = [];

    Array.from(this.store.conversations.values()).forEach(conversation => {
      if (conversation.userId === userId && !this.isExpired(conversation)) {
        if (!role || conversation.role === role) {
          conversations.push(conversation);
        }
      }
    });

    // Sort by updated date descending
    conversations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    // Apply limit
    if (limit) {
      return conversations.slice(0, limit);
    }

    return conversations;
  }

  /**
   * Check if a conversation has expired
   * 
   * Requirement 12.5: Implement conversation expiration (24 hours)
   * 
   * @param conversation - Conversation to check
   * @returns True if expired
   */
  private isExpired(conversation: Conversation): boolean {
    const now = Date.now();
    const updatedAt = conversation.updatedAt.getTime();
    return now - updatedAt > this.store.expirationMs;
  }

  /**
   * Start automatic cleanup of expired conversations
   * 
   * Requirement 12.5: Implement conversation expiration (24 hours)
   */
  private startCleanup(): void {
    this.store.cleanupTimer = setInterval(() => {
      this.cleanupExpiredConversations();
    }, this.store.cleanupIntervalMs);

    // Don't prevent process from exiting
    if (this.store.cleanupTimer.unref) {
      this.store.cleanupTimer.unref();
    }
  }

  /**
   * Clean up expired conversations
   */
  private cleanupExpiredConversations(): void {
    const expiredIds: string[] = [];

    Array.from(this.store.conversations.entries()).forEach(([id, conversation]) => {
      if (this.isExpired(conversation)) {
        expiredIds.push(id);
      }
    });

    expiredIds.forEach(id => {
      this.store.conversations.delete(id);
    });

    if (expiredIds.length > 0) {
      console.log(`[ConversationManager] Cleaned up ${expiredIds.length} expired conversations`);
    }
  }

  /**
   * Stop automatic cleanup (for testing or shutdown)
   */
  stopCleanup(): void {
    if (this.store.cleanupTimer) {
      clearInterval(this.store.cleanupTimer);
      this.store.cleanupTimer = undefined;
    }
  }

  /**
   * Get statistics about stored conversations
   * 
   * @returns Statistics object
   */
  getStats(): {
    totalConversations: number;
    totalMessages: number;
    conversationsByRole: Record<string, number>;
  } {
    let totalMessages = 0;
    const conversationsByRole: Record<string, number> = {};

    Array.from(this.store.conversations.values()).forEach(conversation => {
      if (!this.isExpired(conversation)) {
        totalMessages += conversation.messages.length;
        conversationsByRole[conversation.role] = (conversationsByRole[conversation.role] || 0) + 1;
      }
    });

    return {
      totalConversations: this.store.conversations.size,
      totalMessages,
      conversationsByRole,
    };
  }
}

// Export singleton instance
export const conversationManager = new ConversationManager();
