/**
 * SQLite Conversation Storage
 * 
 * Persistent storage for chat conversations using SQLite.
 * Used in mock/development mode.
 */

import { Database } from 'better-sqlite3';
import { Conversation, ConversationMessage } from '../conversation-manager';
import { ConversationStorage } from '../conversation-storage';
import { getDatabase } from '@/lib/db/client';

/**
 * SQLite implementation of conversation storage
 */
export class SQLiteConversationStorage implements ConversationStorage {
  private db: Database;

  constructor() {
    this.db = getDatabase();
    this.initializeTables();
  }

  /**
   * Initialize database tables for conversations
   */
  private initializeTables(): void {
    // Conversations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Create index for user lookups
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_conversations_user_id 
      ON conversations(user_id, deleted_at)
    `);

    // Create index for role filtering
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_conversations_role 
      ON conversations(user_id, role, deleted_at)
    `);

    // Conversation messages table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversation_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        tool_uses TEXT,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      )
    `);

    // Create index for conversation message lookups
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id 
      ON conversation_messages(conversation_id, timestamp)
    `);
  }

  /**
   * Create a new conversation
   */
  async createConversation(
    userId: string,
    role: string,
    conversationId: string
  ): Promise<Conversation> {
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO conversations (id, user_id, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(conversationId, userId, role, now, now);

    return {
      id: conversationId,
      userId,
      role,
      messages: [],
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  /**
   * Get conversation by ID with access control
   */
  async getConversation(
    conversationId: string,
    userId: string
  ): Promise<Conversation | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM conversations 
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `);

    const row = stmt.get(conversationId, userId) as any;

    if (!row) {
      return null;
    }

    // Get messages for this conversation
    const messages = await this.getRecentMessages(conversationId, userId, 1000);

    return {
      id: row.id,
      userId: row.user_id,
      role: row.role,
      messages,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(
    conversationId: string,
    userId: string,
    message: ConversationMessage
  ): Promise<void> {
    // Verify user owns this conversation
    const conversation = await this.getConversation(conversationId, userId);
    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    const stmt = this.db.prepare(`
      INSERT INTO conversation_messages (id, conversation_id, role, content, timestamp, tool_uses)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      message.id,
      conversationId,
      message.role,
      message.content,
      message.timestamp.toISOString(),
      message.toolUses ? JSON.stringify(message.toolUses) : null
    );

    // Enforce maximum message limit
    const maxMessages = parseInt(process.env.CHAT_MAX_MESSAGES_PER_CONVERSATION || '100');
    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM conversation_messages WHERE conversation_id = ?
    `);
    const result = countStmt.get(conversationId) as { count: number };
    
    if (result.count > maxMessages) {
      // Delete oldest messages to keep only most recent
      const deleteStmt = this.db.prepare(`
        DELETE FROM conversation_messages 
        WHERE conversation_id = ? 
        AND id NOT IN (
          SELECT id FROM conversation_messages 
          WHERE conversation_id = ? 
          ORDER BY timestamp DESC 
          LIMIT ?
        )
      `);
      deleteStmt.run(conversationId, conversationId, maxMessages);
      console.log(`[SQLiteStorage] Trimmed conversation ${conversationId} to ${maxMessages} messages`);
    }

    // Update conversation updated_at
    await this.updateConversationMetadata(conversationId, userId);
  }

  /**
   * Get all conversations for a user
   */
  async getUserConversations(
    userId: string,
    role?: string,
    limit: number = 50
  ): Promise<Conversation[]> {
    let query = `
      SELECT * FROM conversations 
      WHERE user_id = ? AND deleted_at IS NULL
    `;
    const params: any[] = [userId];

    if (role) {
      query += ` AND role = ?`;
      params.push(role);
    }

    query += ` ORDER BY updated_at DESC LIMIT ?`;
    params.push(limit);

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    // Get message counts for each conversation
    const conversations: Conversation[] = [];
    for (const row of rows) {
      const messages = await this.getRecentMessages(row.id, userId, 10);
      conversations.push({
        id: row.id,
        userId: row.user_id,
        role: row.role,
        messages,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      });
    }

    return conversations;
  }

  /**
   * Get recent messages from a conversation
   */
  async getRecentMessages(
    conversationId: string,
    userId: string,
    limit: number = 10
  ): Promise<ConversationMessage[]> {
    // Verify user owns this conversation
    const stmt = this.db.prepare(`
      SELECT 1 FROM conversations 
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `);
    const hasAccess = stmt.get(conversationId, userId);

    if (!hasAccess) {
      throw new Error('Conversation not found or access denied');
    }

    // Get messages
    const messagesStmt = this.db.prepare(`
      SELECT * FROM conversation_messages 
      WHERE conversation_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);

    const rows = messagesStmt.all(conversationId, limit) as any[];

    // Reverse to get chronological order
    return rows.reverse().map(row => ({
      id: row.id,
      role: row.role as 'user' | 'assistant',
      content: row.content,
      timestamp: new Date(row.timestamp),
      toolUses: row.tool_uses ? JSON.parse(row.tool_uses) : undefined,
    }));
  }

  /**
   * Delete a conversation (soft delete)
   */
  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE conversations 
      SET deleted_at = ? 
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `);

    const result = stmt.run(new Date().toISOString(), conversationId, userId);

    if (result.changes === 0) {
      throw new Error('Conversation not found or access denied');
    }
  }

  /**
   * Clear all messages from a conversation
   */
  async clearConversation(conversationId: string, userId: string): Promise<void> {
    // Verify user owns this conversation
    const conversation = await this.getConversation(conversationId, userId);
    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    const stmt = this.db.prepare(`
      DELETE FROM conversation_messages 
      WHERE conversation_id = ?
    `);

    stmt.run(conversationId);

    // Update conversation updated_at
    await this.updateConversationMetadata(conversationId, userId);
  }

  /**
   * Update conversation metadata
   */
  async updateConversationMetadata(conversationId: string, userId: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE conversations 
      SET updated_at = ? 
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `);

    stmt.run(new Date().toISOString(), conversationId, userId);
  }
}
