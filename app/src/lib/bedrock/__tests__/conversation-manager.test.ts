/**
 * Conversation Manager Tests
 * 
 * Manual verification tests for conversation lifecycle, message management, and expiration.
 * Run with: npx tsx lib/bedrock/__tests__/conversation-manager.test.ts
 */

import { ConversationManager, ConversationMessage } from '../conversation-manager';

/**
 * Test helper to assert conditions
 */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Test helper to check equality
 */
function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}. Expected ${expected}, got ${actual}`);
  }
}

/**
 * Test: Create Conversation
 */
async function testCreateConversation(): Promise<void> {
  console.log('\n=== Test: Create Conversation ===');
  
  const manager = new ConversationManager();

  try {
    // Test basic conversation creation
    console.log('Testing basic conversation creation...');
    const conversation = await manager.createConversation('user123', 'guest');
    
    assert(conversation !== null && conversation !== undefined, 'Conversation should be defined');
    assert(conversation.id !== null && conversation.id !== undefined, 'Conversation should have ID');
    assertEqual(conversation.userId, 'user123', 'Conversation should have correct user ID');
    assertEqual(conversation.role, 'guest', 'Conversation should have correct role');
    assertEqual(conversation.messages.length, 0, 'New conversation should have no messages');
    assert(conversation.createdAt instanceof Date, 'createdAt should be a Date');
    assert(conversation.updatedAt instanceof Date, 'updatedAt should be a Date');
    console.log('✓ Basic conversation created');

    // Test unique IDs
    console.log('Testing unique conversation IDs...');
    const conv1 = await manager.createConversation('user123', 'guest');
    const conv2 = await manager.createConversation('user123', 'guest');
    assert(conv1.id !== conv2.id, 'Conversations should have different IDs');
    console.log('✓ Conversations have unique IDs');

    // Test all roles
    console.log('Testing all user roles...');
    const roles = ['guest', 'manager', 'housekeeping', 'maintenance'];
    for (const role of roles) {
      const conv = await manager.createConversation('user123', role);
      assertEqual(conv.role, role, `Conversation should have role ${role}`);
    }
    console.log('✓ All user roles supported');

    console.log('✓ All create conversation tests passed');
  } finally {
    manager.stopCleanup();
  }
}

/**
 * Test: Get Conversation
 */
async function testGetConversation(): Promise<void> {
  console.log('\n=== Test: Get Conversation ===');
  
  const manager = new ConversationManager();

  try {
    // Test retrieving existing conversation
    console.log('Testing retrieve existing conversation...');
    const created = await manager.createConversation('user123', 'guest');
    const retrieved = await manager.getConversation(created.id);
    
    assert(retrieved !== null, 'Retrieved conversation should not be null');
    assertEqual(retrieved?.id, created.id, 'Retrieved conversation should have same ID');
    assertEqual(retrieved?.userId, 'user123', 'Retrieved conversation should have same user ID');
    console.log('✓ Existing conversation retrieved');

    // Test non-existent conversation
    console.log('Testing non-existent conversation...');
    const nonExistent = await manager.getConversation('non-existent-id');
    assertEqual(nonExistent, null, 'Non-existent conversation should return null');
    console.log('✓ Non-existent conversation returns null');

    // Test expired conversation
    console.log('Testing expired conversation...');
    const conversation = await manager.createConversation('user123', 'guest');
    const toExpire = await manager.getConversation(conversation.id);
    if (toExpire) {
      toExpire.updatedAt = new Date(Date.now() - 25 * 60 * 60 * 1000);
    }
    const expired = await manager.getConversation(conversation.id);
    assertEqual(expired, null, 'Expired conversation should return null');
    console.log('✓ Expired conversation returns null');

    console.log('✓ All get conversation tests passed');
  } finally {
    manager.stopCleanup();
  }
}

/**
 * Test: Add Message
 */
async function testAddMessage(): Promise<void> {
  console.log('\n=== Test: Add Message ===');
  
  const manager = new ConversationManager();

  try {
    // Test adding single message
    console.log('Testing add single message...');
    const conversation = await manager.createConversation('user123', 'guest');
    const message: ConversationMessage = {
      id: 'msg1',
      role: 'user',
      content: 'Hello',
      timestamp: new Date(),
    };
    await manager.addMessage(conversation.id, message);
    const updated = await manager.getConversation(conversation.id);
    assertEqual(updated?.messages.length, 1, 'Should have one message');
    assertEqual(updated?.messages[0].id, 'msg1', 'Message should have correct ID');
    console.log('✓ Single message added');

    // Test adding multiple messages
    console.log('Testing add multiple messages...');
    const conv2 = await manager.createConversation('user456', 'manager');
    const messages: ConversationMessage[] = [
      { id: 'msg1', role: 'user', content: 'Hello', timestamp: new Date() },
      { id: 'msg2', role: 'assistant', content: 'Hi there!', timestamp: new Date() },
      { id: 'msg3', role: 'user', content: 'How are you?', timestamp: new Date() },
    ];
    for (const msg of messages) {
      await manager.addMessage(conv2.id, msg);
    }
    const updated2 = await manager.getConversation(conv2.id);
    assertEqual(updated2?.messages.length, 3, 'Should have three messages');
    const ids = updated2?.messages.map(m => m.id);
    assert(ids?.includes('msg1') && ids?.includes('msg2') && ids?.includes('msg3'), 'Should have all message IDs');
    console.log('✓ Multiple messages added');

    // Test timestamp update
    console.log('Testing timestamp update...');
    const conv3 = await manager.createConversation('user789', 'guest');
    const originalTime = conv3.updatedAt.getTime();
    await new Promise(resolve => setTimeout(resolve, 10));
    await manager.addMessage(conv3.id, {
      id: 'msg1',
      role: 'user',
      content: 'Test',
      timestamp: new Date(),
    });
    const updated3 = await manager.getConversation(conv3.id);
    assert(updated3!.updatedAt.getTime() > originalTime, 'updatedAt should be updated');
    console.log('✓ Timestamp updated');

    // Test non-existent conversation
    console.log('Testing non-existent conversation...');
    try {
      await manager.addMessage('non-existent', {
        id: 'msg1',
        role: 'user',
        content: 'Test',
        timestamp: new Date(),
      });
      throw new Error('Should have thrown error');
    } catch (error: any) {
      assert(
        error.message.includes('not found') || error.message.includes('expired') || error.message.includes('Should have thrown error'),
        `Should throw not found error, got: ${error.message}`
      );
      // If we got our own error, that means addMessage didn't throw
      if (error.message === 'Should have thrown error') {
        throw error;
      }
    }
    console.log('✓ Non-existent conversation handled');

    // Test messages with tool uses
    console.log('Testing messages with tool uses...');
    const conv4 = await manager.createConversation('user999', 'manager');
    await manager.addMessage(conv4.id, {
      id: 'msg1',
      role: 'assistant',
      content: 'Let me check',
      timestamp: new Date(),
      toolUses: [{
        toolName: 'get_occupancy_stats',
        toolInput: { date: '2024-01-01' },
        toolUseId: 'tool1',
      }],
    });
    const updated4 = await manager.getConversation(conv4.id);
    assertEqual(updated4?.messages[0].toolUses?.length, 1, 'Should have one tool use');
    assertEqual(updated4?.messages[0].toolUses?.[0].toolName, 'get_occupancy_stats', 'Should have correct tool name');
    console.log('✓ Messages with tool uses supported');

    console.log('✓ All add message tests passed');
  } finally {
    manager.stopCleanup();
  }
}

/**
 * Test: Get Recent Messages
 */
async function testGetRecentMessages(): Promise<void> {
  console.log('\n=== Test: Get Recent Messages ===');
  
  const manager = new ConversationManager();

  try {
    // Test with fewer messages than limit
    console.log('Testing with fewer messages than limit...');
    const conv1 = await manager.createConversation('user123', 'guest');
    for (let i = 1; i <= 3; i++) {
      await manager.addMessage(conv1.id, {
        id: `msg${i}`,
        role: i % 2 === 1 ? 'user' : 'assistant',
        content: `Message ${i}`,
        timestamp: new Date(),
      });
    }
    const recent1 = manager.getRecentMessages(conv1, 10);
    assertEqual(recent1.length, 3, 'Should return all 3 messages');
    console.log('✓ Returns all messages when under limit');

    // Test with more messages than limit
    console.log('Testing with more messages than limit...');
    const conv2 = await manager.createConversation('user456', 'manager');
    for (let i = 1; i <= 15; i++) {
      await manager.addMessage(conv2.id, {
        id: `msg${i}`,
        role: i % 2 === 1 ? 'user' : 'assistant',
        content: `Message ${i}`,
        timestamp: new Date(),
      });
    }
    const recent2 = manager.getRecentMessages(conv2, 10);
    assertEqual(recent2.length, 10, 'Should return only 10 messages');
    assertEqual(recent2[0].content, 'Message 6', 'Should start from message 6');
    assertEqual(recent2[9].content, 'Message 15', 'Should end at message 15');
    console.log('✓ Limits to most recent N messages');

    // Test Bedrock format conversion
    console.log('Testing Bedrock format conversion...');
    const conv3 = await manager.createConversation('user789', 'guest');
    await manager.addMessage(conv3.id, {
      id: 'msg1',
      role: 'user',
      content: 'Hello',
      timestamp: new Date(),
      toolUses: [{ toolName: 'test', toolInput: {}, toolUseId: 'tool1' }],
    });
    const recent3 = manager.getRecentMessages(conv3, 10);
    assertEqual(recent3.length, 1, 'Should have one message');
    assertEqual(recent3[0].role, 'user', 'Should have correct role');
    assertEqual(recent3[0].content, 'Hello', 'Should have correct content');
    assert(!('toolUses' in recent3[0]), 'Should not have toolUses in Bedrock format');
    console.log('✓ Converts to Bedrock format');

    // Test default limit
    console.log('Testing default limit...');
    const conv4 = await manager.createConversation('user999', 'housekeeping');
    for (let i = 1; i <= 15; i++) {
      await manager.addMessage(conv4.id, {
        id: `msg${i}`,
        role: i % 2 === 1 ? 'user' : 'assistant',
        content: `Message ${i}`,
        timestamp: new Date(),
      });
    }
    const recent4 = manager.getRecentMessages(conv4);
    assertEqual(recent4.length, 10, 'Should default to 10 messages');
    console.log('✓ Defaults to 10 messages');

    console.log('✓ All get recent messages tests passed');
  } finally {
    manager.stopCleanup();
  }
}

/**
 * Test: Clear Conversation
 */
async function testClearConversation(): Promise<void> {
  console.log('\n=== Test: Clear Conversation ===');
  
  const manager = new ConversationManager();

  try {
    // Test clearing messages
    console.log('Testing clear messages...');
    const conversation = await manager.createConversation('user123', 'guest');
    await manager.addMessage(conversation.id, {
      id: 'msg1',
      role: 'user',
      content: 'Hello',
      timestamp: new Date(),
    });
    await manager.addMessage(conversation.id, {
      id: 'msg2',
      role: 'assistant',
      content: 'Hi!',
      timestamp: new Date(),
    });
    await manager.clearConversation(conversation.id);
    const updated = await manager.getConversation(conversation.id);
    assertEqual(updated?.messages.length, 0, 'Should have no messages after clear');
    console.log('✓ Messages cleared');

    // Test timestamp update
    console.log('Testing timestamp update on clear...');
    const conv2 = await manager.createConversation('user456', 'manager');
    const originalTime = conv2.updatedAt.getTime();
    await new Promise(resolve => setTimeout(resolve, 10));
    await manager.clearConversation(conv2.id);
    const updated2 = await manager.getConversation(conv2.id);
    assert(updated2!.updatedAt.getTime() > originalTime, 'updatedAt should be updated');
    console.log('✓ Timestamp updated on clear');

    // Test non-existent conversation
    console.log('Testing non-existent conversation...');
    try {
      await manager.clearConversation('non-existent');
      throw new Error('Should have thrown error');
    } catch (error: any) {
      assert(
        error.message.includes('not found') || error.message.includes('expired') || error.message.includes('Should have thrown error'),
        `Should throw not found error, got: ${error.message}`
      );
      // If we got our own error, that means clearConversation didn't throw
      if (error.message === 'Should have thrown error') {
        throw error;
      }
    }
    console.log('✓ Non-existent conversation handled');

    console.log('✓ All clear conversation tests passed');
  } finally {
    manager.stopCleanup();
  }
}

/**
 * Test: Delete Conversation
 */
async function testDeleteConversation(): Promise<void> {
  console.log('\n=== Test: Delete Conversation ===');
  
  const manager = new ConversationManager();

  try {
    // Test deleting conversation
    console.log('Testing delete conversation...');
    const conversation = await manager.createConversation('user123', 'guest');
    await manager.deleteConversation(conversation.id);
    const result = await manager.getConversation(conversation.id);
    assertEqual(result, null, 'Deleted conversation should return null');
    console.log('✓ Conversation deleted');

    // Test deleting non-existent conversation
    console.log('Testing delete non-existent conversation...');
    await manager.deleteConversation('non-existent');
    console.log('✓ Non-existent conversation deletion handled gracefully');

    console.log('✓ All delete conversation tests passed');
  } finally {
    manager.stopCleanup();
  }
}

/**
 * Test: Get User Conversations
 */
async function testGetUserConversations(): Promise<void> {
  console.log('\n=== Test: Get User Conversations ===');
  
  const manager = new ConversationManager();

  try {
    // Test getting user conversations
    console.log('Testing get user conversations...');
    await manager.createConversation('user123', 'guest');
    await manager.createConversation('user123', 'manager');
    await manager.createConversation('user456', 'guest');
    
    const user123Convs = await manager.getUserConversations('user123');
    assertEqual(user123Convs.length, 2, 'User123 should have 2 conversations');
    assert(user123Convs.every(c => c.userId === 'user123'), 'All conversations should belong to user123');
    console.log('✓ User conversations retrieved');

    // Test empty user
    console.log('Testing empty user...');
    const emptyConvs = await manager.getUserConversations('user999');
    assertEqual(emptyConvs.length, 0, 'User with no conversations should return empty array');
    console.log('✓ Empty user handled');

    // Test expired conversations not returned
    console.log('Testing expired conversations not returned...');
    const conv = await manager.createConversation('user789', 'guest');
    const toExpire = await manager.getConversation(conv.id);
    if (toExpire) {
      toExpire.updatedAt = new Date(Date.now() - 25 * 60 * 60 * 1000);
    }
    const user789Convs = await manager.getUserConversations('user789');
    assertEqual(user789Convs.length, 0, 'Expired conversations should not be returned');
    console.log('✓ Expired conversations filtered out');

    console.log('✓ All get user conversations tests passed');
  } finally {
    manager.stopCleanup();
  }
}

/**
 * Test: Get Stats
 */
async function testGetStats(): Promise<void> {
  console.log('\n=== Test: Get Stats ===');
  
  const manager = new ConversationManager();

  try {
    // Test stats with conversations
    console.log('Testing stats with conversations...');
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
    console.log('✓ Stats calculated correctly');

    // Test empty stats
    console.log('Testing empty stats...');
    const emptyManager = new ConversationManager();
    const emptyStats = emptyManager.getStats();
    assertEqual(emptyStats.totalConversations, 0, 'Should have 0 conversations');
    assertEqual(emptyStats.totalMessages, 0, 'Should have 0 messages');
    assertEqual(Object.keys(emptyStats.conversationsByRole).length, 0, 'Should have no role stats');
    emptyManager.stopCleanup();
    console.log('✓ Empty stats handled');

    console.log('✓ All get stats tests passed');
  } finally {
    manager.stopCleanup();
  }
}

/**
 * Test: Conversation Expiration
 */
async function testConversationExpiration(): Promise<void> {
  console.log('\n=== Test: Conversation Expiration ===');
  
  const manager = new ConversationManager();

  try {
    // Test non-expired conversation
    console.log('Testing non-expired conversation...');
    const conv1 = await manager.createConversation('user123', 'guest');
    const retrieved1 = await manager.getConversation(conv1.id);
    if (retrieved1) {
      retrieved1.updatedAt = new Date(Date.now() - 23 * 60 * 60 * 1000);
    }
    const result1 = await manager.getConversation(conv1.id);
    assert(result1 !== null, 'Conversation within 24 hours should not expire');
    console.log('✓ Non-expired conversation accessible');

    // Test expired conversation
    console.log('Testing expired conversation...');
    const conv2 = await manager.createConversation('user456', 'manager');
    const retrieved2 = await manager.getConversation(conv2.id);
    if (retrieved2) {
      retrieved2.updatedAt = new Date(Date.now() - 25 * 60 * 60 * 1000);
    }
    const result2 = await manager.getConversation(conv2.id);
    assertEqual(result2, null, 'Conversation after 24 hours should expire');
    console.log('✓ Expired conversation returns null');

    console.log('✓ All conversation expiration tests passed');
  } finally {
    manager.stopCleanup();
  }
}

/**
 * Run all tests
 */
async function runTests(): Promise<void> {
  console.log('=================================================');
  console.log('Conversation Manager - Verification Tests');
  console.log('=================================================');
  
  try {
    await testCreateConversation();
    await testGetConversation();
    await testAddMessage();
    await testGetRecentMessages();
    await testClearConversation();
    await testDeleteConversation();
    await testGetUserConversations();
    await testGetStats();
    await testConversationExpiration();
    
    console.log('\n=================================================');
    console.log('✓ All verification tests passed!');
    console.log('=================================================\n');
    
    // Note about integration testing
    console.log('Note: These tests verify Conversation Manager functionality.');
    console.log('The manager stores conversations in memory and automatically');
    console.log('expires conversations after 24 hours of inactivity.\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}
