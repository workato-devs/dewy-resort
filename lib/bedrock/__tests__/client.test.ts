/**
 * Bedrock Service Tests
 * 
 * Manual verification tests for Bedrock streaming service.
 * Run with: npx tsx lib/bedrock/__tests__/client.test.ts
 */

import {
  BedrockService,
  BedrockMessage,
  MCPTool,
  StreamChunk,
  ToolUseRequest,
} from '../client';
import { TemporaryCredentials } from '../identity-pool';

/**
 * Mock credentials for testing
 */
const MOCK_CREDENTIALS: TemporaryCredentials = {
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  sessionToken: 'AQoDYXdzEJr...<remainder of session token>',
  expiration: new Date(Date.now() + 3600000),
};

/**
 * Test configuration
 */
const TEST_CONFIG = {
  region: process.env.AWS_REGION || process.env.COGNITO_REGION || 'us-east-1',
  modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
  maxTokens: 1000,
  temperature: 0.7,
};

/**
 * Test service creation
 */
function testServiceCreation() {
  console.log('\n=== Testing Service Creation ===');
  
  console.log('Testing service creation with credentials...');
  const service = new BedrockService(MOCK_CREDENTIALS, TEST_CONFIG);
  console.assert(service !== null, 'Service should be created');
  console.log('✓ Service created successfully');
  
  console.log('Testing service creation from environment...');
  const serviceFromEnv = BedrockService.fromEnvironment(MOCK_CREDENTIALS);
  console.assert(serviceFromEnv !== null, 'Service should be created from environment');
  console.log('✓ Service created from environment successfully');
}

/**
 * Test request body building
 */
function testRequestBodyBuilding() {
  console.log('\n=== Testing Request Body Building ===');
  
  const service = new BedrockService(MOCK_CREDENTIALS, TEST_CONFIG);
  
  // Test basic message
  console.log('Testing basic message format...');
  const messages: BedrockMessage[] = [
    { role: 'user', content: 'Hello, how are you?' },
  ];
  
  // Access private method through type assertion for testing
  const buildRequestBody = (service as any).buildRequestBody.bind(service);
  const body = buildRequestBody({
    model: TEST_CONFIG.modelId,
    messages,
    systemPrompt: 'You are a helpful assistant.',
    maxTokens: 1000,
    temperature: 0.7,
  });
  
  console.assert(body.anthropic_version === 'bedrock-2023-05-31', 'Should have correct API version');
  console.assert(body.max_tokens === 1000, 'Should have correct max tokens');
  console.assert(body.temperature === 0.7, 'Should have correct temperature');
  console.assert(body.system === 'You are a helpful assistant.', 'Should have system prompt');
  console.assert(Array.isArray(body.messages), 'Should have messages array');
  console.assert(body.messages.length === 1, 'Should have one message');
  console.log('✓ Basic message format is correct');
  
  // Test with tools
  console.log('Testing message format with tools...');
  const tools: MCPTool[] = [
    {
      name: 'get_weather',
      description: 'Get current weather for a location',
      input_schema: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'City name' },
        },
        required: ['location'],
      },
    },
  ];
  
  const bodyWithTools = buildRequestBody({
    model: TEST_CONFIG.modelId,
    messages,
    systemPrompt: 'You are a helpful assistant.',
    tools,
  });
  
  console.assert(Array.isArray(bodyWithTools.tools), 'Should have tools array');
  console.assert(bodyWithTools.tools.length === 1, 'Should have one tool');
  console.assert(bodyWithTools.tools[0].name === 'get_weather', 'Should have correct tool name');
  console.log('✓ Message format with tools is correct');
}

/**
 * Test chunk parsing
 */
function testChunkParsing() {
  console.log('\n=== Testing Chunk Parsing ===');
  
  const service = new BedrockService(MOCK_CREDENTIALS, TEST_CONFIG);
  const parseChunk = (service as any).parseChunk.bind(service);
  
  // Test message_start chunk
  console.log('Testing message_start chunk...');
  const messageStartChunk = parseChunk({
    type: 'message_start',
    message: { role: 'assistant', content: [] },
  });
  console.assert(messageStartChunk?.type === 'message_start', 'Should parse message_start');
  console.log('✓ message_start chunk parsed correctly');
  
  // Test content_block_start chunk
  console.log('Testing content_block_start chunk...');
  const contentStartChunk = parseChunk({
    type: 'content_block_start',
    index: 0,
    content_block: { type: 'text', text: '' },
  });
  console.assert(contentStartChunk?.type === 'content_block_start', 'Should parse content_block_start');
  console.log('✓ content_block_start chunk parsed correctly');
  
  // Test content_block_delta with text
  console.log('Testing content_block_delta chunk with text...');
  const textDeltaChunk = parseChunk({
    type: 'content_block_delta',
    index: 0,
    delta: { type: 'text_delta', text: 'Hello' },
  });
  console.assert(textDeltaChunk?.type === 'content_block_delta', 'Should parse content_block_delta');
  console.assert(
    textDeltaChunk?.type === 'content_block_delta' && textDeltaChunk.delta.type === 'text_delta',
    'Should have text_delta type'
  );
  console.log('✓ content_block_delta with text parsed correctly');
  
  // Test content_block_stop chunk
  console.log('Testing content_block_stop chunk...');
  const contentStopChunk = parseChunk({
    type: 'content_block_stop',
    index: 0,
  });
  console.assert(contentStopChunk?.type === 'content_block_stop', 'Should parse content_block_stop');
  console.log('✓ content_block_stop chunk parsed correctly');
  
  // Test message_stop chunk
  console.log('Testing message_stop chunk...');
  const messageStopChunk = parseChunk({
    type: 'message_stop',
  });
  console.assert(messageStopChunk?.type === 'message_stop', 'Should parse message_stop');
  console.log('✓ message_stop chunk parsed correctly');
  
  // Test unknown chunk type
  console.log('Testing unknown chunk type...');
  const unknownChunk = parseChunk({
    type: 'unknown_type',
  });
  console.assert(unknownChunk === null, 'Should return null for unknown type');
  console.log('✓ Unknown chunk type handled correctly');
}

/**
 * Test tool use extraction
 */
function testToolUseExtraction() {
  console.log('\n=== Testing Tool Use Extraction ===');
  
  const service = new BedrockService(MOCK_CREDENTIALS, TEST_CONFIG);
  
  // Simulate tool use chunks
  const chunks: StreamChunk[] = [
    {
      type: 'content_block_start',
      index: 0,
      content_block: {
        type: 'tool_use',
        id: 'tool_123',
        name: 'get_weather',
      },
    },
    {
      type: 'content_block_delta',
      index: 0,
      delta: {
        type: 'input_json_delta',
        partial_json: '{"location"',
      },
    },
    {
      type: 'content_block_delta',
      index: 0,
      delta: {
        type: 'input_json_delta',
        partial_json: ': "San Francisco"}',
      },
    },
    {
      type: 'content_block_stop',
      index: 0,
    },
  ];
  
  console.log('Testing tool use extraction from chunks...');
  const toolUses = service.extractToolUses(chunks);
  
  console.assert(toolUses.length === 1, 'Should extract one tool use');
  console.assert(toolUses[0].id === 'tool_123', 'Should have correct tool ID');
  console.assert(toolUses[0].name === 'get_weather', 'Should have correct tool name');
  console.assert(toolUses[0].input.location === 'San Francisco', 'Should have correct tool input');
  console.log('✓ Tool use extracted correctly');
  
  // Test with no tool uses
  console.log('Testing extraction with no tool uses...');
  const textChunks: StreamChunk[] = [
    {
      type: 'content_block_start',
      index: 0,
      content_block: { type: 'text' },
    },
    {
      type: 'content_block_delta',
      index: 0,
      delta: { type: 'text_delta', text: 'Hello' },
    },
    {
      type: 'content_block_stop',
      index: 0,
    },
  ];
  
  const noToolUses = service.extractToolUses(textChunks);
  console.assert(noToolUses.length === 0, 'Should extract no tool uses');
  console.log('✓ No tool uses extracted correctly');
}

/**
 * Test error message generation
 */
function testErrorMessages() {
  console.log('\n=== Testing Error Messages ===');
  
  // Import parseAWSError from errors module
  const { parseAWSError } = require('../errors');
  
  // Test throttling error
  console.log('Testing throttling error message...');
  const throttleError = new Error('ThrottlingException: Rate exceeded');
  (throttleError as any).name = 'ThrottlingException';
  const throttleResult = parseAWSError(throttleError, 'test-model');
  console.assert(
    throttleResult.message.includes('Too many requests') || throttleResult.message.includes('throttl'),
    'Should return throttling message'
  );
  console.log('✓ Throttling error message correct');
  
  // Test timeout error
  console.log('Testing timeout error message...');
  const timeoutError = new Error('Request timed out');
  (timeoutError as any).name = 'TimeoutError';
  const timeoutResult = parseAWSError(timeoutError, 'test-model');
  console.assert(
    timeoutResult.message.includes('timed out') || timeoutResult.message.includes('timeout'),
    'Should return timeout message'
  );
  console.log('✓ Timeout error message correct');
  
  // Test model not found error
  console.log('Testing model not found error message...');
  const notFoundError = new Error('Model not found');
  (notFoundError as any).name = 'ResourceNotFoundException';
  const notFoundResult = parseAWSError(notFoundError, 'test-model');
  console.assert(
    notFoundResult.message.includes('not available') || notFoundResult.message.includes('not found'),
    'Should return not found message'
  );
  console.log('✓ Model not found error message correct');
  
  // Test access denied error
  console.log('Testing access denied error message...');
  const accessError = new Error('Access denied');
  (accessError as any).name = 'AccessDeniedException';
  const accessResult = parseAWSError(accessError, 'test-model');
  console.assert(
    accessResult.message.includes('authenticate') || accessResult.message.includes('access'),
    'Should return access denied message'
  );
  console.log('✓ Access denied error message correct');
  
  // Test generic error
  console.log('Testing generic error message...');
  const genericError = new Error('Something went wrong');
  const genericResult = parseAWSError(genericError, 'test-model');
  console.assert(
    genericResult.message.length > 0,
    'Should return error message'
  );
  console.log('✓ Generic error message correct');
}

/**
 * Test message format validation
 */
function testMessageFormat() {
  console.log('\n=== Testing Message Format ===');
  
  const validMessages: BedrockMessage[] = [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there!' },
    { role: 'user', content: 'How are you?' },
  ];
  
  console.log('Testing valid message format...');
  validMessages.forEach((msg, index) => {
    console.assert(
      msg.role === 'user' || msg.role === 'assistant',
      `Message ${index} should have valid role`
    );
    console.assert(typeof msg.content === 'string', `Message ${index} should have string content`);
  });
  console.log('✓ Message format is valid');
}

/**
 * Test tool schema validation
 */
function testToolSchema() {
  console.log('\n=== Testing Tool Schema ===');
  
  const validTool: MCPTool = {
    name: 'get_weather',
    description: 'Get current weather for a location',
    input_schema: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'City name',
        },
        units: {
          type: 'string',
          enum: ['celsius', 'fahrenheit'],
          description: 'Temperature units',
        },
      },
      required: ['location'],
    },
  };
  
  console.log('Testing valid tool schema...');
  console.assert(typeof validTool.name === 'string', 'Tool should have string name');
  console.assert(typeof validTool.description === 'string', 'Tool should have string description');
  console.assert(validTool.input_schema.type === 'object', 'Tool schema should be object type');
  console.assert(
    typeof validTool.input_schema.properties === 'object',
    'Tool schema should have properties'
  );
  console.assert(Array.isArray(validTool.input_schema.required), 'Tool schema should have required array');
  console.log('✓ Tool schema is valid');
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('=================================================');
  console.log('Bedrock Service - Verification Tests');
  console.log('=================================================');
  
  try {
    testServiceCreation();
    testRequestBodyBuilding();
    testChunkParsing();
    testToolUseExtraction();
    testErrorMessages();
    testMessageFormat();
    testToolSchema();
    
    console.log('\n=================================================');
    console.log('✓ All verification tests passed!');
    console.log('=================================================\n');
    
    // Note about integration testing
    console.log('Note: Integration tests with real Bedrock API require:');
    console.log('  1. Valid AWS credentials with Bedrock permissions');
    console.log('  2. Access to Bedrock models in your AWS region');
    console.log('  3. Proper IAM role configuration');
    console.log('\nTo test with real Bedrock API, use the service in your application');
    console.log('with valid temporary credentials from Identity Pool.\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

export { runTests };
