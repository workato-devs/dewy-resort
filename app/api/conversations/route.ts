/**
 * GET /api/conversations
 * Fetch conversation history for the authenticated user
 * 
 * This endpoint:
 * 1. Validates user session
 * 2. Fetches conversations from storage (DynamoDB or SQLite)
 * 3. Returns list with metadata (timestamp, message count, preview)
 * 4. Supports pagination and role filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { createErrorResponse } from '@/lib/errors/api-response';
import { ValidationError } from '@/lib/errors';
import { ConversationManager } from '@/lib/bedrock/conversation-manager';
import { ErrorLogger } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    // Validate session and get user info
    const session = await requireAuth(request);
    const { userId, role } = session;

    ErrorLogger.info(`Fetching conversations for user ${userId}`, 'conversations.list');

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const roleFilter = searchParams.get('role') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');

    // Validate limit
    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }

    // Get conversations from storage
    const conversationManager = new ConversationManager();
    const conversations = await conversationManager.getUserConversations(
      userId,
      roleFilter,
      limit
    );

    // Transform conversations to include metadata
    const conversationsWithMetadata = conversations.map(conv => {
      const lastMessage = conv.messages[conv.messages.length - 1];
      const lastMessagePreview = lastMessage 
        ? lastMessage.content.substring(0, 100) + (lastMessage.content.length > 100 ? '...' : '')
        : '';

      return {
        conversationId: conv.id,
        userId: conv.userId,
        role: conv.role,
        createdAt: conv.createdAt.toISOString(),
        updatedAt: conv.updatedAt.toISOString(),
        messageCount: conv.messages.length,
        lastMessage: lastMessage?.content || '',
        lastMessagePreview,
      };
    });

    ErrorLogger.info(
      `Returning ${conversationsWithMetadata.length} conversations for user ${userId}`,
      'conversations.list'
    );

    return NextResponse.json({
      conversations: conversationsWithMetadata,
    });

  } catch (error) {
    ErrorLogger.log(error, 'conversations.list');
    return createErrorResponse(error, 'conversations.list');
  }
}
