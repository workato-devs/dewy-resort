/**
 * Bedrock Error Handling Module
 * 
 * Defines custom error classes for Amazon Bedrock integration failures
 * and provides structured error handling with user-friendly messages.
 */

/**
 * Base Bedrock error class
 */
export class BedrockError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'BedrockError';
    Object.setPrototypeOf(this, BedrockError.prototype);
  }
}

/**
 * Configuration error for Bedrock setup
 */
export class BedrockConfigurationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'BedrockConfigurationError';
    Object.setPrototypeOf(this, BedrockConfigurationError.prototype);
  }
}

/**
 * Identity Pool credential exchange errors
 */
export class IdentityPoolError extends BedrockError {
  constructor(message: string, details?: any) {
    super(message, 'IDENTITY_POOL_ERROR', 500, details);
    this.name = 'IdentityPoolError';
    Object.setPrototypeOf(this, IdentityPoolError.prototype);
  }
}

/**
 * Bedrock model invocation errors
 */
export class BedrockInvocationError extends BedrockError {
  constructor(message: string, code: string, statusCode: number = 500, details?: any) {
    super(message, code, statusCode, details);
    this.name = 'BedrockInvocationError';
    Object.setPrototypeOf(this, BedrockInvocationError.prototype);
  }
}

/**
 * Bedrock throttling error (429)
 */
export class BedrockThrottlingError extends BedrockError {
  constructor(message: string = 'Too many requests. Please wait a moment.', details?: any) {
    super(message, 'THROTTLING_ERROR', 429, details);
    this.name = 'BedrockThrottlingError';
    Object.setPrototypeOf(this, BedrockThrottlingError.prototype);
  }
}

/**
 * Bedrock timeout error
 */
export class BedrockTimeoutError extends BedrockError {
  constructor(message: string = 'Request timed out. Please try again.', details?: any) {
    super(message, 'TIMEOUT_ERROR', 408, details);
    this.name = 'BedrockTimeoutError';
    Object.setPrototypeOf(this, BedrockTimeoutError.prototype);
  }
}

/**
 * Bedrock model not found error
 */
export class BedrockModelNotFoundError extends BedrockError {
  constructor(modelId: string, details?: any) {
    super(`Model not found: ${modelId}`, 'MODEL_NOT_FOUND', 404, details);
    this.name = 'BedrockModelNotFoundError';
    Object.setPrototypeOf(this, BedrockModelNotFoundError.prototype);
  }
}

/**
 * Bedrock access denied error
 */
export class BedrockAccessDeniedError extends BedrockError {
  constructor(message: string = 'Access denied to Bedrock service', details?: any) {
    super(message, 'ACCESS_DENIED', 403, details);
    this.name = 'BedrockAccessDeniedError';
    Object.setPrototypeOf(this, BedrockAccessDeniedError.prototype);
  }
}

/**
 * Bedrock streaming error
 */
export class BedrockStreamingError extends BedrockError {
  constructor(message: string = 'Connection lost. Please try again.', details?: any) {
    super(message, 'STREAMING_ERROR', 500, details);
    this.name = 'BedrockStreamingError';
    Object.setPrototypeOf(this, BedrockStreamingError.prototype);
  }
}

/**
 * MCP (Model Context Protocol) errors
 */
export class MCPError extends BedrockError {
  constructor(message: string, code: string, statusCode: number = 500, details?: any) {
    super(message, code, statusCode, details);
    this.name = 'MCPError';
    Object.setPrototypeOf(this, MCPError.prototype);
  }
}

/**
 * MCP configuration error
 */
export class MCPConfigurationError extends MCPError {
  constructor(message: string, details?: any) {
    super(message, 'MCP_CONFIG_ERROR', 500, details);
    this.name = 'MCPConfigurationError';
    Object.setPrototypeOf(this, MCPConfigurationError.prototype);
  }
}

/**
 * MCP server connection error
 */
export class MCPServerError extends MCPError {
  constructor(serverName: string, message: string, details?: any) {
    super(`MCP server '${serverName}' error: ${message}`, 'MCP_SERVER_ERROR', 502, details);
    this.name = 'MCPServerError';
    Object.setPrototypeOf(this, MCPServerError.prototype);
  }
}

/**
 * MCP tool execution error
 */
export class MCPToolExecutionError extends MCPError {
  constructor(toolName: string, message: string, details?: any) {
    super(`Tool '${toolName}' execution failed: ${message}`, 'MCP_TOOL_ERROR', 500, details);
    this.name = 'MCPToolExecutionError';
    Object.setPrototypeOf(this, MCPToolExecutionError.prototype);
  }
}

/**
 * MCP tool access denied error
 */
export class MCPToolAccessDeniedError extends MCPError {
  constructor(toolName: string, role: string, details?: any) {
    super(`Role '${role}' does not have access to tool '${toolName}'`, 'MCP_ACCESS_DENIED', 403, details);
    this.name = 'MCPToolAccessDeniedError';
    Object.setPrototypeOf(this, MCPToolAccessDeniedError.prototype);
  }
}

/**
 * MCP tool timeout error
 */
export class MCPToolTimeoutError extends MCPError {
  constructor(toolName: string, timeoutMs: number, details?: any) {
    super(`Tool '${toolName}' timed out after ${timeoutMs}ms`, 'MCP_TOOL_TIMEOUT', 408, details);
    this.name = 'MCPToolTimeoutError';
    Object.setPrototypeOf(this, MCPToolTimeoutError.prototype);
  }
}

/**
 * Conversation management errors
 */
export class ConversationError extends BedrockError {
  constructor(message: string, code: string, details?: any) {
    super(message, code, 500, details);
    this.name = 'ConversationError';
    Object.setPrototypeOf(this, ConversationError.prototype);
  }
}

/**
 * Conversation not found error
 */
export class ConversationNotFoundError extends ConversationError {
  constructor(conversationId: string, details?: any) {
    super(`Conversation not found: ${conversationId}`, 'CONVERSATION_NOT_FOUND', details);
    this.name = 'ConversationNotFoundError';
    Object.setPrototypeOf(this, ConversationNotFoundError.prototype);
  }
}

/**
 * User-friendly error messages for common scenarios
 */
export const USER_ERROR_MESSAGES = {
  // Configuration errors
  CONFIG_AUTH_PROVIDER: 'AI chat requires Cognito authentication',
  CONFIG_IDENTITY_POOL: 'AI chat service not configured',
  CONFIG_BEDROCK: 'AI service configuration error',
  
  // Authentication errors
  AUTH_SESSION_INVALID: 'Please log in to use chat',
  AUTH_SESSION_EXPIRED: 'Session expired. Please log in again.',
  AUTH_IDENTITY_POOL: 'Unable to authenticate with AI service',
  
  // Bedrock errors
  BEDROCK_UNAVAILABLE: 'AI service temporarily unavailable',
  BEDROCK_THROTTLING: 'Too many requests. Please wait a moment.',
  BEDROCK_TIMEOUT: 'Request timed out. Please try again.',
  BEDROCK_MODEL_NOT_FOUND: 'AI model not available',
  BEDROCK_ACCESS_DENIED: 'Access denied to AI service',
  BEDROCK_STREAMING: 'Connection lost. Please try again.',
  
  // MCP errors
  MCP_SERVER_UNAVAILABLE: 'Some tools are temporarily unavailable',
  MCP_TOOL_FAILED: 'Unable to complete action. Please try again.',
  MCP_TOOL_ACCESS_DENIED: "You don't have permission for this action",
  MCP_TOOL_TIMEOUT: 'Action timed out. Please try again.',
  
  // Generic
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
} as const;

/**
 * Get user-friendly error message from error
 */
export function getUserErrorMessage(error: unknown): string {
  if (error instanceof BedrockConfigurationError) {
    return USER_ERROR_MESSAGES.CONFIG_BEDROCK;
  }
  
  if (error instanceof IdentityPoolError) {
    return USER_ERROR_MESSAGES.AUTH_IDENTITY_POOL;
  }
  
  if (error instanceof BedrockThrottlingError) {
    return USER_ERROR_MESSAGES.BEDROCK_THROTTLING;
  }
  
  if (error instanceof BedrockTimeoutError) {
    return USER_ERROR_MESSAGES.BEDROCK_TIMEOUT;
  }
  
  if (error instanceof BedrockModelNotFoundError) {
    return USER_ERROR_MESSAGES.BEDROCK_MODEL_NOT_FOUND;
  }
  
  if (error instanceof BedrockAccessDeniedError) {
    return USER_ERROR_MESSAGES.BEDROCK_ACCESS_DENIED;
  }
  
  if (error instanceof BedrockStreamingError) {
    return USER_ERROR_MESSAGES.BEDROCK_STREAMING;
  }
  
  if (error instanceof MCPToolAccessDeniedError) {
    return USER_ERROR_MESSAGES.MCP_TOOL_ACCESS_DENIED;
  }
  
  if (error instanceof MCPToolTimeoutError) {
    return USER_ERROR_MESSAGES.MCP_TOOL_TIMEOUT;
  }
  
  if (error instanceof MCPToolExecutionError) {
    return USER_ERROR_MESSAGES.MCP_TOOL_FAILED;
  }
  
  if (error instanceof MCPServerError) {
    return USER_ERROR_MESSAGES.MCP_SERVER_UNAVAILABLE;
  }
  
  if (error instanceof BedrockInvocationError) {
    return USER_ERROR_MESSAGES.BEDROCK_UNAVAILABLE;
  }
  
  if (error instanceof BedrockError || error instanceof MCPError) {
    return USER_ERROR_MESSAGES.BEDROCK_UNAVAILABLE;
  }
  
  return USER_ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof BedrockThrottlingError) {
    return true;
  }
  
  if (error instanceof BedrockTimeoutError) {
    return true;
  }
  
  if (error instanceof BedrockStreamingError) {
    return true;
  }
  
  if (error instanceof MCPServerError) {
    return true;
  }
  
  if (error instanceof MCPToolTimeoutError) {
    return true;
  }
  
  if (error instanceof BedrockInvocationError) {
    // Retry on 5xx errors
    return error.statusCode >= 500 && error.statusCode < 600;
  }
  
  return false;
}

/**
 * Check if error is a Bedrock-related error
 */
export function isBedrockError(error: unknown): error is BedrockError {
  return error instanceof BedrockError;
}

/**
 * Check if error is an MCP-related error
 */
export function isMCPError(error: unknown): error is MCPError {
  return error instanceof MCPError;
}

/**
 * Parse AWS SDK error and convert to Bedrock error
 */
export function parseAWSError(error: any, context: string): BedrockError {
  const errorName = error.name || error.__type || 'Unknown';
  const errorMessage = error.message || 'Unknown error';
  
  // Throttling errors
  if (errorName === 'ThrottlingException' || errorName === 'TooManyRequestsException') {
    return new BedrockThrottlingError(errorMessage, { context, originalError: error });
  }
  
  // Timeout errors
  if (errorName === 'TimeoutError' || error.code === 'ETIMEDOUT') {
    return new BedrockTimeoutError(errorMessage, { context, originalError: error });
  }
  
  // Model not found
  if (errorName === 'ResourceNotFoundException' || errorName === 'ModelNotFoundException') {
    return new BedrockModelNotFoundError(context, { originalError: error });
  }
  
  // Access denied
  if (errorName === 'AccessDeniedException' || errorName === 'UnauthorizedException') {
    return new BedrockAccessDeniedError(errorMessage, { context, originalError: error });
  }
  
  // Validation errors
  if (errorName === 'ValidationException') {
    return new BedrockInvocationError(
      errorMessage,
      'VALIDATION_ERROR',
      400,
      { context, originalError: error }
    );
  }
  
  // Service errors
  if (errorName === 'ServiceUnavailableException' || errorName === 'InternalServerException') {
    return new BedrockInvocationError(
      errorMessage,
      'SERVICE_ERROR',
      503,
      { context, originalError: error }
    );
  }
  
  // Generic error
  return new BedrockInvocationError(
    errorMessage,
    'INVOCATION_ERROR',
    500,
    { context, originalError: error }
  );
}
