/**
 * Bedrock Server-Side Client
 * 
 * Uses server-side IAM credentials instead of Cognito Identity Pool credentials.
 * This is a workaround for the Cognito Identity Pool + Bedrock authentication issue.
 * 
 * In production, credentials come from:
 * - ECS Task Role (when running in ECS)
 * - EC2 Instance Role (when running on EC2)
 * - Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
 * - AWS CLI profile (for local development)
 */

import {
  BedrockRuntimeClient,
  InvokeModelWithResponseStreamCommand,
  InvokeModelWithResponseStreamCommandOutput,
} from '@aws-sdk/client-bedrock-runtime';
import {
  BedrockStreamingError,
  BedrockInvocationError,
  parseAWSError,
} from './errors';
import { BedrockLogger } from './logger';
import type {
  BedrockMessage,
  MCPTool,
  BedrockStreamOptions,
  StreamChunk,
  ToolUseRequest,
} from './client';

/**
 * Bedrock Server-Side Service Configuration
 */
export interface BedrockServerConfig {
  region: string;
  modelId?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  profile?: string; // AWS CLI profile for local development
}

/**
 * Bedrock Server-Side Service
 * 
 * Manages streaming invocations to Amazon Bedrock models using server-side IAM credentials.
 */
export class BedrockServerService {
  private client: BedrockRuntimeClient;
  private config: BedrockServerConfig;
  
  // Default configuration
  private readonly DEFAULT_MODEL = 'anthropic.claude-3-sonnet-20240229-v1:0';
  private readonly DEFAULT_MAX_TOKENS = 4096;
  private readonly DEFAULT_TEMPERATURE = 0.7;
  private readonly DEFAULT_TIMEOUT = 60000; // 60 seconds

  constructor(config: BedrockServerConfig) {
    this.config = {
      modelId: config.modelId || this.DEFAULT_MODEL,
      maxTokens: config.maxTokens || this.DEFAULT_MAX_TOKENS,
      temperature: config.temperature || this.DEFAULT_TEMPERATURE,
      timeout: config.timeout || this.DEFAULT_TIMEOUT,
      ...config,
    };

    // Use AWS SDK default credential provider chain
    // This will try (in order):
    // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN)
    // 2. Shared credentials file (~/.aws/credentials) with profile from AWS_PROFILE env var
    // 3. ECS container credentials (AWS_CONTAINER_CREDENTIALS_RELATIVE_URI)
    // 4. EC2 instance metadata service
    
    // Set AWS_PROFILE environment variable if profile is specified
    if (config.profile) {
      process.env.AWS_PROFILE = config.profile;
    }

    this.client = new BedrockRuntimeClient({
      region: config.region,
      // Let SDK use default credential provider chain
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

      console.log('[Bedrock Server Client] Invoking model:', {
        modelId,
        region: this.config.region,
        messageCount: options.messages.length,
        hasTools: !!options.tools && options.tools.length > 0,
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

    if (options.systemPrompt) {
      body.system = options.systemPrompt;
    }

    if (options.tools && options.tools.length > 0) {
      body.tools = options.tools;
    }

    return body;
  }

  /**
   * Process streaming response from Bedrock
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
          const chunkText = new TextDecoder().decode(event.chunk.bytes);
          
          try {
            const chunkData = JSON.parse(chunkText);
            
            if (chunkData.usage?.output_tokens) {
              tokenCount = chunkData.usage.output_tokens;
              if (onTokenCount) {
                onTokenCount(tokenCount);
              }
            }
            
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
   */
  private parseChunk(chunkData: any): StreamChunk | null {
    const type = chunkData.type;

    switch (type) {
      case 'message_start':
        return { type: 'message_start', message: chunkData.message };

      case 'content_block_start':
        return {
          type: 'content_block_start',
          index: chunkData.index,
          content_block: chunkData.content_block,
        };

      case 'content_block_delta':
        if (chunkData.delta?.type === 'text_delta') {
          return {
            type: 'content_block_delta',
            index: chunkData.index,
            delta: { type: 'text_delta', text: chunkData.delta.text },
          };
        }
        
        if (chunkData.delta?.type === 'input_json_delta') {
          return {
            type: 'content_block_delta',
            index: chunkData.index,
            delta: { type: 'input_json_delta', partial_json: chunkData.delta.partial_json },
          };
        }
        break;

      case 'content_block_stop':
        return { type: 'content_block_stop', index: chunkData.index };

      case 'message_delta':
        return {
          type: 'message_delta',
          delta: chunkData.delta,
          usage: chunkData.usage,
        };

      case 'message_stop':
        return { type: 'message_stop' };

      default:
        BedrockLogger.debug('bedrock.stream.unknown_chunk', 'Unknown chunk type received', { type });
        return null;
    }

    return null;
  }

  /**
   * Handle errors during streaming
   */
  private async *handleError(error: unknown, modelId: string): AsyncGenerator<StreamChunk> {
    console.error('[Bedrock Server Client] Error:', {
      error,
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : 'Unknown',
      modelId,
    });
    
    const bedrockError = parseAWSError(error, modelId);
    
    yield {
      type: 'error',
      error: bedrockError.message,
    };
  }

  /**
   * Create Bedrock server service from environment variables
   */
  static fromEnvironment(): BedrockServerService {
    const region = process.env.AWS_REGION || process.env.COGNITO_REGION || 'us-west-2';
    const modelId = process.env.BEDROCK_MODEL_ID;
    const maxTokens = process.env.BEDROCK_MAX_TOKENS
      ? parseInt(process.env.BEDROCK_MAX_TOKENS, 10)
      : undefined;
    const temperature = process.env.BEDROCK_TEMPERATURE
      ? parseFloat(process.env.BEDROCK_TEMPERATURE)
      : undefined;
    const profile = process.env.AWS_PROFILE;

    return new BedrockServerService({
      region,
      modelId,
      maxTokens,
      temperature,
      profile,
    });
  }
}
