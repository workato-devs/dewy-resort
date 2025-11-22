/**
 * Bedrock Logging Module
 * 
 * Provides structured logging for all Bedrock operations with
 * sensitive data redaction and environment-aware logging levels.
 */

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Log event types for Bedrock operations
 */
export enum BedrockLogEvent {
  // Identity Pool events
  IDENTITY_EXCHANGE = 'bedrock.identity.exchange',
  IDENTITY_REFRESH = 'bedrock.identity.refresh',
  IDENTITY_ERROR = 'bedrock.identity.error',
  
  // Bedrock streaming events
  STREAM_START = 'bedrock.stream.start',
  STREAM_TOKEN = 'bedrock.stream.token',
  STREAM_COMPLETE = 'bedrock.stream.complete',
  STREAM_ERROR = 'bedrock.stream.error',
  
  // Tool invocation events
  TOOL_INVOKE = 'bedrock.tool.invoke',
  TOOL_COMPLETE = 'bedrock.tool.complete',
  TOOL_ERROR = 'bedrock.tool.error',
  
  // MCP events
  MCP_SERVER_CONNECT = 'bedrock.mcp.server.connect',
  MCP_SERVER_DISCONNECT = 'bedrock.mcp.server.disconnect',
  MCP_SERVER_ERROR = 'bedrock.mcp.server.error',
  MCP_TOOL_DISCOVER = 'bedrock.mcp.tool.discover',
  
  // Conversation events
  CONVERSATION_CREATE = 'bedrock.conversation.create',
  CONVERSATION_MESSAGE = 'bedrock.conversation.message',
  CONVERSATION_EXPIRE = 'bedrock.conversation.expire',
  
  // Configuration events
  CONFIG_LOAD = 'bedrock.config.load',
  CONFIG_ERROR = 'bedrock.config.error',
  
  // Prompt events
  PROMPT_LOAD = 'bedrock.prompt.load',
  PROMPT_ERROR = 'bedrock.prompt.error',
}

/**
 * Log metadata interface
 */
export interface LogMetadata {
  userId?: string;
  role?: string;
  conversationId?: string;
  modelId?: string;
  toolName?: string;
  serverName?: string;
  duration?: number;
  tokenCount?: number;
  error?: any;
  [key: string]: any;
}

/**
 * Bedrock Logger class
 */
export class BedrockLogger {
  private static isDevelopment = process.env.NODE_ENV === 'development';
  private static isTest = process.env.NODE_ENV === 'test';
  
  /**
   * Get current log level from environment
   */
  private static getLogLevel(): LogLevel {
    const level = process.env.BEDROCK_LOG_LEVEL?.toLowerCase();
    
    if (this.isTest) {
      return LogLevel.ERROR; // Only errors in tests
    }
    
    switch (level) {
      case 'debug':
        return LogLevel.DEBUG;
      case 'info':
        return LogLevel.INFO;
      case 'warn':
        return LogLevel.WARN;
      case 'error':
        return LogLevel.ERROR;
      default:
        return this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
    }
  }
  
  /**
   * Check if log level should be logged
   */
  private static shouldLog(level: LogLevel): boolean {
    const currentLevel = this.getLogLevel();
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentIndex = levels.indexOf(currentLevel);
    const targetIndex = levels.indexOf(level);
    return targetIndex >= currentIndex;
  }
  
  /**
   * Redact sensitive data from metadata
   */
  private static redactSensitiveData(metadata: LogMetadata): LogMetadata {
    const redacted = { ...metadata };
    
    // Redact AWS credentials
    if (redacted.credentials) {
      redacted.credentials = '[REDACTED]';
    }
    if (redacted.accessKeyId) {
      redacted.accessKeyId = '[REDACTED]';
    }
    if (redacted.secretAccessKey) {
      redacted.secretAccessKey = '[REDACTED]';
    }
    if (redacted.sessionToken) {
      redacted.sessionToken = '[REDACTED]';
    }
    
    // Redact ID tokens
    if (redacted.idToken) {
      redacted.idToken = '[REDACTED]';
    }
    if (redacted.token) {
      redacted.token = '[REDACTED]';
    }
    
    // Redact full conversation content (keep metadata only)
    if (redacted.messages && Array.isArray(redacted.messages)) {
      redacted.messages = `[${redacted.messages.length} messages]`;
    }
    if (redacted.content && typeof redacted.content === 'string' && redacted.content.length > 100) {
      redacted.content = `${redacted.content.substring(0, 100)}... [${redacted.content.length} chars]`;
    }
    
    // Redact MCP authentication
    if (redacted.auth) {
      redacted.auth = '[REDACTED]';
    }
    
    // Redact error stack traces in production
    if (redacted.error && !this.isDevelopment) {
      if (redacted.error.stack) {
        delete redacted.error.stack;
      }
    }
    
    return redacted;
  }
  
  /**
   * Format log message
   */
  private static formatLog(
    level: LogLevel,
    event: BedrockLogEvent | string,
    message: string,
    metadata?: LogMetadata
  ): string {
    const timestamp = new Date().toISOString();
    const redactedMetadata = metadata ? this.redactSensitiveData(metadata) : {};
    
    const logObject = {
      timestamp,
      level,
      event,
      message,
      ...redactedMetadata,
    };
    
    if (this.isDevelopment) {
      // Pretty print in development
      return JSON.stringify(logObject, null, 2);
    } else {
      // Single line in production
      return JSON.stringify(logObject);
    }
  }
  
  /**
   * Log debug message
   */
  static debug(event: BedrockLogEvent | string, message: string, metadata?: LogMetadata): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const formatted = this.formatLog(LogLevel.DEBUG, event, message, metadata);
    console.log(formatted);
  }
  
  /**
   * Log info message
   */
  static info(event: BedrockLogEvent | string, message: string, metadata?: LogMetadata): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const formatted = this.formatLog(LogLevel.INFO, event, message, metadata);
    console.log(formatted);
  }
  
  /**
   * Log warning message
   */
  static warn(event: BedrockLogEvent | string, message: string, metadata?: LogMetadata): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const formatted = this.formatLog(LogLevel.WARN, event, message, metadata);
    console.warn(formatted);
  }
  
  /**
   * Log error message
   */
  static error(event: BedrockLogEvent | string, message: string, metadata?: LogMetadata): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const formatted = this.formatLog(LogLevel.ERROR, event, message, metadata);
    console.error(formatted);
  }
  
  /**
   * Log Identity Pool credential exchange
   */
  static logIdentityExchange(userId: string, role: string, success: boolean, duration: number): void {
    if (success) {
      this.info(BedrockLogEvent.IDENTITY_EXCHANGE, 'Identity Pool credential exchange successful', {
        userId,
        role,
        duration,
      });
    } else {
      this.error(BedrockLogEvent.IDENTITY_ERROR, 'Identity Pool credential exchange failed', {
        userId,
        role,
        duration,
      });
    }
  }
  
  /**
   * Log Bedrock stream start
   */
  static logStreamStart(userId: string, role: string, modelId: string, conversationId?: string): void {
    this.info(BedrockLogEvent.STREAM_START, 'Started Bedrock streaming invocation', {
      userId,
      role,
      modelId,
      conversationId,
    });
  }
  
  /**
   * Log Bedrock stream complete
   */
  static logStreamComplete(
    userId: string,
    role: string,
    modelId: string,
    duration: number,
    tokenCount?: number,
    conversationId?: string
  ): void {
    this.info(BedrockLogEvent.STREAM_COMPLETE, 'Bedrock streaming completed', {
      userId,
      role,
      modelId,
      duration,
      tokenCount,
      conversationId,
    });
  }
  
  /**
   * Log Bedrock stream error
   */
  static logStreamError(
    userId: string,
    role: string,
    modelId: string,
    error: any,
    conversationId?: string
  ): void {
    this.error(BedrockLogEvent.STREAM_ERROR, 'Bedrock streaming error', {
      userId,
      role,
      modelId,
      conversationId,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
      },
    });
  }
  
  /**
   * Log MCP tool invocation
   */
  static logToolInvoke(
    userId: string,
    role: string,
    toolName: string,
    conversationId?: string
  ): void {
    this.info(BedrockLogEvent.TOOL_INVOKE, 'MCP tool invocation requested', {
      userId,
      role,
      toolName,
      conversationId,
    });
  }
  
  /**
   * Log MCP tool completion
   */
  static logToolComplete(
    userId: string,
    role: string,
    toolName: string,
    duration: number,
    success: boolean,
    conversationId?: string
  ): void {
    if (success) {
      this.info(BedrockLogEvent.TOOL_COMPLETE, 'MCP tool execution completed', {
        userId,
        role,
        toolName,
        duration,
        conversationId,
      });
    } else {
      this.error(BedrockLogEvent.TOOL_ERROR, 'MCP tool execution failed', {
        userId,
        role,
        toolName,
        duration,
        conversationId,
      });
    }
  }
  
  /**
   * Log MCP server connection
   */
  static logMCPServerConnect(role: string, serverName: string, success: boolean): void {
    if (success) {
      this.info(BedrockLogEvent.MCP_SERVER_CONNECT, 'MCP server connected', {
        role,
        serverName,
      });
    } else {
      this.error(BedrockLogEvent.MCP_SERVER_ERROR, 'MCP server connection failed', {
        role,
        serverName,
      });
    }
  }
  
  /**
   * Log conversation creation
   */
  static logConversationCreate(userId: string, role: string, conversationId: string): void {
    this.info(BedrockLogEvent.CONVERSATION_CREATE, 'Conversation created', {
      userId,
      role,
      conversationId,
    });
  }
  
  /**
   * Log conversation message
   */
  static logConversationMessage(
    userId: string,
    role: string,
    conversationId: string,
    messageRole: 'user' | 'assistant'
  ): void {
    this.debug(BedrockLogEvent.CONVERSATION_MESSAGE, 'Message added to conversation', {
      userId,
      role,
      conversationId,
      messageRole,
    });
  }
  
  /**
   * Log configuration load
   */
  static logConfigLoad(type: 'mcp' | 'prompt', role: string, success: boolean): void {
    if (success) {
      this.info(BedrockLogEvent.CONFIG_LOAD, `${type} configuration loaded`, {
        type,
        role,
      });
    } else {
      this.error(BedrockLogEvent.CONFIG_ERROR, `${type} configuration load failed`, {
        type,
        role,
      });
    }
  }
}

/**
 * Export convenience functions
 */
export const logIdentityExchange = BedrockLogger.logIdentityExchange.bind(BedrockLogger);
export const logStreamStart = BedrockLogger.logStreamStart.bind(BedrockLogger);
export const logStreamComplete = BedrockLogger.logStreamComplete.bind(BedrockLogger);
export const logStreamError = BedrockLogger.logStreamError.bind(BedrockLogger);
export const logToolInvoke = BedrockLogger.logToolInvoke.bind(BedrockLogger);
export const logToolComplete = BedrockLogger.logToolComplete.bind(BedrockLogger);
export const logMCPServerConnect = BedrockLogger.logMCPServerConnect.bind(BedrockLogger);
export const logConversationCreate = BedrockLogger.logConversationCreate.bind(BedrockLogger);
export const logConversationMessage = BedrockLogger.logConversationMessage.bind(BedrockLogger);
export const logConfigLoad = BedrockLogger.logConfigLoad.bind(BedrockLogger);
