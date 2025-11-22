# Bedrock Error Handling and Logging

This document describes the error handling and logging implementation for the Amazon Bedrock integration.

## Error Classes

### Base Error Classes

#### `BedrockError`
Base class for all Bedrock-related errors.

```typescript
class BedrockError extends Error {
  code: string;
  statusCode: number;
  details?: any;
}
```

#### `BedrockConfigurationError`
Thrown when Bedrock configuration is invalid or incomplete.

**Common Causes:**
- Missing environment variables
- Invalid Identity Pool ID format
- Missing Cognito configuration

**User Message:** "AI chat service not configured"

### Identity Pool Errors

#### `IdentityPoolError`
Thrown when credential exchange with Cognito Identity Pool fails.

**Common Causes:**
- Invalid ID token
- Expired ID token
- Identity Pool not found
- IAM role mapping issues

**User Message:** "Unable to authenticate with AI service"

### Bedrock Invocation Errors

#### `BedrockInvocationError`
Generic error for Bedrock model invocation failures.

**Common Causes:**
- Invalid request format
- Model not available
- Service errors

**User Message:** "AI service temporarily unavailable"

#### `BedrockThrottlingError`
Thrown when Bedrock API rate limits are exceeded.

**HTTP Status:** 429

**User Message:** "Too many requests. Please wait a moment."

**Retry:** Yes (with exponential backoff)

#### `BedrockTimeoutError`
Thrown when Bedrock request times out.

**HTTP Status:** 408

**User Message:** "Request timed out. Please try again."

**Retry:** Yes

#### `BedrockModelNotFoundError`
Thrown when the specified Bedrock model is not found or not accessible.

**HTTP Status:** 404

**User Message:** "AI model not available"

**Retry:** No

#### `BedrockAccessDeniedError`
Thrown when IAM permissions are insufficient for Bedrock access.

**HTTP Status:** 403

**User Message:** "Access denied to AI service"

**Retry:** No

#### `BedrockStreamingError`
Thrown when streaming connection is interrupted or fails.

**User Message:** "Connection lost. Please try again."

**Retry:** Yes

### MCP Errors

#### `MCPError`
Base class for MCP (Model Context Protocol) errors.

#### `MCPConfigurationError`
Thrown when MCP configuration is invalid.

**Common Causes:**
- Missing MCP configuration file
- Invalid JSON format
- Missing required fields

**User Message:** "Some tools are temporarily unavailable"

#### `MCPServerError`
Thrown when MCP server connection or communication fails.

**Common Causes:**
- Server not reachable
- Authentication failure
- Server returned error

**User Message:** "Some tools are temporarily unavailable"

**Retry:** Yes

#### `MCPToolExecutionError`
Thrown when MCP tool execution fails.

**Common Causes:**
- Invalid tool input
- Tool execution timeout
- Tool returned error

**User Message:** "Unable to complete action. Please try again."

**Retry:** No (unless timeout)

#### `MCPToolAccessDeniedError`
Thrown when user role doesn't have access to requested tool.

**HTTP Status:** 403

**User Message:** "You don't have permission for this action"

**Retry:** No

#### `MCPToolTimeoutError`
Thrown when MCP tool execution exceeds timeout (default: 30 seconds).

**HTTP Status:** 408

**User Message:** "Action timed out. Please try again."

**Retry:** Yes

### Conversation Errors

#### `ConversationError`
Base class for conversation management errors.

#### `ConversationNotFoundError`
Thrown when conversation is not found or has expired.

**Common Causes:**
- Invalid conversation ID
- Conversation expired (24 hours)
- Conversation cleared

## Error Handling Utilities

### `getUserErrorMessage(error: unknown): string`
Returns user-friendly error message for any error.

```typescript
import { getUserErrorMessage } from './errors';

try {
  await bedrockService.streamInvoke(options);
} catch (error) {
  const userMessage = getUserErrorMessage(error);
  // Display userMessage to user
}
```

### `isRetryableError(error: unknown): boolean`
Determines if an error should trigger a retry.

```typescript
import { isRetryableError } from './errors';

try {
  await operation();
} catch (error) {
  if (isRetryableError(error)) {
    // Implement retry logic with exponential backoff
  }
}
```

### `parseAWSError(error: any, context: string): BedrockError`
Converts AWS SDK errors to Bedrock errors.

```typescript
import { parseAWSError } from './errors';

try {
  await client.send(command);
} catch (error) {
  throw parseAWSError(error, 'model invocation');
}
```

## Logging

### Log Levels

The logging system supports four levels:

- **DEBUG**: Detailed information for debugging (token-level events)
- **INFO**: General informational messages (stream start/complete, tool invocations)
- **WARN**: Warning messages (fallback prompts, parse errors)
- **ERROR**: Error messages (failures, exceptions)

### Configuration

Set log level via environment variable:

```bash
# In .env
BEDROCK_LOG_LEVEL=info
```

**Default Behavior:**
- Development: `DEBUG` level
- Production: `INFO` level
- Test: `ERROR` level only

### Log Events

All Bedrock operations emit structured log events:

#### Identity Pool Events
- `bedrock.identity.exchange` - Credential exchange
- `bedrock.identity.refresh` - Credential refresh
- `bedrock.identity.error` - Identity Pool errors

#### Streaming Events
- `bedrock.stream.start` - Stream invocation started
- `bedrock.stream.token` - Token received (DEBUG only)
- `bedrock.stream.complete` - Stream completed
- `bedrock.stream.error` - Stream error

#### Tool Events
- `bedrock.tool.invoke` - Tool invocation requested
- `bedrock.tool.complete` - Tool execution completed
- `bedrock.tool.error` - Tool execution failed

#### MCP Events
- `bedrock.mcp.server.connect` - MCP server connected
- `bedrock.mcp.server.disconnect` - MCP server disconnected
- `bedrock.mcp.server.error` - MCP server error
- `bedrock.mcp.tool.discover` - Tools discovered from server

#### Conversation Events
- `bedrock.conversation.create` - Conversation created
- `bedrock.conversation.message` - Message added
- `bedrock.conversation.expire` - Conversation expired

#### Configuration Events
- `bedrock.config.load` - Configuration loaded
- `bedrock.config.error` - Configuration load failed
- `bedrock.prompt.load` - Prompt loaded
- `bedrock.prompt.error` - Prompt load failed

### Sensitive Data Redaction

The logging system automatically redacts sensitive data:

**Redacted Fields:**
- AWS credentials (accessKeyId, secretAccessKey, sessionToken)
- ID tokens and authentication tokens
- Full conversation content (only metadata logged)
- MCP authentication credentials
- Error stack traces (in production)

### Usage Examples

#### Using BedrockLogger Directly

```typescript
import { BedrockLogger, BedrockLogEvent } from './logger';

// Log stream start
BedrockLogger.logStreamStart(userId, role, modelId, conversationId);

// Log tool invocation
BedrockLogger.logToolInvoke(userId, role, toolName, conversationId);

// Log custom event
BedrockLogger.info(
  BedrockLogEvent.CONFIG_LOAD,
  'Configuration loaded successfully',
  { role, configType: 'mcp' }
);
```

#### Using Convenience Functions

```typescript
import {
  logStreamStart,
  logStreamComplete,
  logToolInvoke,
} from './logger';

logStreamStart(userId, role, modelId);
// ... streaming ...
logStreamComplete(userId, role, modelId, duration, tokenCount);
```

### Log Format

#### Development (Pretty Print)
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "event": "bedrock.stream.start",
  "message": "Started Bedrock streaming invocation",
  "userId": "user123",
  "role": "guest",
  "modelId": "anthropic.claude-3-sonnet-20240229-v1:0",
  "conversationId": "conv_abc123"
}
```

#### Production (Single Line)
```json
{"timestamp":"2024-01-15T10:30:00.000Z","level":"info","event":"bedrock.stream.start","message":"Started Bedrock streaming invocation","userId":"user123","role":"guest","modelId":"anthropic.claude-3-sonnet-20240229-v1:0","conversationId":"conv_abc123"}
```

## Best Practices

### Error Handling

1. **Always use specific error classes** - Don't throw generic `Error` objects
2. **Include context in error details** - Add userId, role, conversationId when available
3. **Log errors before throwing** - Use BedrockLogger to log errors with context
4. **Return user-friendly messages** - Use `getUserErrorMessage()` for user-facing errors
5. **Implement retry logic** - Use `isRetryableError()` to determine retry eligibility

### Logging

1. **Use appropriate log levels** - DEBUG for detailed info, INFO for operations, WARN for issues, ERROR for failures
2. **Include relevant metadata** - Add userId, role, duration, etc. to log entries
3. **Don't log sensitive data** - The logger redacts automatically, but be cautious
4. **Use structured logging** - Always use log events and metadata, not string concatenation
5. **Log at operation boundaries** - Log start and completion of major operations

### Example: Complete Error Handling

```typescript
import {
  BedrockService,
  getUserErrorMessage,
  isRetryableError,
  BedrockLogger,
} from './bedrock';

async function streamChatResponse(
  userId: string,
  role: string,
  message: string,
  conversationId: string
) {
  const maxRetries = 3;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      const service = BedrockService.fromEnvironment(credentials);
      
      for await (const chunk of service.streamInvoke(
        options,
        userId,
        role,
        conversationId
      )) {
        // Process chunk
        yield chunk;
      }
      
      return; // Success
    } catch (error) {
      attempt++;
      
      if (!isRetryableError(error) || attempt >= maxRetries) {
        // Not retryable or max retries reached
        const userMessage = getUserErrorMessage(error);
        throw new Error(userMessage);
      }
      
      // Wait before retry (exponential backoff)
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## Monitoring and Debugging

### Viewing Logs

**Development:**
```bash
# All logs with pretty printing
npm run dev

# Only errors
BEDROCK_LOG_LEVEL=error npm run dev
```

**Production:**
```bash
# Parse JSON logs
cat logs/app.log | jq 'select(.event | startswith("bedrock."))'

# Filter by event type
cat logs/app.log | jq 'select(.event == "bedrock.stream.error")'

# Filter by user
cat logs/app.log | jq 'select(.userId == "user123")'
```

### Common Issues

#### High Error Rate
```bash
# Check error distribution
cat logs/app.log | jq 'select(.level == "error") | .event' | sort | uniq -c
```

#### Slow Performance
```bash
# Check operation durations
cat logs/app.log | jq 'select(.duration) | {event, duration}' | jq -s 'group_by(.event) | map({event: .[0].event, avg: (map(.duration) | add / length)})'
```

#### Tool Failures
```bash
# Check tool execution success rate
cat logs/app.log | jq 'select(.event == "bedrock.tool.complete") | {toolName, success: (.duration < 30000)}'
```

## Security Considerations

1. **Never log credentials** - The logger redacts automatically, but verify in production
2. **Limit conversation content in logs** - Only log metadata, not full messages
3. **Sanitize error messages** - Don't expose internal details to users
4. **Monitor for suspicious patterns** - Watch for repeated access denied errors
5. **Audit tool invocations** - All tool calls are logged with user ID for audit trail

## Testing

### Unit Tests

```typescript
import { BedrockLogger, BedrockLogEvent } from './logger';

describe('BedrockLogger', () => {
  it('should redact sensitive data', () => {
    const metadata = {
      userId: 'user123',
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      sessionToken: 'secret-token',
    };
    
    // Logger will redact accessKeyId and sessionToken
    BedrockLogger.info(BedrockLogEvent.IDENTITY_EXCHANGE, 'Test', metadata);
  });
});
```

### Integration Tests

```typescript
import { getUserErrorMessage, BedrockThrottlingError } from './errors';

describe('Error Handling', () => {
  it('should return user-friendly message for throttling', () => {
    const error = new BedrockThrottlingError();
    const message = getUserErrorMessage(error);
    expect(message).toBe('Too many requests. Please wait a moment.');
  });
});
```
