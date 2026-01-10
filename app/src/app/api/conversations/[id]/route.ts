/**
 * GET /api/conversations/:id
 * Fetch a specific conversation by ID with all messages
 * 
 * This endpoint:
 * 1. Validates user session
 * 2. Verifies user owns the conversation
 * 3. Fetches full conversation with all messages
 * 4. Returns conversation data for loading into chat interface
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { createErrorResponse } from '@/lib/errors/api-response';
import { ValidationError } from '@/lib/errors';
import { ConversationManager } from '@/lib/bedrock/conversation-manager';
import { ErrorLogger } from '@/lib/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate session and get user info
    const session = await requireAuth(request);
    const { userId } = session;

    const conversationId = params.id;

    if (!conversationId) {
      throw new ValidationError('Conversation ID is required');
    }

    ErrorLogger.info(
      `Fetching conversation ${conversationId} for user ${userId}`,
      'conversations.get'
    );

    // Get conversation from storage
    const conversationManager = new ConversationManager();
    const conversation = await conversationManager.getConversation(conversationId, userId);

    if (!conversation) {
      throw new ValidationError('Conversation not found or access denied');
    }

    // Transform messages to match ChatMessage interface
    const messages = conversation.messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      toolUses: msg.toolUses,
    }));

    ErrorLogger.info(
      `Returning conversation ${conversationId} with ${messages.length} messages`,
      'conversations.get'
    );

    return NextResponse.json({
      conversationId: conversation.id,
      userId: conversation.userId,
      role: conversation.role,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages,
    });

  } catch (error) {
    ErrorLogger.log(error, 'conversations.get');
    return createErrorResponse(error, 'conversations.get');
  }
}
