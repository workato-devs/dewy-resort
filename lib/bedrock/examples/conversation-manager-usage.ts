/**
 * Conversation Manager Usage Examples
 * 
 * Demonstrates how to use the Conversation Manager for managing chat conversations.
 */

import { conversationManager, ConversationMessage } from '../conversation-manager';

/**
 * Example 1: Create a new conversation
 */
async function createNewConversation() {
  console.log('=== Creating New Conversation ===');
  
  const conversation = await conversationManager.createConversation(
    'user123',
    'guest'
  );
  
  console.log('Created conversation:', {
    id: conversation.id,
    userId: conversation.userId,
    role: conversation.role,
    messageCount: conversation.messages.length,
  });
  
  return conversation.id;
}

/**
 * Example 2: Add messages to a conversation
 */
async function addMessagesToConversation(conversationId: string) {
  console.log('\n=== Adding Messages ===');
  
  // User message
  const userMessage: ConversationMessage = {
    id: 'msg1',
    role: 'user',
    content: 'I need extra towels in my room',
    timestamp: new Date(),
  };
  
  await conversationManager.addMessage(conversationId, userMessage);
  console.log('Added user message');
  
  // Assistant message
  const assistantMessage: ConversationMessage = {
    id: 'msg2',
    role: 'assistant',
    content: 'I\'ll create a service request for extra towels right away.',
    timestamp: new Date(),
    toolUses: [
      {
        toolName: 'create_service_request',
        toolInput: {
          category: 'housekeeping',
          description: 'Extra towels needed',
          priority: 'medium',
        },
        toolUseId: 'tool1',
      },
    ],
  };
  
  await conversationManager.addMessage(conversationId, assistantMessage);
  console.log('Added assistant message with tool use');
}

/**
 * Example 3: Retrieve conversation and get recent messages
 */
async function getConversationContext(conversationId: string) {
  console.log('\n=== Getting Conversation Context ===');
  
  const conversation = await conversationManager.getConversation(conversationId);
  
  if (!conversation) {
    console.log('Conversation not found or expired');
    return;
  }
  
  console.log('Conversation details:', {
    id: conversation.id,
    userId: conversation.userId,
    role: conversation.role,
    messageCount: conversation.messages.length,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  });
  
  // Get recent messages for Bedrock API (limited to 10)
  const recentMessages = await conversationManager.getRecentMessages(conversation, 10);
  
  console.log('\nRecent messages for Bedrock:');
  recentMessages.forEach((msg, index) => {
    console.log(`${index + 1}. [${msg.role}]: ${msg.content}`);
  });
}

/**
 * Example 4: Multi-turn conversation
 */
async function multiTurnConversation() {
  console.log('\n=== Multi-Turn Conversation ===');
  
  const conversation = await conversationManager.createConversation(
    'user456',
    'manager'
  );
  
  const messages: ConversationMessage[] = [
    {
      id: 'msg1',
      role: 'user',
      content: 'What is our occupancy rate today?',
      timestamp: new Date(),
    },
    {
      id: 'msg2',
      role: 'assistant',
      content: 'Let me check the current occupancy statistics.',
      timestamp: new Date(),
      toolUses: [
        {
          toolName: 'get_occupancy_stats',
          toolInput: { date: new Date().toISOString().split('T')[0] },
        },
      ],
    },
    {
      id: 'msg3',
      role: 'assistant',
      content: 'The current occupancy rate is 85% with 34 out of 40 rooms occupied.',
      timestamp: new Date(),
    },
    {
      id: 'msg4',
      role: 'user',
      content: 'How does that compare to last week?',
      timestamp: new Date(),
    },
  ];
  
  for (const message of messages) {
    await conversationManager.addMessage(conversation.id, message);
  }
  
  console.log(`Added ${messages.length} messages to conversation`);
  
  // Get context for next response
  const context = await conversationManager.getRecentMessages(conversation);
  console.log(`Context includes ${context.length} messages`);
}

/**
 * Example 5: Context limiting with many messages
 */
async function demonstrateContextLimiting() {
  console.log('\n=== Context Limiting ===');
  
  const conversation = await conversationManager.createConversation(
    'user789',
    'guest'
  );
  
  // Add 15 messages
  for (let i = 1; i <= 15; i++) {
    const message: ConversationMessage = {
      id: `msg${i}`,
      role: i % 2 === 1 ? 'user' : 'assistant',
      content: `Message number ${i}`,
      timestamp: new Date(),
    };
    await conversationManager.addMessage(conversation.id, message);
  }
  
  console.log('Added 15 messages to conversation');
  
  // Get recent messages (limited to 10)
  const recentMessages = await conversationManager.getRecentMessages(conversation);
  
  console.log(`Recent messages (limited to 10):`);
  console.log(`First message: "${recentMessages[0].content}"`);
  console.log(`Last message: "${recentMessages[recentMessages.length - 1].content}"`);
  console.log(`Total in context: ${recentMessages.length}`);
}

/**
 * Example 6: Clear conversation history
 */
async function clearConversationHistory(conversationId: string) {
  console.log('\n=== Clearing Conversation ===');
  
  const before = await conversationManager.getConversation(conversationId);
  console.log(`Messages before clear: ${before?.messages.length || 0}`);
  
  await conversationManager.clearConversation(conversationId);
  
  const after = await conversationManager.getConversation(conversationId);
  console.log(`Messages after clear: ${after?.messages.length || 0}`);
}

/**
 * Example 7: Get user's conversations
 */
async function getUserConversations() {
  console.log('\n=== User Conversations ===');
  
  // Create multiple conversations for a user
  await conversationManager.createConversation('user123', 'guest');
  await conversationManager.createConversation('user123', 'manager');
  
  const conversations = await conversationManager.getUserConversations('user123');
  
  console.log(`User has ${conversations.length} conversations:`);
  conversations.forEach((conv, index) => {
    console.log(`${index + 1}. ${conv.role} conversation with ${conv.messages.length} messages`);
  });
}

/**
 * Example 8: Get conversation statistics
 */
async function getStatistics() {
  console.log('\n=== Conversation Statistics ===');
  
  const stats = conversationManager.getStats();
  
  console.log('Statistics:', {
    totalConversations: stats.totalConversations,
    totalMessages: stats.totalMessages,
    conversationsByRole: stats.conversationsByRole,
  });
}

/**
 * Example 9: Handle conversation expiration
 */
async function handleExpiration() {
  console.log('\n=== Conversation Expiration ===');
  
  const conversation = await conversationManager.createConversation(
    'user999',
    'guest'
  );
  
  console.log('Created conversation:', conversation.id);
  
  // In a real scenario, this conversation would expire after 24 hours
  // The cleanup process runs every hour to remove expired conversations
  
  console.log('Conversation will expire 24 hours after last update');
  console.log('Automatic cleanup runs every hour');
}

/**
 * Run all examples
 */
async function runAllExamples() {
  try {
    // Example 1: Create conversation
    const conversationId = await createNewConversation();
    
    // Example 2: Add messages
    await addMessagesToConversation(conversationId);
    
    // Example 3: Get context
    await getConversationContext(conversationId);
    
    // Example 4: Multi-turn conversation
    await multiTurnConversation();
    
    // Example 5: Context limiting
    await demonstrateContextLimiting();
    
    // Example 6: Clear conversation
    await clearConversationHistory(conversationId);
    
    // Example 7: User conversations
    await getUserConversations();
    
    // Example 8: Statistics
    await getStatistics();
    
    // Example 9: Expiration
    await handleExpiration();
    
    console.log('\n=== All Examples Complete ===');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples()
    .then(() => {
      console.log('\nExamples completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Examples failed:', error);
      process.exit(1);
    });
}

export {
  createNewConversation,
  addMessagesToConversation,
  getConversationContext,
  multiTurnConversation,
  demonstrateContextLimiting,
  clearConversationHistory,
  getUserConversations,
  getStatistics,
  handleExpiration,
};
