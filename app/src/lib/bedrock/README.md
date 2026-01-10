# Bedrock Integration Services

This directory contains services for integrating Amazon Bedrock LLM capabilities into the Hotel Management System.

## Configuration Module

The Configuration Module (`config.ts`) manages loading and validation of Bedrock integration configuration from environment variables.

### Features

- **Configuration Loading**: Loads all Bedrock-related environment variables
- **Automatic Validation**: Validates configuration format and values
- **Feature Detection**: Determines if Bedrock is enabled based on configuration
- **Error Reporting**: Provides clear error messages for configuration issues
- **Default Values**: Sensible defaults for optional configuration

### Usage

#### Loading Configuration

```typescript
import { loadBedrockConfig } from '@/lib/bedrock/config';

// Load configuration from environment
const config = loadBedrockConfig();

if (config.enabled) {
  console.log('Bedrock is enabled');
  console.log('Identity Pool:', config.identityPool.id);
  console.log('Model:', config.bedrock.modelId);
} else {
  console.log('Bedrock is disabled');
}
```

#### Checking if Bedrock is Enabled

```typescript
import { isBedrockEnabled, getBedrockDisabledReason } from '@/lib/bedrock/config';

if (!isBedrockEnabled()) {
  const reason = getBedrockDisabledReason();
  console.log('Bedrock disabled:', reason);
  return;
}

// Proceed with Bedrock integration
```

#### Validating Configuration

```typescript
import { loadBedrockConfig, validateBedrockConfig, BedrockConfigurationError } from '@/lib/bedrock/config';

try {
  const config = loadBedrockConfig();
  
  if (config.enabled) {
    validateBedrockConfig(config);
    console.log('Configuration is valid');
  }
} catch (error) {
  if (error instanceof BedrockConfigurationError) {
    console.error('Configuration error:', error.message);
  }
}
```

### Configuration Structure

```typescript
interface BedrockConfig {
  enabled: boolean;
  identityPool: {
    id: string;                    // COGNITO_IDENTITY_POOL_ID
    region: string;                // AWS_REGION or COGNITO_REGION
    userPoolId: string;            // COGNITO_USER_POOL_ID
    clientId: string;              // COGNITO_CLIENT_ID
  };
  bedrock: {
    modelId: string;               // BEDROCK_MODEL_ID (default: claude-3-sonnet)
    maxTokens: number;             // BEDROCK_MAX_TOKENS (default: 4096)
    temperature: number;           // BEDROCK_TEMPERATURE (default: 0.7)
    region: string;                // AWS_REGION or COGNITO_REGION
  };
  mcp: {
    configPath: string;            // MCP_CONFIG_PATH (default: config/mcp)
  };
}
```

### Environment Variables

**Required (when enabled)**:
- `AUTH_PROVIDER=cognito` - Must be set to enable Bedrock
- `COGNITO_IDENTITY_POOL_ID` - Identity Pool ID (format: region:uuid)
- `AWS_REGION` or `COGNITO_REGION` - AWS region
- `COGNITO_USER_POOL_ID` - User Pool ID
- `COGNITO_CLIENT_ID` - App Client ID

**Optional**:
- `BEDROCK_MODEL_ID` - Model to use (default: anthropic.claude-3-sonnet-20240229-v1:0)
- `BEDROCK_MAX_TOKENS` - Max tokens (default: 4096, range: 1-200000)
- `BEDROCK_TEMPERATURE` - Temperature (default: 0.7, range: 0.0-1.0)
- `MCP_CONFIG_PATH` - MCP config directory (default: config/mcp)

### Validation Rules

The configuration validator checks:

1. **Identity Pool ID Format**: Must be `region:uuid` (e.g., `us-west-2:12345678-1234-1234-1234-123456789012`)
2. **AWS Region Format**: Must be valid AWS region (e.g., `us-east-1`, `eu-west-1`)
3. **Bedrock Model ID Format**: Must be `provider.model-name-version`
4. **Max Tokens Range**: Must be positive and ≤ 200000
5. **Temperature Range**: Must be between 0.0 and 1.0
6. **Required Fields**: All required fields must be non-empty

### Error Handling

Configuration errors throw `BedrockConfigurationError` with detailed messages:

```typescript
try {
  const config = loadBedrockConfig();
  validateBedrockConfig(config);
} catch (error) {
  if (error instanceof BedrockConfigurationError) {
    // Error message includes all validation failures
    console.error(error.message);
    // Example:
    // Bedrock configuration validation failed:
    // COGNITO_IDENTITY_POOL_ID must be in format: region:uuid
    // BEDROCK_MAX_TOKENS must be a positive number
  }
}
```

### Validation Script

Run the validation script to check configuration:

```bash
npm run verify:bedrock
```

The script provides:
- ✓ Success indicators for valid configuration
- ✗ Error indicators for invalid configuration
- ℹ Info messages for default values
- ⚠ Warning messages for optional issues
- Setup recommendations when Bedrock is disabled

### Testing

Run the configuration tests:

```bash
npx tsx lib/bedrock/__tests__/config.test.ts
```

The tests verify:
- Configuration loading from environment
- Default value handling
- Validation rules for all fields
- Feature detection logic
- Error message generation

## Identity Pool Service

The Identity Pool Service (`identity-pool.ts`) manages the exchange of Cognito User Pool tokens for temporary AWS credentials using Cognito Identity Pools.

### Features

- **Credential Exchange**: Exchanges Cognito User Pool ID tokens for temporary AWS credentials
- **Automatic Caching**: Caches credentials per session to reduce API calls
- **Expiration Checking**: Validates credential expiration and triggers refresh when needed
- **Automatic Refresh**: Refreshes credentials 5 minutes before expiration
- **Session Management**: Maintains separate credential caches per user session

### Usage

#### Basic Usage

```typescript
import { IdentityPoolService } from '@/lib/bedrock/identity-pool';

// Create service instance
const service = new IdentityPoolService({
  identityPoolId: 'us-west-2:12345678-1234-1234-1234-123456789012',
  region: 'us-west-2',
  userPoolId: 'us-west-2_ABC123',
  clientId: 'abc123def456',
});

// Get credentials for a user
const credentials = await service.getCredentialsForUser(
  idToken,      // Cognito User Pool ID token
  sessionId     // Session ID for caching
);

// Use credentials with AWS SDK
const bedrockClient = new BedrockRuntimeClient({
  region: 'us-west-2',
  credentials: {
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
  },
});
```

#### Using Environment Variables

```typescript
import { createIdentityPoolService } from '@/lib/bedrock/identity-pool';

// Create service from environment variables
const service = createIdentityPoolService();

if (!service) {
  console.error('Identity Pool not configured');
  return;
}

const credentials = await service.getCredentialsForUser(idToken, sessionId);
```

#### Checking and Refreshing Credentials

```typescript
// Check if credentials are expired
if (service.isExpired(credentials)) {
  console.log('Credentials are expired');
}

// Check if credentials need refresh (within 5 minute buffer)
if (service.needsRefresh(credentials)) {
  console.log('Credentials will expire soon');
}

// Refresh credentials if needed
const freshCredentials = await service.refreshIfNeeded(
  credentials,
  idToken,
  sessionId
);
```

#### Cache Management

```typescript
// Clear cache for a specific session
service.clearCache(sessionId);

// Clear all cached credentials
service.clearAllCache();
```

### Configuration

The service requires the following environment variables:

```bash
# Required for Identity Pool
COGNITO_IDENTITY_POOL_ID=us-west-2:12345678-1234-1234-1234-123456789012
COGNITO_USER_POOL_ID=us-west-2_ABC123
COGNITO_CLIENT_ID=abc123def456
AWS_REGION=us-west-2  # or COGNITO_REGION

# Required for Bedrock (used by other services)
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
```

### Architecture

#### Credential Flow

```
User Authentication (User Pool)
         ↓
    ID Token
         ↓
Identity Pool Service
         ↓
    GetId (Identity ID)
         ↓
GetCredentialsForIdentity
         ↓
Temporary AWS Credentials
         ↓
    Bedrock Client
```

#### Caching Strategy

- Credentials are cached per session ID
- Cache key: `sessionId`
- Cache includes: credentials, cached timestamp, identity ID
- Credentials refresh automatically 5 minutes before expiration
- Identity ID is reused to reduce API calls

### Error Handling

The service throws errors in the following scenarios:

- **Missing Identity ID**: `Failed to get identity ID from Identity Pool`
- **Missing Credentials**: `Failed to get credentials from Identity Pool`
- **Invalid Credentials**: `Invalid credentials received from Identity Pool`

Handle these errors appropriately in your application:

```typescript
try {
  const credentials = await service.getCredentialsForUser(idToken, sessionId);
} catch (error) {
  if (error.message.includes('Identity Pool')) {
    // Handle Identity Pool errors
    console.error('Unable to authenticate with AI service');
  }
  throw error;
}
```

### Security Considerations

1. **Temporary Credentials Only**: Credentials are temporary (1 hour validity by default)
2. **No Long-term Storage**: Never store credentials in databases or logs
3. **Session-based Caching**: Credentials are cached in memory per session
4. **Automatic Expiration**: Credentials automatically expire and refresh
5. **Role-based Access**: IAM roles assigned based on user's custom:role claim

### Testing

Run the verification tests:

```bash
npx tsx lib/bedrock/__tests__/identity-pool.test.ts
```

The tests verify:
- Credential expiration checking
- Cache management
- Service creation from environment
- Credential structure validation

### Integration with Cognito Identity Pool

The service requires a properly configured Cognito Identity Pool:

1. **Identity Pool Setup**:
   - Linked to Cognito User Pool as authentication provider
   - Role mapping configured based on `custom:role` claim
   - Separate IAM roles for each user role (guest, manager, housekeeping, maintenance)

2. **IAM Role Configuration**:
   - Trust policy allows `cognito-identity.amazonaws.com`
   - Permissions limited to Bedrock model invocation
   - Resource restricted to specific model ARN

3. **CloudFormation Deployment**:
   - Use `aws/cloudformation/cognito-identity-pool.yaml`
   - See `aws/cloudformation/README-IDENTITY-POOL.md` for deployment instructions

### Performance Considerations

- **Caching**: Reduces API calls by caching credentials per session
- **Refresh Buffer**: 5-minute buffer prevents expiration during requests
- **Identity ID Reuse**: Reuses identity ID to minimize GetId calls
- **Memory Usage**: Credentials stored in memory (cleared on session end)

### Future Enhancements

Potential improvements for production use:

1. **Distributed Caching**: Use Redis for multi-instance deployments
2. **Metrics**: Track credential exchange success/failure rates
3. **Rate Limiting**: Implement rate limiting for credential requests
4. **Credential Rotation**: Support credential rotation policies
5. **Audit Logging**: Log credential exchanges for security audits


## Bedrock Service

The Bedrock Service (`client.ts`) manages streaming invocations to Amazon Bedrock models with support for real-time token delivery and tool use capabilities.

### Features

- **Streaming Responses**: Real-time token-by-token delivery using InvokeModelWithResponseStream
- **Claude 3 Support**: Native support for Claude 3 message format
- **Tool Use**: Detection and handling of tool use requests from the model
- **Error Handling**: Comprehensive error handling for throttling, timeouts, and model errors
- **Configurable**: Support for custom models, tokens, temperature, and timeout settings

### Usage

#### Basic Streaming

```typescript
import { BedrockService } from '@/lib/bedrock/client';
import { TemporaryCredentials } from '@/lib/bedrock/identity-pool';

// Create service with credentials
const service = new BedrockService(credentials, {
  region: 'us-east-1',
  modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
  maxTokens: 4096,
  temperature: 0.7,
});

// Stream a conversation
const messages = [
  { role: 'user', content: 'Hello, how are you?' },
];

for await (const chunk of service.streamInvoke({
  model: 'anthropic.claude-3-sonnet-20240229-v1:0',
  messages,
  systemPrompt: 'You are a helpful assistant.',
})) {
  if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
    // Display token in real-time
    process.stdout.write(chunk.delta.text);
  } else if (chunk.type === 'message_stop') {
    console.log('\n[Stream complete]');
  } else if (chunk.type === 'error') {
    console.error('Error:', chunk.error);
  }
}
```

#### Using Environment Variables

```typescript
// Create service from environment variables
const service = BedrockService.fromEnvironment(credentials);

// Environment variables used:
// - AWS_REGION or COGNITO_REGION (default: us-east-1)
// - BEDROCK_MODEL_ID (default: anthropic.claude-3-sonnet-20240229-v1:0)
// - BEDROCK_MAX_TOKENS (default: 4096)
// - BEDROCK_TEMPERATURE (default: 0.7)
```

#### Streaming with Tools

```typescript
import { MCPTool } from '@/lib/bedrock/client';

// Define tools
const tools: MCPTool[] = [
  {
    name: 'get_weather',
    description: 'Get current weather for a location',
    input_schema: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City name' },
        units: { type: 'string', enum: ['celsius', 'fahrenheit'] },
      },
      required: ['location'],
    },
  },
];

// Collect chunks for tool use detection
const chunks = [];

for await (const chunk of service.streamInvoke({
  model: 'anthropic.claude-3-sonnet-20240229-v1:0',
  messages,
  systemPrompt: 'You are a helpful assistant with access to weather data.',
  tools,
})) {
  chunks.push(chunk);
  
  if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
    process.stdout.write(chunk.delta.text);
  }
}

// Extract tool use requests
const toolUses = service.extractToolUses(chunks);

for (const toolUse of toolUses) {
  console.log(`Tool requested: ${toolUse.name}`);
  console.log(`Input:`, toolUse.input);
  
  // Execute tool and get result
  const result = await executeToolSomehow(toolUse);
  
  // Continue conversation with tool result
  // (Implementation depends on your tool execution strategy)
}
```

#### Multi-turn Conversations

```typescript
const conversation: BedrockMessage[] = [];

// First turn
conversation.push({ role: 'user', content: 'What is the capital of France?' });

let assistantResponse = '';
for await (const chunk of service.streamInvoke({
  model: 'anthropic.claude-3-sonnet-20240229-v1:0',
  messages: conversation,
  systemPrompt: 'You are a helpful assistant.',
})) {
  if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
    assistantResponse += chunk.delta.text;
  }
}

conversation.push({ role: 'assistant', content: assistantResponse });

// Second turn
conversation.push({ role: 'user', content: 'What is its population?' });

assistantResponse = '';
for await (const chunk of service.streamInvoke({
  model: 'anthropic.claude-3-sonnet-20240229-v1:0',
  messages: conversation,
  systemPrompt: 'You are a helpful assistant.',
})) {
  if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
    assistantResponse += chunk.delta.text;
  }
}

conversation.push({ role: 'assistant', content: assistantResponse });
```

### Configuration

The service supports the following configuration options:

```typescript
interface BedrockConfig {
  region: string;              // AWS region (required)
  modelId?: string;            // Bedrock model ID (optional)
  maxTokens?: number;          // Maximum tokens to generate (optional)
  temperature?: number;        // Temperature for sampling (optional)
  timeout?: number;            // Request timeout in ms (optional)
}
```

**Default Values**:
- `modelId`: `anthropic.claude-3-sonnet-20240229-v1:0`
- `maxTokens`: `4096`
- `temperature`: `0.7`
- `timeout`: `60000` (60 seconds)

### Stream Chunk Types

The service yields different chunk types during streaming:

#### Content Chunks

```typescript
// Message start
{ type: 'message_start', message: { role: 'assistant', content: [] } }

// Content block start
{ type: 'content_block_start', index: 0, content_block: { type: 'text' } }

// Text delta (streaming tokens)
{ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hello' } }

// Content block stop
{ type: 'content_block_stop', index: 0 }

// Message delta (metadata updates)
{ type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 42 } }

// Message stop (end of stream)
{ type: 'message_stop' }
```

#### Tool Use Chunks

```typescript
// Tool use block start
{
  type: 'content_block_start',
  index: 1,
  content_block: {
    type: 'tool_use',
    id: 'tool_abc123',
    name: 'get_weather'
  }
}

// Tool input delta (streaming JSON)
{
  type: 'content_block_delta',
  index: 1,
  delta: {
    type: 'input_json_delta',
    partial_json: '{"location": "San Francisco"}'
  }
}

// Tool use complete
{ type: 'content_block_stop', index: 1 }
```

#### Error Chunks

```typescript
{ type: 'error', error: 'Too many requests. Please wait a moment.' }
```

### Tool Use Detection

The service provides a method to extract tool use requests from stream chunks:

```typescript
const chunks: StreamChunk[] = []; // Collect during streaming

// Extract tool uses after streaming completes
const toolUses = service.extractToolUses(chunks);

// Each tool use contains:
interface ToolUseRequest {
  id: string;        // Unique tool use ID
  name: string;      // Tool name
  input: any;        // Parsed tool input (JSON)
}
```

### Error Handling

The service provides user-friendly error messages for common scenarios:

| Error Type | User Message |
|------------|--------------|
| Throttling | "Too many requests. Please wait a moment." |
| Timeout | "Request timed out. Please try again." |
| Model Not Found | "AI model not available." |
| Access Denied | "Unable to authenticate with AI service." |
| Validation Error | "Invalid request. Please try again." |
| Generic Error | "AI service temporarily unavailable." |

**Example Error Handling**:

```typescript
try {
  for await (const chunk of service.streamInvoke(options)) {
    if (chunk.type === 'error') {
      // Display user-friendly error message
      console.error(chunk.error);
      break;
    }
    // Process chunk...
  }
} catch (error) {
  console.error('Streaming failed:', error);
}
```

### Claude 3 Message Format

The service uses Claude 3's message format:

```typescript
// Request format
{
  anthropic_version: 'bedrock-2023-05-31',
  max_tokens: 4096,
  temperature: 0.7,
  system: 'You are a helpful assistant.',
  messages: [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there!' },
    { role: 'user', content: 'How are you?' }
  ],
  tools: [
    {
      name: 'tool_name',
      description: 'Tool description',
      input_schema: {
        type: 'object',
        properties: { /* ... */ },
        required: ['field1']
      }
    }
  ]
}
```

### Testing

Run the verification tests:

```bash
npx tsx lib/bedrock/__tests__/client.test.ts
```

The tests verify:
- Service creation and configuration
- Request body building for Claude 3 format
- Stream chunk parsing
- Tool use extraction
- Error message generation
- Message and tool schema validation

### Security Considerations

1. **Temporary Credentials**: Always use temporary credentials from Identity Pool
2. **Timeout Protection**: 60-second timeout prevents hanging requests
3. **Error Sanitization**: User-friendly error messages don't expose internal details
4. **Input Validation**: Message content should be validated before streaming
5. **Rate Limiting**: Implement rate limiting at the API layer

### Performance Considerations

- **Streaming Overhead**: Each token is delivered individually for real-time display
- **Connection Reuse**: Reuse BedrockService instances when possible
- **Timeout Configuration**: Adjust timeout based on expected response length
- **Token Limits**: Set appropriate maxTokens to control response length and cost

### Integration with Identity Pool

The Bedrock Service requires temporary credentials from the Identity Pool Service:

```typescript
import { createIdentityPoolService } from '@/lib/bedrock/identity-pool';
import { BedrockService } from '@/lib/bedrock/client';

// Get credentials
const identityService = createIdentityPoolService();
const credentials = await identityService.getCredentialsForUser(idToken, sessionId);

// Create Bedrock service
const bedrockService = BedrockService.fromEnvironment(credentials);

// Stream invocation
for await (const chunk of bedrockService.streamInvoke(options)) {
  // Process chunks...
}
```

### Supported Models

The service supports any Bedrock model that uses the Claude 3 message format:

- `anthropic.claude-3-sonnet-20240229-v1:0` (default)
- `anthropic.claude-3-haiku-20240307-v1:0`
- `anthropic.claude-3-opus-20240229-v1:0`
- `anthropic.claude-3-5-sonnet-20240620-v1:0`

Configure via `BEDROCK_MODEL_ID` environment variable or pass in options.

### Future Enhancements

Potential improvements for production use:

1. **Response Caching**: Cache common responses to reduce API calls
2. **Token Buffering**: Buffer tokens in chunks for smoother display
3. **Retry Logic**: Implement exponential backoff for transient errors
4. **Metrics**: Track token usage, latency, and error rates
5. **Multi-model Support**: Support switching between different models
6. **Streaming Optimization**: Optimize chunk processing for lower latency
