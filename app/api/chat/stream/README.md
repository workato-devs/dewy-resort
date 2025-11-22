# Chat Streaming API Endpoint

## Overview

The `/api/chat/stream` endpoint provides real-time streaming chat responses powered by Amazon Bedrock. It integrates with Cognito Identity Pools for secure credential management and supports role-based MCP tool execution.

## Endpoint

```
POST /api/chat/stream
```

## Prerequisites

1. **Authentication Provider**: Must be set to Cognito (`AUTH_PROVIDER=cognito`)
2. **Cognito Identity Pool**: Must be configured (`COGNITO_IDENTITY_POOL_ID`)
3. **Valid Session**: User must be authenticated with a valid session cookie
4. **ID Token**: Session must contain a Cognito ID token (stored during login)

## Request

### Headers
```
Content-Type: application/json
Cookie: hotel_session=<session_id>
```

### Body
```json
{
  "message": "User message content",
  "conversationId": "optional-conversation-id"
}
```

### Parameters

- `message` (required): The user's message content (max 10,000 characters)
- `conversationId` (optional): ID of existing conversation to continue

## Response

The endpoint returns a Server-Sent Events (SSE) stream with the following event types:

### Event: `token`
Streaming text content from the AI response.

```json
{
  "type": "token",
  "content": "Hello"
}
```

### Event: `tool_use`
Indicates a tool is being invoked.

```json
{
  "type": "tool_use_start",
  "toolName": "get_bookings"
}
```

### Event: `tool_result`
Result from tool execution.

```json
{
  "type": "tool_result",
  "toolName": "get_bookings",
  "result": {
    "success": true,
    "result": { ... }
  }
}
```

### Event: `tool_error`
Error during tool execution.

```json
{
  "type": "tool_error",
  "toolName": "get_bookings",
  "error": "Tool execution failed"
}
```

### Event: `error`
Stream error occurred.

```json
{
  "type": "error",
  "error": "Error message"
}
```

### Event: `done`
Stream completed successfully.

```json
{
  "type": "done",
  "conversationId": "conv_123"
}
```

## Rate Limiting

- **Limit**: 10 requests per minute per user
- **Window**: 60 seconds
- **Response**: 400 Bad Request with message "Too many requests. Please wait a moment."

## Error Responses

### 400 Bad Request
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Message content is required"
  }
}
```

### 401 Unauthorized
```json
{
  "error": {
    "code": "AUTH_ERROR",
    "message": "You must be logged in to access this resource"
  }
}
```

### 403 Forbidden
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "AI chat requires Cognito authentication"
  }
}
```

### 500 Internal Server Error
```json
{
  "error": {
    "code": "EXTERNAL_SERVICE_ERROR",
    "message": "Unable to authenticate with AI service"
  }
}
```

## Implementation Flow

1. **Session Validation**: Validates user session and extracts user ID and role
2. **Rate Limiting**: Checks if user has exceeded rate limit
3. **Message Validation**: Validates message content and length
4. **Conversation Management**: Gets or creates conversation
5. **ID Token Retrieval**: Retrieves Cognito ID token from session
6. **Credential Exchange**: Exchanges ID token for temporary AWS credentials via Identity Pool
7. **MCP Configuration**: Loads role-specific MCP tools
8. **System Prompt**: Loads role-specific system prompt
9. **Bedrock Invocation**: Invokes Bedrock model with streaming
10. **Stream Processing**: Processes and forwards stream chunks to client
11. **Tool Execution**: Executes MCP tools when requested by the model
12. **Message Persistence**: Saves conversation messages

## Security Features

- **Session-based authentication**: Requires valid session cookie
- **Role-based access**: Different tools and prompts per role
- **Temporary credentials**: Uses short-lived AWS credentials from Identity Pool
- **Rate limiting**: Prevents abuse with per-user rate limits
- **Message sanitization**: Trims and validates user input
- **Error handling**: Comprehensive error handling with user-friendly messages

## Environment Variables

Required:
- `AUTH_PROVIDER=cognito`
- `COGNITO_IDENTITY_POOL_ID`
- `COGNITO_USER_POOL_ID`
- `COGNITO_CLIENT_ID`
- `AWS_REGION` or `COGNITO_REGION`

Optional:
- `BEDROCK_MODEL_ID` (default: anthropic.claude-3-sonnet-20240229-v1:0)
- `BEDROCK_MAX_TOKENS` (default: 4096)
- `BEDROCK_TEMPERATURE` (default: 0.7)

## Example Usage

### JavaScript/TypeScript

```typescript
const eventSource = new EventSource('/api/chat/stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: 'What is my current room status?',
    conversationId: 'conv_123',
  }),
});

eventSource.addEventListener('token', (event) => {
  const data = JSON.parse(event.data);
  console.log('Token:', data.content);
});

eventSource.addEventListener('tool_use', (event) => {
  const data = JSON.parse(event.data);
  console.log('Tool use:', data.toolName);
});

eventSource.addEventListener('done', (event) => {
  const data = JSON.parse(event.data);
  console.log('Done:', data.conversationId);
  eventSource.close();
});

eventSource.addEventListener('error', (event) => {
  const data = JSON.parse(event.data);
  console.error('Error:', data.error);
  eventSource.close();
});
```

## Notes

- The endpoint uses Server-Sent Events (SSE) for streaming
- Conversations are stored in memory and expire after 24 hours
- Tool execution is synchronous and blocks the stream until complete
- The endpoint automatically handles credential refresh if needed
- All Bedrock operations are logged for audit purposes
