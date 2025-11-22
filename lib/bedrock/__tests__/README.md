# Bedrock Module Tests

This directory contains unit tests for all core Bedrock integration modules.

## Test Files

### 1. Identity Pool Service Tests
**File**: `identity-pool.test.ts`

Tests for the Identity Pool service that exchanges Cognito User Pool tokens for temporary AWS credentials.

**Coverage**:
- Credential structure validation
- Credential expiration checking
- Cache management
- Service creation from environment variables

**Run**: `npx tsx lib/bedrock/__tests__/identity-pool.test.ts`

### 2. Bedrock Service Tests
**File**: `client.test.ts`

Tests for the Bedrock service that invokes Amazon Bedrock models with streaming support.

**Coverage**:
- Service creation and configuration
- Request body building for Claude 3 format
- Stream chunk parsing
- Tool use extraction from streams
- Error message generation
- Message and tool schema validation

**Run**: `npx tsx lib/bedrock/__tests__/client.test.ts`

### 3. MCP Manager Tests
**File**: `mcp-manager.test.ts`

Tests for the MCP Manager that handles Model Context Protocol server connections and tool execution.

**Coverage**:
- Configuration loading for all roles (guest, manager, housekeeping, maintenance)
- Tool discovery from MCP servers
- Role-based access control
- Tool execution with authorization
- Configuration validation
- Lifecycle management (reload, shutdown)

**Run**: `npx tsx lib/bedrock/__tests__/mcp-manager.test.ts`

### 4. Prompt Manager Tests
**File**: `prompt-manager.test.ts`

Tests for the Prompt Manager that loads and manages role-specific system prompts.

**Coverage**:
- Loading prompts for all roles
- Prompt content verification
- Variable interpolation
- Prompt caching
- Cache reload
- Prompt validation
- Preloading prompts
- Fallback prompts
- Role validation
- Singleton pattern

**Run**: `npx tsx lib/bedrock/__tests__/prompt-manager.test.ts`

### 5. Conversation Manager Tests
**File**: `conversation-manager.test.ts`

Tests for the Conversation Manager that handles conversation lifecycle and message management.

**Coverage**:
- Conversation creation with unique IDs
- Conversation retrieval
- Message addition to conversations
- Recent message retrieval with limits
- Conversation clearing
- Conversation deletion
- User conversation listing
- Statistics gathering
- Conversation expiration (24 hours)

**Run**: `npx tsx lib/bedrock/__tests__/conversation-manager.test.ts`

### 6. Integration Tests
**File**: `integration.test.ts`

Comprehensive integration tests that verify end-to-end functionality of the Bedrock chat system.

**Coverage**:
- End-to-end streaming flow (user message → credentials → Bedrock → streaming → conversation)
- Tool execution flow (LLM tool request → validation → MCP execution → result)
- Role-based access control (independent configs, prompts, and tools per role)
- Error handling scenarios (invalid sessions, expired credentials, tool failures)
- Rate limiting (per-user request counting and enforcement)
- Streaming response structure (SSE event formats)
- Configuration validation (AUTH_PROVIDER, Identity Pool ID, model ID, region)

**Run**: `npx tsx lib/bedrock/__tests__/integration.test.ts`

## Running All Tests

To run all tests at once:

```bash
./lib/bedrock/__tests__/run-all-tests.sh
```

Or manually:

```bash
npx tsx lib/bedrock/__tests__/identity-pool.test.ts
npx tsx lib/bedrock/__tests__/client.test.ts
npx tsx lib/bedrock/__tests__/mcp-manager.test.ts
npx tsx lib/bedrock/__tests__/prompt-manager.test.ts
npx tsx lib/bedrock/__tests__/conversation-manager.test.ts
npx tsx lib/bedrock/__tests__/integration.test.ts
```

## Test Approach

These tests use a manual verification approach rather than a test framework like Jest or Vitest. This approach:

1. **Runs directly with tsx**: No additional test framework dependencies needed
2. **Provides clear output**: Each test logs its progress and results
3. **Tests core functionality**: Focuses on essential behavior and edge cases
4. **Validates structure**: Ensures data structures and interfaces are correct
5. **Checks error handling**: Verifies proper error messages and handling

## Test Structure

Each test file follows this pattern:

```typescript
/**
 * Test helper functions
 */
function assert(condition: boolean, message: string): void { ... }
function assertEqual<T>(actual: T, expected: T, message: string): void { ... }

/**
 * Individual test functions
 */
async function testFeature1(): Promise<void> { ... }
async function testFeature2(): Promise<void> { ... }

/**
 * Main test runner
 */
async function runTests(): Promise<void> {
  try {
    await testFeature1();
    await testFeature2();
    console.log('✓ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests();
}
```

## Integration Testing

The `integration.test.ts` file provides comprehensive integration tests that verify end-to-end functionality with mock data. These tests cover:

1. **End-to-End Streaming Flow**: Complete flow from user message to streamed response
2. **Tool Execution Flow**: LLM tool requests through MCP execution
3. **Role-Based Access Control**: Independent configurations per role
4. **Error Handling**: Various failure scenarios and recovery
5. **Rate Limiting**: Request counting and enforcement
6. **Streaming Response Structure**: SSE event format validation
7. **Configuration Validation**: Environment variable validation

For integration testing with real AWS services:

### Identity Pool Service
- Requires valid `COGNITO_IDENTITY_POOL_ID` in environment
- Requires valid Cognito User Pool ID token
- Requires proper IAM role configuration in Identity Pool

### Bedrock Service
- Requires valid AWS credentials with Bedrock permissions
- Requires access to Bedrock models in your AWS region
- Requires proper IAM role configuration

### MCP Manager
- Requires remote MCP server URLs configured in `config/mcp/*.json`
- Requires MCP servers to be running and accessible
- Test tool execution with real data

## Notes

- Tests use mock credentials and data where appropriate
- Some tests verify error handling by intentionally triggering errors
- Configuration validation tests read actual config files from `config/mcp/`
- Prompt validation tests read actual prompt files from `config/prompts/`
- All tests clean up resources (stop cleanup timers, shutdown managers, etc.)

## Requirements Coverage

These tests validate all requirements from the Bedrock Chat Integration specification:

- **Requirements 3.x**: Identity Pool credential exchange
- **Requirements 1.x, 2.x**: Bedrock streaming invocation
- **Requirements 16.x-20.x**: MCP configuration and tool execution
- **Requirements 13.x**: System prompt management
- **Requirements 12.x**: Conversation management

## Troubleshooting

If tests fail:

1. **Check environment variables**: Ensure required variables are set in `.env`
2. **Verify configuration files**: Check that all config files exist in `config/mcp/` and `config/prompts/`
3. **Check dependencies**: Run `npm install` to ensure all dependencies are installed
4. **Review logs**: Tests output detailed logs showing what failed and why
5. **Run individual tests**: Run tests one at a time to isolate issues

## Adding New Tests

When adding new functionality to Bedrock modules:

1. Add test functions to the appropriate test file
2. Follow the existing test structure and naming conventions
3. Use the helper functions (`assert`, `assertEqual`) for validation
4. Add the new test function to the `runTests()` function
5. Update this README with the new test coverage
6. Run all tests to ensure nothing broke

## CI/CD Integration

To integrate these tests into CI/CD pipelines:

```bash
# Run all tests and exit with appropriate code
./lib/bedrock/__tests__/run-all-tests.sh

# Or run individual tests
npx tsx lib/bedrock/__tests__/identity-pool.test.ts || exit 1
npx tsx lib/bedrock/__tests__/client.test.ts || exit 1
npx tsx lib/bedrock/__tests__/mcp-manager.test.ts || exit 1
npx tsx lib/bedrock/__tests__/prompt-manager.test.ts || exit 1
npx tsx lib/bedrock/__tests__/conversation-manager.test.ts || exit 1
npx tsx lib/bedrock/__tests__/integration.test.ts || exit 1
```

All test files exit with code 0 on success and code 1 on failure, making them suitable for CI/CD integration.
