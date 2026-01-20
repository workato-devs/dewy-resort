/**
 * POST /api/chat/stream
 * Streaming chat endpoint with Amazon Bedrock integration
 * 
 * This endpoint:
 * 1. Validates user session
 * 2. Exchanges Cognito ID token for temporary AWS credentials via Identity Pool
 * 3. Loads role-specific MCP configuration and system prompt
 * 4. Invokes Bedrock model with streaming
 * 5. Streams response tokens via Server-Sent Events
 * 6. Handles tool use requests during streaming
 * 7. Persists conversation messages
 */

import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { createErrorResponse } from '@/lib/errors/api-response';
import { ValidationError, AuthenticationError } from '@/lib/errors';
import { MCPManager } from '@/lib/bedrock/mcp-manager';
import { PromptManager } from '@/lib/bedrock/prompt-manager';
import { ConversationManager } from '@/lib/bedrock/conversation-manager';
import { ErrorLogger } from '@/lib/errors';

// Maximum message length (10,000 characters)
const MAX_MESSAGE_LENGTH = 10000;

// Rate limiting: 10 requests per minute per user
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

/**
 * Check rate limit for user
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    // Reset or initialize rate limit
    rateLimitMap.set(userId, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  userLimit.count++;
  return true;
}

/**
 * Clean up expired rate limit entries
 */
function cleanupRateLimits() {
  const now = Date.now();
  const expiredUsers: string[] = [];
  
  rateLimitMap.forEach((limit, userId) => {
    if (now > limit.resetAt) {
      expiredUsers.push(userId);
    }
  });
  
  expiredUsers.forEach(userId => rateLimitMap.delete(userId));
}

// Clean up rate limits every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000);

/**
 * Validate that Bedrock integration is available
 */
function validateBedrockAvailability(): void {
  const region = process.env.AWS_REGION || process.env.COGNITO_REGION;
  if (!region) {
    throw new ValidationError(
      'AI chat service not configured',
      { reason: 'AWS_REGION not set' }
    );
  }

  const modelId = process.env.BEDROCK_MODEL_ID;
  if (!modelId) {
    throw new ValidationError(
      'AI chat service not configured',
      { reason: 'BEDROCK_MODEL_ID not set' }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate Bedrock availability
    validateBedrockAvailability();

    // Validate session and get user info
    const session = await requireAuth(request);
    const { userId, role, sessionId } = session;

    ErrorLogger.info(`Chat stream request from user ${userId} with role ${role}`, 'bedrock.stream.start');

    // Check rate limit
    if (!checkRateLimit(userId)) {
      throw new ValidationError('Too many requests. Please wait a moment.');
    }

    // Parse request body
    const body = await request.json();
    const { message, conversationId } = body;

    // Validate message
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new ValidationError('Message content is required');
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      throw new ValidationError(
        `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.`
      );
    }

    // Sanitize message
    const sanitizedMessage = message.trim();
    
    // Generate timestamp for this specific message
    const messageTimestamp = new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });
    
    // Prepend timestamp to user message for temporal context
    const messageWithTimestamp = `[Current time: ${messageTimestamp}]\n\n${sanitizedMessage}`;

    // Get ID token from session (needed for Cognito credentials)
    const { getCognitoIdToken, refreshCognitoTokens, deleteSession } = await import('@/lib/auth/session');
    let idToken = await getCognitoIdToken(sessionId);
    
    if (!idToken) {
      // Session was invalidated (refresh token expired or no token available)
      throw new AuthenticationError(
        'Your session has expired. Please log in again.',
        { 
          userId, 
          role,
          code: 'SESSION_EXPIRED',
          requiresLogin: true 
        }
      );
    }

    // Exchange ID token for AWS credentials via Cognito Identity Pool
    const { IdentityPoolService } = await import('@/lib/bedrock/identity-pool');
    const identityPoolService = new IdentityPoolService({
      identityPoolId: process.env.COGNITO_IDENTITY_POOL_ID!,
      region: process.env.AWS_REGION || process.env.COGNITO_REGION || 'us-west-2',
      userPoolId: process.env.COGNITO_USER_POOL_ID!,
      clientId: process.env.COGNITO_CLIENT_ID!,
    });

    let credentials;
    try {
      credentials = await identityPoolService.getCredentialsForUser(
        idToken,
        sessionId,
        userId,
        role
      );
    } catch (error) {
      // Try token refresh if credential exchange fails
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Token expired') || 
          errorMessage.includes('NotAuthorizedException') ||
          errorMessage.includes('Invalid login token')) {
        ErrorLogger.info('Token expired during credential exchange, attempting refresh...', 'bedrock.auth.refresh');
        const refreshed = await refreshCognitoTokens(sessionId);
        
        if (refreshed) {
          // Retry with new token
          credentials = await identityPoolService.getCredentialsForUser(
            refreshed.idToken,
            sessionId,
            userId,
            role
          );
          idToken = refreshed.idToken;
          ErrorLogger.info('Successfully recovered from token expiration via refresh', 'bedrock.auth.refresh');
        } else {
          // Refresh failed - invalidate session
          await deleteSession(sessionId);
          throw new AuthenticationError(
            'Your session has expired. Please log in again.',
            { 
              userId, 
              role,
              code: 'SESSION_EXPIRED',
              requiresLogin: true 
            }
          );
        }
      } else {
        throw error;
      }
    }

    ErrorLogger.info(`Using Cognito Identity Pool credentials for user ${userId}`, 'bedrock.auth');

    // Get or create conversation with Cognito credentials
    const conversationManager = new ConversationManager(credentials);
    let conversation;
    
    if (conversationId) {
      conversation = await conversationManager.getConversation(conversationId, userId);
      
      // If conversation not found (e.g., server restart cleared in-memory storage),
      // create a new conversation instead of throwing an error
      if (!conversation) {
        ErrorLogger.warn(
          `Conversation ${conversationId} not found, creating new conversation`,
          'bedrock.conversation.notfound'
        );
        conversation = await conversationManager.createConversation(userId, role);
      }
    } else {
      conversation = await conversationManager.createConversation(userId, role);
    }

    // Add user message to conversation (with timestamp for LLM context)
    await conversationManager.addMessage(conversation.id, {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: messageWithTimestamp,
      timestamp: new Date(),
    }, userId);

    // Get user profile information
    const { getCurrentUser } = await import('@/lib/auth/session');
    const user = await getCurrentUser();
    
    // Load role-specific MCP configuration
    const mcpManager = new MCPManager({ debug: true });
    let mcpTools: any[] = [];
    try {
      mcpTools = await mcpManager.getToolsForRole(role);
      ErrorLogger.info(`Loaded ${mcpTools.length} MCP tools for role ${role}`, 'bedrock.mcp.load');
      
      // Log detailed tool information for debugging
      if (mcpTools.length > 0) {
        ErrorLogger.info(
          `MCP Tools: ${mcpTools.map(t => t.name).join(', ')}`,
          'bedrock.mcp.tools'
        );
      } else {
        ErrorLogger.warn('No MCP tools loaded - check MCP server configuration', 'bedrock.mcp.tools');
      }
    } catch (error) {
      ErrorLogger.warn(`Failed to load MCP tools for role ${role}: ${error}`, 'bedrock.mcp.load');
      ErrorLogger.log(error, 'bedrock.mcp.error');
      // Continue without tools
      mcpTools = [];
    }
    
    // Load role-specific system prompt with user context
    const promptManager = new PromptManager();
    let systemPrompt;
    try {
      // Prepare user context variables for prompt interpolation
      const toolsList = mcpTools.length > 0 
        ? mcpTools.map(t => t.name).join(', ')
        : 'None available';
      
      // Generate current timestamp with timezone
      const now = new Date();
      const currentDateTime = now.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      });
        
      const userContext = {
        userName: user?.name || 'User',
        userEmail: user?.email || '',
        userRole: role,
        roomNumber: user?.roomNumber || 'N/A',
        tools: toolsList,
        currentDateTime,
      };
      
      systemPrompt = await promptManager.getPromptWithVariables(role, userContext);
      ErrorLogger.info(`Loaded system prompt for role ${role} with user context`, 'bedrock.prompt.load');
    } catch (error) {
      ErrorLogger.warn(`Failed to load system prompt for role ${role}: ${error}`, 'bedrock.prompt.load');
      // Use default prompt
      systemPrompt = `You are a helpful AI assistant for hotel ${role}s.`;
    }

    // Get conversation history for context
    const contextWindow = parseInt(process.env.CHAT_CONTEXT_WINDOW || '10');
    const recentMessages = await conversationManager.getRecentMessages(conversation, contextWindow, userId);

    // Initialize Bedrock service with Cognito Identity Pool credentials
    const { BedrockService } = await import('@/lib/bedrock/client');
    const bedrockService = new BedrockService(credentials, {
      region: process.env.AWS_REGION || process.env.COGNITO_REGION || 'us-west-2',
      modelId: process.env.BEDROCK_MODEL_ID,
      maxTokens: parseInt(process.env.BEDROCK_MAX_TOKENS || '4096'),
      temperature: parseFloat(process.env.BEDROCK_TEMPERATURE || '0.7'),
    });

    // Create Server-Sent Events stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial message_start event with model info
          const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0';
          const messageStartData = JSON.stringify({
            type: 'message_start',
            model: modelId,
            conversationId: conversation.id,
            timestamp: new Date().toISOString(),
          });
          controller.enqueue(encoder.encode(`event: message_start\ndata: ${messageStartData}\n\n`));

          let conversationMessages = [...recentMessages];
          let finalAssistantMessage = '';
          const allToolUses: any[] = [];
          
          // Tool use loop: continue until agent provides final text response
          let continueLoop = true;
          let loopCount = 0;
          const maxLoops = parseInt(process.env.CHAT_MAX_TOOL_LOOPS || '5');
          
          while (continueLoop && loopCount < maxLoops) {
            loopCount++;
            let assistantMessage = '';
            const toolUses: any[] = [];
            let currentToolUse: any = null;
            let toolInputJson = '';
            let hasToolUse = false;

            // Stream invoke Bedrock
            const streamOptions = {
              model: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
              messages: conversationMessages,
              systemPrompt,
              maxTokens: parseInt(process.env.BEDROCK_MAX_TOKENS || '4096'),
              temperature: parseFloat(process.env.BEDROCK_TEMPERATURE || '0.7'),
              tools: mcpTools.length > 0 ? mcpTools : undefined,
            };

            for await (const chunk of bedrockService.streamInvoke(streamOptions, userId, role, conversation.id)) {
              // Handle text content deltas
              if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                const text = chunk.delta.text;
                assistantMessage += text;
                const data = JSON.stringify({ type: 'token', content: text });
                controller.enqueue(encoder.encode(`event: token\ndata: ${data}\n\n`));
              }
              
              // Handle tool use start
              else if (chunk.type === 'content_block_start' && chunk.content_block?.type === 'tool_use') {
                hasToolUse = true;
                currentToolUse = {
                  id: chunk.content_block.id,
                  name: chunk.content_block.name,
                };
                toolInputJson = '';
              }
              
              // Handle tool input deltas
              else if (chunk.type === 'content_block_delta' && chunk.delta.type === 'input_json_delta') {
                toolInputJson += chunk.delta.partial_json;
              }
              
              // Handle tool use completion
              else if (chunk.type === 'content_block_stop' && currentToolUse) {
                try {
                  // Handle empty tool input (Bedrock sometimes sends empty input for tools with no parameters)
                  const toolInput = toolInputJson.trim() ? JSON.parse(toolInputJson) : {};
                  currentToolUse.input = toolInput;
                  toolUses.push(currentToolUse);

                  // Send tool_use_start event with complete input parameters
                  const startData = JSON.stringify({ 
                    type: 'tool_use_start', 
                    toolName: currentToolUse.name,
                    input: toolInput,
                  });
                  controller.enqueue(encoder.encode(`event: tool_use\ndata: ${startData}\n\n`));

                  // Execute tool with timeout
                  const toolTimeout = parseInt(process.env.CHAT_TOOL_TIMEOUT_MS || '30000');
                  const toolPromise = mcpManager.executeTool(
                    role,
                    currentToolUse.name,
                    toolInput,
                    userId
                  );
                  
                  const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Tool execution timeout')), toolTimeout)
                  );
                  
                  const toolResult = await Promise.race([toolPromise, timeoutPromise]);

                  // Store result with tool use
                  currentToolUse.result = toolResult;

                  const resultData = JSON.stringify({ 
                    type: 'tool_result',
                    toolName: currentToolUse.name,
                    result: toolResult 
                  });
                  controller.enqueue(encoder.encode(`event: tool_result\ndata: ${resultData}\n\n`));
                  
                } catch (error) {
                  ErrorLogger.log(error, 'bedrock.tool.execute');
                  const errorMessage = error instanceof Error ? error.message : 'Tool execution failed';
                  currentToolUse.error = errorMessage;
                  
                  const errorData = JSON.stringify({ 
                    type: 'tool_error',
                    toolName: currentToolUse?.name || 'unknown',
                    error: errorMessage
                  });
                  controller.enqueue(encoder.encode(`event: tool_error\ndata: ${errorData}\n\n`));
                }
                
                currentToolUse = null;
                toolInputJson = '';
              }
              
              // Handle errors
              else if (chunk.type === 'error') {
                const data = JSON.stringify({ type: 'error', error: chunk.error });
                controller.enqueue(encoder.encode(`event: error\ndata: ${data}\n\n`));
              }
              
              // Handle message stop (end of stream)
              else if (chunk.type === 'message_stop') {
                break;
              }
            }
            
            // If tools were used, add assistant message with tool uses and tool results to conversation
            if (hasToolUse && toolUses.length > 0) {
              // Build assistant message content with tool uses
              const assistantContent: any[] = [];
              
              if (assistantMessage) {
                assistantContent.push({
                  type: 'text',
                  text: assistantMessage
                });
              }
              
              // Add tool uses to content
              for (const toolUse of toolUses) {
                assistantContent.push({
                  type: 'tool_use',
                  id: toolUse.id,
                  name: toolUse.name,
                  input: toolUse.input
                });
              }
              
              // Add assistant message to conversation
              conversationMessages.push({
                role: 'assistant',
                content: assistantContent as any // Content can be string or array for tool use
              });
              
              // Build user message with tool results
              const toolResultContent: any[] = [];
              
              for (const toolUse of toolUses) {
                // Extract content from tool result
                let resultContent: any;
                
                if (toolUse.error) {
                  // Error case: use error message as string
                  resultContent = toolUse.error;
                } else if (toolUse.result) {
                  // Check if result has nested content array (MCP format)
                  if (toolUse.result.content && Array.isArray(toolUse.result.content)) {
                    // Extract content blocks from MCP response
                    resultContent = toolUse.result.content;
                  } else if (typeof toolUse.result === 'string') {
                    // Already a string
                    resultContent = toolUse.result;
                  } else {
                    // Convert object to JSON string
                    resultContent = JSON.stringify(toolUse.result);
                  }
                } else {
                  resultContent = 'No result';
                }
                
                toolResultContent.push({
                  type: 'tool_result',
                  tool_use_id: toolUse.id,
                  content: resultContent
                });
              }
              
              // Add tool results as user message
              conversationMessages.push({
                role: 'user',
                content: toolResultContent as any // Content can be string or array for tool results
              });
              
              // Track all tool uses
              allToolUses.push(...toolUses);
              
              // Continue loop to get agent's response to tool results
              continueLoop = true;
            } else {
              // No tool use, this is the final response
              finalAssistantMessage = assistantMessage;
              continueLoop = false;
            }
          }

          // Save final assistant message to conversation
          await conversationManager.addMessage(conversation.id, {
            id: `msg_${Date.now()}_assistant`,
            role: 'assistant',
            content: finalAssistantMessage,
            timestamp: new Date(),
            toolUses: allToolUses.length > 0 ? allToolUses : undefined,
          }, userId);

          // Send done event with conversation ID
          const doneData = JSON.stringify({ 
            type: 'done', 
            conversationId: conversation.id 
          });
          controller.enqueue(encoder.encode(`event: done\ndata: ${doneData}\n\n`));

          ErrorLogger.info(`Chat stream completed for user ${userId}`, 'bedrock.stream.complete');
          controller.close();
          
        } catch (error) {
          ErrorLogger.log(error, 'bedrock.stream.error');
          
          // Send error event
          const errorMessage = error instanceof Error ? error.message : 'Stream error occurred';
          const data = JSON.stringify({ type: 'error', error: errorMessage });
          controller.enqueue(encoder.encode(`event: error\ndata: ${data}\n\n`));
          controller.close();
        }
      },
    });

    // Return SSE response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    ErrorLogger.log(error, 'bedrock.stream.request');
    return createErrorResponse(error, 'bedrock.stream');
  }
}
