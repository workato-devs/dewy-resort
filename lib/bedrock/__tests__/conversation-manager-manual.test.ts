/**
 * Conversation Manager Manual Tests
 * 
 * Manual verification tests for Conversation Manager.
 * Run with: npx tsx lib/bedrock/__tests__/conversation-manager-manual.test.ts
 */

import { ConversationManager, ConversationMessage } from '../conversation-manager';

// Test utilities
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
  }
}

// Test 1: Create conversation
async function testCreateConversation() {
  console.log('\n=== Test 1: Create Conversation ===');
  const manager = new ConversationManager();
  
  const conversation = await manager.createConversation('user123', 'guest');
  
  assert(conversation.id !== undefined, 'Conversation should have an ID');
  assertEqual(conversation.userId, 'user123', 'User ID should match');
  assertEqual(conversation.role, 'guest', 'Role should match');
  assertEqual(conversation.messages.length, 0, 'Messages should be empty');
  assert(conversation.createdAt instanceof Date, 'createdAt should be a Date');
  assert(conversation.updatedAt instanceof Date, 'updatedAt should be a Date');
  
  manager.stopCleanup();
  console.log('✓ Create conversation test passed');
}

// Test 2: Add messages
async function testAddMessages() {
  console.log('\n=== Test 2: Add Messages ===');
  const manager = new ConversationManager();
  
  const conversation = await manager.createConversation('user123', 'guest');
  
  const message1: ConversationMessage = {
    id: 'msg1',
    role: 'user',
    content: 'Hello',
    timestamp: new Date(),
  };
  
  const message2: ConversationMessage = {
    id: 'msg2',
    role: 'assistant',
    content: 'Hi there!',
    timestamp: new Date(),
  };
  
  await manager.addMessage(conversation.id, message1);
  await manager.addMessage(conversation.id, message2);
  
  const updated = await manager.getConversation(conversation.id);
  assertEqual(updated?.messages.length, 2, 'Should have 2 messages');
  assertEqual(updated?.messages[0].content, 'Hello', 'First message content should match');
  assertEqual(updated?.messages[1].content, 'Hi there!', 'Second message content should match');
  
  manager.stopCleanup();
  console.log('✓ Add messages test passed');
}

// Test 3: Get recent messages with limit
async function testGetRecentMessages() {
  console.log('\n=== Test 3: Get Recent Messages ===');
  const manager = new ConversationManager();
  
  const conversation = await manager.createConversation('user123', 'guest');
  
  // Add 15 messages
  for (let i = 1; i <= 15; i++) {
    const message: ConversationMessage = {
      id: `msg${i}`,
      role: i % 2 === 1 ? 'user' : 'assistant',
      content: `Message ${i}`,
      timestamp: new Date(),
    };
    await manager.addMessage(conversation.id, message);
  }
  
  const recentMessages = manager.getRecentMessages(conversation, 10);
  
  assertEqual(recentMessages.length, 10, 'Should return 10 messages');
  assertEqual(recentMessages[0].content, 'Message 6', 'First message should be Message 6');
  assertEqual(recentMessages[9].content, 'Message 15', 'Last message should be Message 15');
  
  // Check Bedrock format
  assert(!('id' in recentMessages[0]), 'Should not have id in Bedrock format');
  assert(!('timestamp' in recentMessages[0]), 'Should not have timestamp in Bedrock format');
  assert('role' in recentMessages[0], 'Should have role in Bedrock format');
  assert('content' in recentMessages[0], 'Should have content in Bedrock format');
  
  manager.stopCleanup();
  console.log('✓ Get recent messages test passed');
}

// Test 4: Clear conversation
async function testClearConversation() {
  console.log('\n=== Test 4: Clear Conversation ===');
  const manager = new ConversationManager();
  
  const conversation = await manager.createConversation('user123', 'guest');
  
  const message: ConversationMessage = {
    id: 'msg1',
    role: 'user',
    content: 'Hello',
    timestamp: new Date(),
  };
  
  await manager.addMessage(conversation.id, message);
  
  let updated = await manager.getConversation(conversation.id);
  assertEqual(updated?.messages.length, 1, 'Should have 1 message before clear');
  
  await manager.clearConversation(conversation.id);
  
  updated = await manager.getConversation(conversation.id);
  assertEqual(updated?.messages.length, 0, 'Should have 0 messages after clear');
  
  manager.stopCleanup();
  console.log('✓ Clear conversation test passed');
}

// Test 5: Get user conversations
async function testGetUserConversations() {
  console.log('\n=== Test 5: Get User Conversations ===');
  const manager = new ConversationManager();
  
  await manager.createConversation('user123', 'guest');
  await manager.createConversation('user123', 'manager');
  await manager.createConversation('user456', 'guest');
  
  const user123Conversations = await manager.getUserConversations('user123');
  const user456Conversations = await manager.getUserConversations('user456');
  
  assertEqual(user123Conversations.length, 2, 'User123 should have 2 conversations');
  assertEqual(user456Conversations.length, 1, 'User456 should have 1 conversation');
  
  manager.stopCleanup();
  console.log('✓ Get user conversations test passed');
}

// Test 6: Conversation expiration
async function testConversationExpiration() {
  console.log('\n=== Test 6: Conversation Expiration ===');
  const manager = new ConversationManager();
  
  const conversation = await manager.createConversation('user123', 'guest');
  
  // Manually set updatedAt to 25 hours ago
  const retrieved = await manager.getConversation(conversation.id);
  if (retrieved) {
    retrieved.updatedAt = new Date(Date.now() - 25 * 60 * 60 * 1000);
  }
  
  const result = await manager.getConversation(conversation.id);
  assertEqual(result, null, 'Expired conversation should return null');
  
  manager.stopCleanup();
  console.log('✓ Conversation expiration test passed');
}

// Test 7: Statistics
async function testGetStats() {
  console.log('\n=== Test 7: Get Statistics ===');
  const manager = new ConversationManager();
  
  const conv1 = await manager.createConversation('user123', 'guest');
  const conv2 = await manager.createConversation('user456', 'manager');
  
  await manager.addMessage(conv1.id, {
    id: 'msg1',
    role: 'user',
    content: 'Hello',
    timestamp: new Date(),
  });
  
  await manager.addMessage(conv2.id, {
    id: 'msg2',
    role: 'user',
    content: 'Hi',
    timestamp: new Date(),
  });
  
  await manager.addMessage(conv2.id, {
    id: 'msg3',
    role: 'assistant',
    content: 'Hello!',
    timestamp: new Date(),
  });
  
  const stats = manager.getStats();
  
  assertEqual(stats.totalConversations, 2, 'Should have 2 conversations');
  assertEqual(stats.totalMessages, 3, 'Should have 3 messages');
  assertEqual(stats.conversationsByRole.guest, 1, 'Should have 1 guest conversation');
  assertEqual(stats.conversationsByRole.manager, 1, 'Should have 1 manager conversation');
  
  manager.stopCleanup();
  console.log('✓ Get statistics test passed');
}

// Test 8: Tool uses in messages
async function testToolUses() {
  console.log('\n=== Test 8: Tool Uses in Messages ===');
  const manager = new ConversationManager();
  
  const conversation = await manager.createConversation('user123', 'manager');
  
  const message: ConversationMessage = {
    id: 'msg1',
    role: 'assistant',
    content: 'Let me check that for you',
    timestamp: new Date(),
    toolUses: [
      {
        toolName: 'get_occupancy_stats',
        toolInput: { date: '2024-01-01' },
        toolUseId: 'tool1',
      },
    ],
  };
  
  await manager.addMessage(conversation.id, message);
  
  const updated = await manager.getConversation(conversation.id);
  assertEqual(updated?.messages[0].toolUses?.length, 1, 'Should have 1 tool use');
  assertEqual(updated?.messages[0].toolUses?.[0].toolName, 'get_occupancy_stats', 'Tool name should match');
  
  manager.stopCleanup();
  console.log('✓ Tool uses test passed');
}

// Run all tests
async function runAllTests() {
  console.log('Starting Conversation Manager Tests...');
  
  try {
    await testCreateConversation();
    await testAddMessages();
    await testGetRecentMessages();
    await testClearConversation();
    await testGetUserConversations();
    await testConversationExpiration();
    await testGetStats();
    await testToolUses();
    
    console.log('\n=== All Tests Passed ✓ ===\n');
    process.exit(0);
  } catch (error) {
    console.error('\n=== Test Failed ✗ ===');
    console.error(error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}
