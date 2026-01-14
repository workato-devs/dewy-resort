# Chat Configuration API

## Endpoint

`GET /api/chat/config`

## Purpose

Returns the availability status of the Bedrock AI chat feature. This endpoint is used by the frontend to determine whether to display the AI-powered chat interface or fall back to the existing intent-based chat.

## Requirements

For the Bedrock chat feature to be enabled, the following conditions must be met:

1. **AUTH_PROVIDER** must be set to `"cognito"`
2. **COGNITO_IDENTITY_POOL_ID** must be configured with a valid Identity Pool ID

## Response Format

```typescript
{
  enabled: boolean;
  reason?: string;        // Only present when enabled=false
  features: {
    streaming: boolean;   // Real-time token streaming
    tools: boolean;       // MCP tool execution
  };
}
```

## Response Scenarios

### Scenario 1: AUTH_PROVIDER is not "cognito"

```json
{
  "enabled": false,
  "reason": "AI chat requires Cognito authentication",
  "features": {
    "streaming": false,
    "tools": false
  }
}
```

### Scenario 2: COGNITO_IDENTITY_POOL_ID is not configured

```json
{
  "enabled": false,
  "reason": "AI chat service not configured",
  "features": {
    "streaming": false,
    "tools": false
  }
}
```

### Scenario 3: COGNITO_IDENTITY_POOL_ID has invalid format

```json
{
  "enabled": false,
  "reason": "AI chat service not configured",
  "features": {
    "streaming": false,
    "tools": false
  }
}
```

### Scenario 4: All requirements met

```json
{
  "enabled": true,
  "features": {
    "streaming": true,
    "tools": true
  }
}
```

### Scenario 5: Error occurred

```json
{
  "enabled": false,
  "reason": "AI chat service temporarily unavailable",
  "features": {
    "streaming": false,
    "tools": false
  }
}
```

## Identity Pool ID Format

The Identity Pool ID must follow this format:

```
region:uuid
```

Example:
```
us-west-2:12345678-1234-1234-1234-123456789012
```

Pattern:
```regex
^[a-z]{2}-[a-z]+-\d+:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$
```

## Usage Example

### Frontend Integration

```typescript
async function checkChatAvailability() {
  const response = await fetch('/api/chat/config');
  const config = await response.json();
  
  if (config.enabled) {
    // Use Bedrock AI chat interface
    return <BedrockChatInterface />;
  } else {
    // Fall back to intent-based chat
    console.log('AI chat not available:', config.reason);
    return <IntentBasedChat />;
  }
}
```

### Testing

Use the verification script to test the endpoint:

```bash
node scripts/verify-chat-config.js
```

## Configuration

Add to `.env`:

```bash
# Required for Bedrock chat
AUTH_PROVIDER=cognito
COGNITO_IDENTITY_POOL_ID=us-west-2:12345678-1234-1234-1234-123456789012
```

## Related Documentation

- [Identity Pool Setup](../../../../aws/cloudformation/README-IDENTITY-POOL.md)
- [Bedrock Integration Design](../../../../.kiro/specs/bedrock-chat-integration/design.md)
- [Chat Streaming API](../stream/README.md)

## Error Handling

The endpoint never returns an error status code. Instead, it always returns 200 OK with `enabled: false` and an appropriate `reason` when the feature is unavailable. This ensures graceful degradation in the frontend.

## Security

- No authentication required (public endpoint)
- Does not expose sensitive configuration details
- Only returns boolean flags and generic error messages
- Validates Identity Pool ID format to prevent configuration errors
