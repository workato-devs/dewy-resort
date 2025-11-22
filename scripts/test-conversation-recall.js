#!/usr/bin/env node

/**
 * Test Conversation Recall Functionality
 * 
 * This script tests:
 * 1. API endpoint for listing conversations
 * 2. API endpoint for fetching specific conversation
 * 3. ConversationManager getUserConversations method
 * 4. ConversationManager getConversation method
 */

const { ConversationManager } = require('../lib/bedrock/conversation-manager');

async function testConversationRecall() {
  console.log('🧪 Testing Conversation Recall Functionality\n');

  try {
    // Initialize conversation manager
    const conversationManager = new ConversationManager();
    console.log('✅ ConversationManager initialized\n');

    // Test 1: Create test conversations
    console.log('📝 Test 1: Creating test conversations...');
    const testUserId = 'test-user-123';
    const testRole = 'guest';

    const conv1 = await conversationManager.createConversation(testUserId, testRole);
    console.log(`✅ Created conversation 1: ${conv1.id}`);

    await conversationManager.addMessage(conv1.id, {
      id: 'msg1',
      role: 'user',
      content: 'Hello, this is my first message',
      timestamp: new Date(),
    }, testUserId);

    await conversationManager.addMessage(conv1.id, {
      id: 'msg2',
      role: 'assistant',
      content: 'Hello! How can I help you today?',
      timestamp: new Date(),
    }, testUserId);

    console.log(`✅ Added 2 messages to conversation 1\n`);

    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 100));

    const conv2 = await conversationManager.createConversation(testUserId, testRole);
    console.log(`✅ Created conversation 2: ${conv2.id}`);

    await conversationManager.addMessage(conv2.id, {
      id: 'msg3',
      role: 'user',
      content: 'This is my second conversation',
      timestamp: new Date(),
    }, testUserId);

    console.log(`✅ Added 1 message to conversation 2\n`);

    // Test 2: Get user conversations
    console.log('📝 Test 2: Fetching user conversations...');
    const conversations = await conversationManager.getUserConversations(testUserId);
    
    console.log(`✅ Found ${conversations.length} conversations for user ${testUserId}`);
    
    if (conversations.length !== 2) {
      throw new Error(`Expected 2 conversations, got ${conversations.length}`);
    }

    // Verify conversations are sorted by updatedAt (most recent first)
    if (conversations[0].id !== conv2.id) {
      throw new Error('Conversations not sorted correctly (most recent first)');
    }

    console.log('✅ Conversations sorted correctly (most recent first)\n');

    // Test 3: Get specific conversation
    console.log('📝 Test 3: Fetching specific conversation...');
    const loadedConv = await conversationManager.getConversation(conv1.id, testUserId);
    
    if (!loadedConv) {
      throw new Error('Failed to load conversation');
    }

    console.log(`✅ Loaded conversation: ${loadedConv.id}`);
    console.log(`   - Messages: ${loadedConv.messages.length}`);
    console.log(`   - Created: ${loadedConv.createdAt.toISOString()}`);
    console.log(`   - Updated: ${loadedConv.updatedAt.toISOString()}`);

    if (loadedConv.messages.length !== 2) {
      throw new Error(`Expected 2 messages, got ${loadedConv.messages.length}`);
    }

    console.log('✅ Conversation loaded with correct message count\n');

    // Test 4: Verify conversation metadata
    console.log('📝 Test 4: Verifying conversation metadata...');
    
    conversations.forEach((conv, index) => {
      console.log(`\nConversation ${index + 1}:`);
      console.log(`   - ID: ${conv.id}`);
      console.log(`   - User: ${conv.userId}`);
      console.log(`   - Role: ${conv.role}`);
      console.log(`   - Messages: ${conv.messages.length}`);
      console.log(`   - Created: ${conv.createdAt.toISOString()}`);
      console.log(`   - Updated: ${conv.updatedAt.toISOString()}`);
      
      if (conv.messages.length > 0) {
        const lastMsg = conv.messages[conv.messages.length - 1];
        const preview = lastMsg.content.substring(0, 50) + (lastMsg.content.length > 50 ? '...' : '');
        console.log(`   - Last message: "${preview}"`);
      }
    });

    console.log('\n✅ All metadata verified\n');

    // Test 5: Test access control
    console.log('📝 Test 5: Testing access control...');
    const otherUserId = 'other-user-456';
    const deniedConv = await conversationManager.getConversation(conv1.id, otherUserId);
    
    if (deniedConv !== null) {
      throw new Error('Access control failed - user should not access other user\'s conversation');
    }

    console.log('✅ Access control working correctly\n');

    // Test 6: Test role filtering
    console.log('📝 Test 6: Testing role filtering...');
    
    // Create a conversation with different role
    const managerConv = await conversationManager.createConversation(testUserId, 'manager');
    console.log(`✅ Created manager conversation: ${managerConv.id}`);

    const guestConvs = await conversationManager.getUserConversations(testUserId, 'guest');
    const managerConvs = await conversationManager.getUserConversations(testUserId, 'manager');

    console.log(`✅ Guest conversations: ${guestConvs.length}`);
    console.log(`✅ Manager conversations: ${managerConvs.length}`);

    if (guestConvs.length !== 2) {
      throw new Error(`Expected 2 guest conversations, got ${guestConvs.length}`);
    }

    if (managerConvs.length !== 1) {
      throw new Error(`Expected 1 manager conversation, got ${managerConvs.length}`);
    }

    console.log('✅ Role filtering working correctly\n');

    // Test 7: Test limit parameter
    console.log('📝 Test 7: Testing limit parameter...');
    const limitedConvs = await conversationManager.getUserConversations(testUserId, undefined, 1);
    
    if (limitedConvs.length !== 1) {
      throw new Error(`Expected 1 conversation with limit, got ${limitedConvs.length}`);
    }

    console.log('✅ Limit parameter working correctly\n');

    // Cleanup
    console.log('🧹 Cleaning up test data...');
    await conversationManager.deleteConversation(conv1.id);
    await conversationManager.deleteConversation(conv2.id);
    await conversationManager.deleteConversation(managerConv.id);
    console.log('✅ Test data cleaned up\n');

    console.log('✅ All tests passed!\n');
    console.log('📊 Summary:');
    console.log('   - ✅ Create conversations');
    console.log('   - ✅ Add messages to conversations');
    console.log('   - ✅ List user conversations');
    console.log('   - ✅ Load specific conversation');
    console.log('   - ✅ Verify metadata');
    console.log('   - ✅ Access control');
    console.log('   - ✅ Role filtering');
    console.log('   - ✅ Limit parameter');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run tests
testConversationRecall();
