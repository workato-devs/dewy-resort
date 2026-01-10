/**
 * Manager Chat API
 * GET /api/manager/chat - Fetch message history
 * POST /api/manager/chat - Send message and get AI response
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { 
  executeQueryOne, 
  executeQuery, 
  executeUpdate, 
  generateId 
} from '@/lib/db/client';
import { mapUser, mapChatMessage } from '@/lib/db/mappers';
import { UserRow, ChatMessageRow, ChatMessage } from '@/types';
import { processManagerChatMessage } from '@/lib/chat/manager-intents';

/**
 * GET /api/manager/chat
 * Fetch chat message history for the authenticated manager
 */
export async function GET(request: NextRequest) {
  try {
    // Get session from cookie
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('hotel_session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { error: { code: 'AUTH_ERROR', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // Verify session and get user
    const sessionQuery = `
      SELECT u.* FROM users u
      INNER JOIN sessions s ON s.user_id = u.id
      WHERE s.id = ? AND s.expires_at > datetime('now')
    `;
    
    const userRow = executeQueryOne<UserRow>(sessionQuery, [sessionId]);

    if (!userRow) {
      return NextResponse.json(
        { error: { code: 'AUTH_ERROR', message: 'Invalid or expired session' } },
        { status: 401 }
      );
    }

    const user = mapUser(userRow);

    // Verify user is a manager
    if (user.role !== 'manager') {
      return NextResponse.json(
        { error: { code: 'AUTHZ_ERROR', message: 'Access denied' } },
        { status: 403 }
      );
    }

    // Fetch chat messages for this user
    const messagesQuery = `
      SELECT * FROM chat_messages 
      WHERE user_id = ? 
      ORDER BY timestamp ASC
    `;
    
    const messageRows = executeQuery<ChatMessageRow>(messagesQuery, [user.id]);
    const messages = messageRows.map(mapChatMessage);

    return NextResponse.json({ messages });

  } catch (error) {
    console.error('Manager chat GET API error:', error);
    
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to fetch chat messages',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/manager/chat
 * Send a message and get AI response
 */
export async function POST(request: NextRequest) {
  try {
    // Get session from cookie
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('hotel_session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { error: { code: 'AUTH_ERROR', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // Verify session and get user
    const sessionQuery = `
      SELECT u.* FROM users u
      INNER JOIN sessions s ON s.user_id = u.id
      WHERE s.id = ? AND s.expires_at > datetime('now')
    `;
    
    const userRow = executeQueryOne<UserRow>(sessionQuery, [sessionId]);

    if (!userRow) {
      return NextResponse.json(
        { error: { code: 'AUTH_ERROR', message: 'Invalid or expired session' } },
        { status: 401 }
      );
    }

    const user = mapUser(userRow);

    // Verify user is a manager
    if (user.role !== 'manager') {
      return NextResponse.json(
        { error: { code: 'AUTHZ_ERROR', message: 'Access denied' } },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Message content is required' } },
        { status: 400 }
      );
    }

    // Store user message
    const userMessageId = generateId();
    const userMessageQuery = `
      INSERT INTO chat_messages (id, user_id, role, content, timestamp)
      VALUES (?, ?, 'user', ?, datetime('now'))
    `;
    
    executeUpdate(userMessageQuery, [userMessageId, user.id, content.trim()]);

    // Process message with AI intent handler
    const aiResponse = await processManagerChatMessage(content.trim(), user);

    // Store AI response
    const aiMessageId = generateId();
    const aiMessageQuery = `
      INSERT INTO chat_messages (id, user_id, role, content, timestamp, metadata)
      VALUES (?, ?, 'assistant', ?, datetime('now'), ?)
    `;
    
    const metadata = aiResponse.metadata ? JSON.stringify(aiResponse.metadata) : null;
    executeUpdate(aiMessageQuery, [aiMessageId, user.id, aiResponse.content, metadata]);

    // Fetch the newly created messages
    const userMessage: ChatMessage = {
      id: userMessageId,
      userId: user.id,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    const assistantMessage: ChatMessage = {
      id: aiMessageId,
      userId: user.id,
      role: 'assistant',
      content: aiResponse.content,
      timestamp: new Date(),
      metadata: metadata || undefined,
    };

    return NextResponse.json({
      userMessage,
      assistantMessage,
      action: aiResponse.action,
    });

  } catch (error) {
    console.error('Manager chat POST API error:', error);
    
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to process chat message',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      { status: 500 }
    );
  }
}
