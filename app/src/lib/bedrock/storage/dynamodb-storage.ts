/**
 * DynamoDB Conversation Storage
 * 
 * Persistent storage for chat conversations using DynamoDB.
 * Used in production mode.
 * 
 * Features:
 * - Private message history per user
 * - Session tracking for past chats
 * - Access restrictions based on user and role
 * - Efficient queries with GSI
 */

import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  QueryCommand,
  UpdateItemCommand,
  DeleteItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Conversation, ConversationMessage } from '../conversation-manager';
import { ConversationStorage } from '../conversation-storage';
import type { AwsCredentialIdentity } from '@aws-sdk/types';

/**
 * DynamoDB table structure:
 * 
 * Conversations Table:
 * - PK: CONV#{conversationId}
 * - SK: META
 * - GSI1PK: USER#{userId}
 * - GSI1SK: ROLE#{role}#UPDATED#{timestamp}
 * - userId, role, createdAt, updatedAt, deletedAt
 * 
 * Messages:
 * - PK: CONV#{conversationId}
 * - SK: MSG#{timestamp}#{messageId}
 * - role, content, toolUses
 */
export class DynamoDBConversationStorage implements ConversationStorage {
  private client: DynamoDBClient;
  private tableName: string;

  constructor(credentials?: AwsCredentialIdentity) {
    const region = process.env.AWS_REGION || process.env.COGNITO_REGION || 'us-west-2';
    
    this.client = new DynamoDBClient({
      region,
      credentials: credentials || (process.env.AWS_ACCESS_KEY_ID ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        sessionToken: process.env.AWS_SESSION_TOKEN,
      } : undefined),
    });

    this.tableName = process.env.CHAT_CONVERSATIONS_TABLE || 'chat-conversations';
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

    const item = {
      PK: `CONV#${conversationId}`,
      SK: 'META',
      GSI1PK: `USER#${userId}`,
      GSI1SK: `ROLE#${role}#UPDATED#${now}`,
      conversationId,
      userId,
      role,
      createdAt: now,
      updatedAt: now,
      type: 'conversation',
    };

    await this.client.send(
      new PutItemCommand({
        TableName: this.tableName,
        Item: marshall(item),
        ConditionExpression: 'attribute_not_exists(PK)',
      })
    );

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
    const result = await this.client.send(
      new GetItemCommand({
        TableName: this.tableName,
        Key: marshall({
          PK: `CONV#${conversationId}`,
          SK: 'META',
        }),
      })
    );

    if (!result.Item) {
      return null;
    }

    const item = unmarshall(result.Item);

    // Access control: verify user owns this conversation
    if (item.userId !== userId) {
      return null;
    }

    // Check if deleted
    if (item.deletedAt) {
      return null;
    }

    // Get messages for this conversation
    const messages = await this.getRecentMessages(conversationId, userId, 1000);

    return {
      id: item.conversationId,
      userId: item.userId,
      role: item.role,
      messages,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
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

    const timestamp = message.timestamp.toISOString();

    const item = {
      PK: `CONV#${conversationId}`,
      SK: `MSG#${timestamp}#${message.id}`,
      messageId: message.id,
      conversationId,
      role: message.role,
      content: message.content,
      timestamp,
      toolUses: message.toolUses || null,
      type: 'message',
    };

    await this.client.send(
      new PutItemCommand({
        TableName: this.tableName,
        Item: marshall(item),
      })
    );

    // Enforce maximum message limit
    const maxMessages = parseInt(process.env.CHAT_MAX_MESSAGES_PER_CONVERSATION || '100');
    
    // Query to count messages
    const queryResult = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: marshall({
          ':pk': `CONV#${conversationId}`,
          ':sk': 'MSG#',
        }),
        Select: 'COUNT',
      })
    );

    if (queryResult.Count && queryResult.Count > maxMessages) {
      // Query oldest messages to delete
      const oldMessagesResult = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          ExpressionAttributeValues: marshall({
            ':pk': `CONV#${conversationId}`,
            ':sk': 'MSG#',
          }),
          ScanIndexForward: true, // Oldest first
          Limit: queryResult.Count - maxMessages, // Delete excess messages
        })
      );

      // Delete old messages
      if (oldMessagesResult.Items && oldMessagesResult.Items.length > 0) {
        for (const item of oldMessagesResult.Items) {
          const unmarshalled = unmarshall(item);
          await this.client.send(
            new DeleteItemCommand({
              TableName: this.tableName,
              Key: marshall({
                PK: unmarshalled.PK,
                SK: unmarshalled.SK,
              }),
            })
          );
        }
        console.log(`[DynamoDBStorage] Trimmed conversation ${conversationId} to ${maxMessages} messages`);
      }
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
    const params: any = {
      TableName: this.tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :userId',
      ExpressionAttributeValues: marshall({
        ':userId': `USER#${userId}`,
      }),
      ScanIndexForward: false, // Most recent first
      Limit: limit,
    };

    // Add role filter if specified
    if (role) {
      params.KeyConditionExpression += ' AND begins_with(GSI1SK, :rolePrefix)';
      params.ExpressionAttributeValues = marshall({
        ':userId': `USER#${userId}`,
        ':rolePrefix': `ROLE#${role}#`,
      });
    }

    // Add filter for non-deleted conversations
    params.FilterExpression = 'attribute_not_exists(deletedAt)';

    const result = await this.client.send(new QueryCommand(params));

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    // Get recent messages for each conversation
    const conversations: Conversation[] = [];
    for (const item of result.Items) {
      const conv = unmarshall(item);
      const messages = await this.getRecentMessages(conv.conversationId, userId, 10);
      
      conversations.push({
        id: conv.conversationId,
        userId: conv.userId,
        role: conv.role,
        messages,
        createdAt: new Date(conv.createdAt),
        updatedAt: new Date(conv.updatedAt),
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
    // Verify user owns this conversation by checking metadata directly
    // (avoid infinite recursion by not calling getConversation)
    const metaResult = await this.client.send(
      new GetItemCommand({
        TableName: this.tableName,
        Key: marshall({
          PK: `CONV#${conversationId}`,
          SK: 'META',
        }),
      })
    );

    if (!metaResult.Item) {
      throw new Error('Conversation not found');
    }

    const meta = unmarshall(metaResult.Item);
    
    // Access control: verify user owns this conversation
    if (meta.userId !== userId) {
      throw new Error('Access denied');
    }

    // Check if deleted
    if (meta.deletedAt) {
      throw new Error('Conversation has been deleted');
    }

    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: marshall({
          ':pk': `CONV#${conversationId}`,
          ':skPrefix': 'MSG#',
        }),
        ScanIndexForward: false, // Most recent first
        Limit: limit,
      })
    );

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    // Reverse to get chronological order
    const messages = result.Items.reverse().map(item => {
      const msg = unmarshall(item);
      return {
        id: msg.messageId,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        toolUses: msg.toolUses || undefined,
      };
    });

    return messages;
  }

  /**
   * Delete a conversation (soft delete)
   */
  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    // Verify user owns this conversation
    const conversation = await this.getConversation(conversationId, userId);
    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    await this.client.send(
      new UpdateItemCommand({
        TableName: this.tableName,
        Key: marshall({
          PK: `CONV#${conversationId}`,
          SK: 'META',
        }),
        UpdateExpression: 'SET deletedAt = :deletedAt',
        ExpressionAttributeValues: marshall({
          ':deletedAt': new Date().toISOString(),
        }),
      })
    );
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

    // Query all messages
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: marshall({
          ':pk': `CONV#${conversationId}`,
          ':skPrefix': 'MSG#',
        }),
      })
    );

    if (result.Items && result.Items.length > 0) {
      // Delete all messages (batch delete would be more efficient for large numbers)
      for (const item of result.Items) {
        const msg = unmarshall(item);
        await this.client.send(
          new DeleteItemCommand({
            TableName: this.tableName,
            Key: marshall({
              PK: msg.PK,
              SK: msg.SK,
            }),
          })
        );
      }
    }

    // Update conversation updated_at
    await this.updateConversationMetadata(conversationId, userId);
  }

  /**
   * Update conversation metadata
   */
  async updateConversationMetadata(conversationId: string, userId: string): Promise<void> {
    const now = new Date().toISOString();

    // Get current conversation to maintain GSI1SK with role
    const result = await this.client.send(
      new GetItemCommand({
        TableName: this.tableName,
        Key: marshall({
          PK: `CONV#${conversationId}`,
          SK: 'META',
        }),
      })
    );

    if (!result.Item) {
      throw new Error('Conversation not found');
    }

    const item = unmarshall(result.Item);

    // Verify access
    if (item.userId !== userId) {
      throw new Error('Access denied');
    }

    await this.client.send(
      new UpdateItemCommand({
        TableName: this.tableName,
        Key: marshall({
          PK: `CONV#${conversationId}`,
          SK: 'META',
        }),
        UpdateExpression: 'SET updatedAt = :updatedAt, GSI1SK = :gsi1sk',
        ExpressionAttributeValues: marshall({
          ':updatedAt': now,
          ':gsi1sk': `ROLE#${item.role}#UPDATED#${now}`,
        }),
      })
    );
  }
}
