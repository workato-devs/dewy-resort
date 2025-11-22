/**
 * Conversation Storage Interface
 * 
 * Provides persistent storage for chat conversations with support for:
 * - SQLite (mock/development mode)
 * - DynamoDB (production mode)
 * - Private message history per user
 * - Session tracking for past chats
 * - Access restrictions based on user and role
 */

import { Conversation, ConversationMessage } from './conversation-manager';

/**
 * Storage interface that all implementations must follow
 */
export interface ConversationStorage {
  /**
   * Create a new conversation
   */
  createConversation(userId: string, role: string, conversationId: string): Promise<Conversation>;

  /**
   * Get conversation by ID (with access control)
   */
  getConversation(conversationId: string, userId: string): Promise<Conversation | null>;

  /**
   * Add a message to a conversation
   */
  addMessage(conversationId: string, userId: string, message: ConversationMessage): Promise<void>;

  /**
   * Get all conversations for a user
   */
  getUserConversations(userId: string, role?: string, limit?: number): Promise<Conversation[]>;

  /**
   * Get recent messages from a conversation
   */
  getRecentMessages(conversationId: string, userId: string, limit?: number): Promise<ConversationMessage[]>;

  /**
   * Delete a conversation (soft delete)
   */
  deleteConversation(conversationId: string, userId: string): Promise<void>;

  /**
   * Clear all messages from a conversation
   */
  clearConversation(conversationId: string, userId: string): Promise<void>;

  /**
   * Update conversation metadata (last accessed, etc.)
   */
  updateConversationMetadata(conversationId: string, userId: string): Promise<void>;
}

/**
 * Factory function to create the appropriate storage implementation
 */
export function createConversationStorage(credentials?: any): ConversationStorage {
  const useMockStorage = process.env.CHAT_STORAGE_MODE === 'mock' || 
                         process.env.WORKATO_MOCK_MODE === 'true';

  if (useMockStorage) {
    const { SQLiteConversationStorage } = require('./storage/sqlite-storage');
    return new SQLiteConversationStorage();
  } else {
    const { DynamoDBConversationStorage } = require('./storage/dynamodb-storage');
    return new DynamoDBConversationStorage(credentials);
  }
}
