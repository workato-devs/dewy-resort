/**
 * Bedrock Service
 * 
 * Invokes Amazon Bedrock models with streaming support for real-time responses.
 * Supports Claude 3 message format with tool use capabilities.
 */

import {
  BedrockRuntimeClient,
  InvokeModelWithResponseStreamCommand,
  InvokeModelWithResponseStreamCommandOutput,
} from '@aws-sdk/client-bedrock-runtime';
import { TemporaryCredentials } from './identity-pool';
import {
  BedrockStreamingError,
  BedrockInvocationError,
  parseAWSError,
} from './errors';
import { BedrockLogger } from './logger';

/**
 * Message in conversation
 */
export interface BedrockMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * MCP Tool definition
 */
export interface MCPTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * Options for streaming invocation
 */
export interface BedrockStreamOptions {
  model: string;
  messages: BedrockMessage[];
  systemPrompt: string;
  maxTokens?: number;
  temperature?: number;
  tools?: MCPTool[];
}

/**
 * Tool use request from the model
 */
export interface ToolUseRequest {
  id: string;
  name: string;
  input: any;
}

/**
 * Tool result to send back to model
 */
export interface ToolResult {
  tool_use_id: string;
  content: any;
  is_error?: boolean;
}

/**
 * Stream chunk types
 */
export type StreamChunk =
  | { type: 'content_block_start'; index: number; content_block: any }
  | { type: 'content_block_delta'; index: number; delta: { type: 'text_delta'; text: string } | { type: 'input_json_delta'; partial_json: string } }
  | { type: 'content_block_stop'; index: number }
  | { type: 'message_start'; message: any }
  | { type: 'message_delta'; delta: any; usage?: any }
  | { type: 'message_stop' }
  | { type: 'error'; error: string }
  | { type: 'tool_use'; tool_use: ToolUseRequest };

/**
 * Bedrock Service Configuration
 */
export interface BedrockServiceConfig {
  region: string;
  modelId?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

/**
 * Bedrock Service
 * 
 * Manages streaming invocations to Amazon Bedrock models.
 */
export class BedrockService {
  private client: BedrockRuntimeClient;
  private config: BedrockServiceConfig;
  
  // Default configuration
  private readonly DEFAULT_MODEL = 'anthropic.claude-3-sonnet-20240229-v1:0';
  private readonly DEFAULT_MAX_TOKENS = 4096;
  private readonly DEFAULT_TEMPERATURE = 0.7;
  private readonly DEFAULT_TIMEOUT = 60000; // 60 seconds

  constructor(credentials: TemporaryCredentials, config: BedrockServiceConfig) {
    this.config = {
      modelId: config.modelId || this.DEFAULT_MODEL,
      maxTokens: config.maxTokens || this.DEFAULT_MAX_TOKENS,
      temperature: config.temperature || this.DEFAULT_TEMPERATURE,
      timeout: config.timeout || this.DEFAULT_TIMEOUT,
      ...config,
    };

    this.client = new BedrockRuntimeClient({
      region: config.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
      requestHandler: {
        requestTimeout: this.config.timeout,
      } as any,
    });
  }

  /**
   * Stream model invocation with real-time token delivery
   * 
   * @param options - Streaming options
   * @param userId - User ID for logging
   * @param role - User role for logging
   * @param conversationId - Conversation ID for logging
   * @yields Stream chunks as they arrive
   */
  async *streamInvoke(
    options: BedrockStreamOptions,
    userId?: string,
    role?: string,
    conversationId?: string
  ): AsyncGenerator<StreamChunk> {
    const modelId = options.model || this.config.modelId!;
    const startTime = Date.now();
    let tokenCount = 0;
    
    try {
      // Log stream start
      BedrockLogger.logStreamStart(
        userId || 'unknown',
        role || 'unknown',
        modelId,
        conversationId
      );
      
      // Build request body for Claude 3
      const requestBody = this.buildRequestBody(options);

      console.log('[Bedrock Client] Invoking model:', {
        modelId,
        region: this.config.region,
        messageCount: options.messages.length,
        hasTools: !!options.tools && options.tools.length > 0,
        toolCount: options.tools?.length || 0,
        toolNames: options.tools?.map(t => t.name).join(', ') || 'none',
        hasSystemPrompt: !!options.systemPrompt,
      });

      // Create streaming command
      const command = new InvokeModelWithResponseStreamCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody),
      });

      // Invoke with streaming
      const response = await this.client.send(command);

      // Process stream
      if (!response.body) {
        throw new BedrockInvocationError(
          'No response body received from Bedrock',
          'NO_RESPONSE_BODY'
        );
      }

      yield* this.processStream(response, (count) => { tokenCount = count; });
      
      // Log stream complete
      const duration = Date.now() - startTime;
      BedrockLogger.logStreamComplete(
        userId || 'unknown',
        role || 'unknown',
        modelId,
        duration,
        tokenCount,
        conversationId
      );
    } catch (error) {
      // Log stream error
      const duration = Date.now() - startTime;
      BedrockLogger.logStreamError(
        userId || 'unknown',
        role || 'unknown',
        modelId,
        error,
        conversationId
      );
      
      yield* this.handleError(error, modelId);
    }
  }

  /**
   * Build request body for Claude 3 format
   * 
   * @param options - Streaming options
   * @returns Request body object
   */
  private buildRequestBody(options: BedrockStreamOptions): any {
    const body: any = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: options.maxTokens || this.config.maxTokens,
      temperature: options.temperature ?? this.config.temperature,
      messages: options.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    };

    // Add system prompt if provided
    if (options.systemPrompt) {
      body.system = options.systemPrompt;
    }

    // Add tools if provided
    if (options.tools && options.tools.length > 0) {
      body.tools = options.tools;
      console.log('[Bedrock Client] Including tools in request:', 
        options.tools.map(t => `${t.name} (${Object.keys(t.input_schema?.properties || {}).length} params)`).join(', ')
      );
    } else {
      console.log('[Bedrock Client] No tools in request');
    }

    return body;
  }

  /**
   * Process streaming response from Bedrock
   * 
   * @param response - Bedrock streaming response
   * @param onTokenCount - Callback to update token count
   * @yields Parsed stream chunks
   */
  private async *processStream(
    response: InvokeModelWithResponseStreamCommandOutput,
    onTokenCount?: (count: number) => void
  ): AsyncGenerator<StreamChunk> {
    if (!response.body) {
      return;
    }

    let tokenCount = 0;

    try {
      for await (const event of response.body) {
        if (event.chunk) {
          // Decode chunk bytes
          const chunkText = new TextDecoder().decode(event.chunk.bytes);
          
          try {
            const chunkData = JSON.parse(chunkText);
            
            // Track token count from usage data
            if (chunkData.usage?.output_tokens) {
              tokenCount = chunkData.usage.output_tokens;
              if (onTokenCount) {
                onTokenCount(tokenCount);
              }
            }
            
            // Parse and yield chunk based on type
            const parsedChunk = this.parseChunk(chunkData);
            if (parsedChunk) {
              yield parsedChunk;
            }
          } catch (parseError) {
            BedrockLogger.warn(
              'bedrock.stream.parse_error',
              'Failed to parse stream chunk',
              { error: parseError }
            );
            // Continue processing other chunks
          }
        }
      }
    } catch (streamError) {
      BedrockLogger.error(
        'bedrock.stream.processing_error',
        'Stream processing error',
        { error: streamError }
      );
      
      throw new BedrockStreamingError(
        'Stream processing failed',
        { originalError: streamError }
      );
    }
  }

  /**
   * Parse individual chunk from stream
   * 
   * @param chunkData - Raw chunk data
   * @returns Parsed stream chunk or null
   */
  private parseChunk(chunkData: any): StreamChunk | null {
    const type = chunkData.type;

    switch (type) {
      case 'message_start':
        return {
          type: 'message_start',
          message: chunkData.message,
        };

      case 'content_block_start':
        // Check if this is a tool use block
        if (chunkData.content_block?.type === 'tool_use') {
          return {
            type: 'content_block_start',
            index: chunkData.index,
            content_block: chunkData.content_block,
          };
        }
        return {
          type: 'content_block_start',
          index: chunkData.index,
          content_block: chunkData.content_block,
        };

      case 'content_block_delta':
        // Handle text delta
        if (chunkData.delta?.type === 'text_delta') {
          return {
            type: 'content_block_delta',
            index: chunkData.index,
            delta: {
              type: 'text_delta',
              text: chunkData.delta.text,
            },
          };
        }
        
        // Handle tool use input delta
        if (chunkData.delta?.type === 'input_json_delta') {
          return {
            type: 'content_block_delta',
            index: chunkData.index,
            delta: {
              type: 'input_json_delta',
              partial_json: chunkData.delta.partial_json,
            },
          };
        }
        break;

      case 'content_block_stop':
        return {
          type: 'content_block_stop',
          index: chunkData.index,
        };

      case 'message_delta':
        return {
          type: 'message_delta',
          delta: chunkData.delta,
          usage: chunkData.usage,
        };

      case 'message_stop':
        return {
          type: 'message_stop',
        };

      default:
        // Unknown chunk type, log and skip
        BedrockLogger.debug('bedrock.stream.unknown_chunk', 'Unknown chunk type received', { type });
        return null;
    }

    return null;
  }

  /**
   * Detect and extract tool use requests from stream
   * 
   * This method processes content blocks to identify tool use requests.
   * Tool use is indicated by content_block_start with type 'tool_use'.
   * 
   * @param chunks - Array of chunks to process
   * @returns Array of tool use requests
   */
  extractToolUses(chunks: StreamChunk[]): ToolUseRequest[] {
    const toolUses: ToolUseRequest[] = [];
    const toolBlocks = new Map<number, { id?: string; name?: string; input?: string }>();

    for (const chunk of chunks) {
      if (chunk.type === 'content_block_start' && chunk.content_block?.type === 'tool_use') {
        // Start of a tool use block
        toolBlocks.set(chunk.index, {
          id: chunk.content_block.id,
          name: chunk.content_block.name,
          input: '',
        });
      } else if (chunk.type === 'content_block_delta' && chunk.delta.type === 'input_json_delta') {
        // Accumulate tool input JSON
        const block = toolBlocks.get(chunk.index);
        if (block) {
          block.input = (block.input || '') + chunk.delta.partial_json;
        }
      } else if (chunk.type === 'content_block_stop') {
        // End of content block - finalize tool use if present
        const block = toolBlocks.get(chunk.index);
        if (block && block.id && block.name && block.input) {
          try {
            const parsedInput = JSON.parse(block.input);
            toolUses.push({
              id: block.id,
              name: block.name,
              input: parsedInput,
            });
          } catch (error) {
            console.error('Failed to parse tool input JSON:', error);
          }
          toolBlocks.delete(chunk.index);
        }
      }
    }

    return toolUses;
  }

  /**
   * Handle errors during streaming
   * 
   * @param error - Error that occurred
   * @param modelId - Model ID for context
   * @yields Error chunk
   */
  private async *handleError(error: unknown, modelId: string): AsyncGenerator<StreamChunk> {
    // Log the full AWS error for debugging
    console.error('[Bedrock Client] AWS Error:', {
      error,
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : 'Unknown',
      errorCode: (error as any)?.$metadata?.httpStatusCode,
      requestId: (error as any)?.$metadata?.requestId,
      modelId,
    });
    
    // Parse AWS error into Bedrock error
    const bedrockError = parseAWSError(error, modelId);
    
    yield {
      type: 'error',
      error: bedrockError.message,
    };
  }



  /**
   * Create Bedrock service from environment variables
   * 
   * @param credentials - Temporary AWS credentials
   * @returns Bedrock service instance
   */
  static fromEnvironment(credentials: TemporaryCredentials): BedrockService {
    const region = process.env.AWS_REGION || process.env.COGNITO_REGION || 'us-east-1';
    const modelId = process.env.BEDROCK_MODEL_ID;
    const maxTokens = process.env.BEDROCK_MAX_TOKENS
      ? parseInt(process.env.BEDROCK_MAX_TOKENS, 10)
      : undefined;
    const temperature = process.env.BEDROCK_TEMPERATURE
      ? parseFloat(process.env.BEDROCK_TEMPERATURE)
      : undefined;

    return new BedrockService(credentials, {
      region,
      modelId,
      maxTokens,
      temperature,
    });
  }
}
