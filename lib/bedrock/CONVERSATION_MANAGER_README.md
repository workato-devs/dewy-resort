# Conversation Manager

The Conversation Manager provides in-memory conversation storage and context management for Bedrock chat sessions.

## Features

- ✅ Create and manage conversations for multiple users
- ✅ Add messages to conversations with role (user/assistant)
- ✅ Automatic context limiting to recent 10 messages
- ✅ Automatic conversation expiration after 24 hours
- ✅ Support for tool use tracking within messages
- ✅ Bedrock API format conversion
- ✅ Statistics and monitoring

## Quick Start

```typescript
import { conversationManager } from './lib/bedrock/conversation-manager';

// Create a new conversation
const conversation = await conversationManager.createConversation(
  'user123',
  'guest'
);

// Add a user message
await conversationManager.addMessage(conversation.id, {
  id: 'msg1',
  role: 'user',
  content: 'I need extra towels',
  timestamp: new Date(),
});

// Add an assistant message
await conversationManager.addMessage(conversation.id, {
  id: 'msg2',
  role: 'assistant',
  content: 'I\'ll create a service request for you',
  timestamp: new Date(),
  toolUses: [{
    toolName: 'create_service_request',
    toolInput: { category: 'housekeeping' },
  }],
});

// Get recent messages for Bedrock API (limited to 10)
const recentMessages = conversationManager.getRecentMessages(conversation);
// Returns: [{ role: 'user', content: '...' }, { role: 'assistant', content: '...' }]
```

## API Reference

### `createConversation(userId: string, role: string): Promise<Conversation>`

Creates a new conversation for a user with a specific role.

**Parameters:**
- `userId` - User ID from session
- `role` - User role: 'guest', 'manager', 'housekeeping', or 'maintenance'

**Returns:** New conversation object with unique ID

### `getConversation(conversationId: string): Promise<Conversation | null>`

Retrieves a conversation by ID. Returns null if not found or expired.

### `addMessage(conversationId: string, message: ConversationMessage): Promise<void>`

Adds a message to a conversation.

**Message Format:**
```typescript
{
  id: string;              // Unique message ID
  role: 'user' | 'assistant';
  content: string;         // Message text
  timestamp: Date;
  toolUses?: ToolUseRequest[];  // Optional tool invocations
}
```

### `getRecentMessages(conversation: Conversation, limit?: number): BedrockMessage[]`

Gets recent messages in Bedrock API format. Default limit is 10 messages.

**Returns:** Array of messages with only `role` and `content` fields.

### `clearConversation(conversationId: string): Promise<void>`

Clears all messages from a conversation while keeping the conversation itself.

### `deleteConversation(conversationId: string): Promise<void>`

Deletes a conversation completely.

### `getUserConversations(userId: string): Promise<Conversation[]>`

Gets all active conversations for a user.

### `getStats(): { totalConversations, totalMessages, conversationsByRole }`

Returns statistics about stored conversations.

## Conversation Lifecycle

1. **Creation**: Conversation created with `createConversation()`
2. **Active**: Messages added, `updatedAt` timestamp refreshed
3. **Expiration**: After 24 hours of inactivity, conversation expires
4. **Cleanup**: Expired conversations automatically removed every hour

## Context Limiting

The Conversation Manager limits context to the most recent 10 messages by default:

```typescript
// Add 15 messages
for (let i = 1; i <= 15; i++) {
  await conversationManager.addMessage(conversationId, message);
}

// Get recent messages (only last 10)
const context = conversationManager.getRecentMessages(conversation);
// Returns messages 6-15
```

This prevents token limit issues while maintaining relevant context.

## Tool Use Tracking

Messages can include tool use information:

```typescript
await conversationManager.addMessage(conversationId, {
  id: 'msg1',
  role: 'assistant',
  content: 'Let me check the occupancy',
  timestamp: new Date(),
  toolUses: [
    {
      toolName: 'get_occupancy_stats',
      toolInput: { date: '2024-01-01' },
      toolUseId: 'tool1',
    },
  ],
});
```

Tool uses are stored in the conversation but not included in the Bedrock API format.

## Memory Management

- Conversations expire after 24 hours of inactivity
- Automatic cleanup runs every hour
- Typical memory usage: ~1KB per conversation + ~500 bytes per message
- 1000 conversations with 10 messages each: ~6MB

## Testing

Run manual tests:
```bash
npx tsx lib/bedrock/__tests__/conversation-manager-manual.test.ts
```

Run usage examples:
```bash
npx tsx lib/bedrock/examples/conversation-manager-usage.ts
```

## Integration Example

```typescript
// In your chat API endpoint
import { conversationManager } from './lib/bedrock/conversation-manager';
import { bedrockService } from './lib/bedrock/client';

// Get or create conversation
let conversation = await conversationManager.getConversation(conversationId);
if (!conversation) {
  conversation = await conversationManager.createConversation(userId, role);
}

// Add user message
await conversationManager.addMessage(conversation.id, {
  id: randomUUID(),
  role: 'user',
  content: userMessage,
  timestamp: new Date(),
});

// Get context for Bedrock
const context = conversationManager.getRecentMessages(conversation);

// Invoke Bedrock with context
const stream = bedrockService.streamInvoke({
  messages: context,
  systemPrompt: systemPrompt,
  // ... other options
});

// After streaming completes, save assistant message
await conversationManager.addMessage(conversation.id, {
  id: randomUUID(),
  role: 'assistant',
  content: assistantResponse,
  timestamp: new Date(),
  toolUses: toolsUsed,
});
```

## Future Enhancements

- Persistent storage (Redis/DynamoDB)
- Conversation search and filtering
- Export conversation transcripts
- Conversation branching
- Multi-user conversations

## Requirements

Implements requirements 12.1, 12.2, 12.3, 12.4, and 12.5 from the Bedrock Chat Integration specification.

## See Also

- [Implementation Summary](./CONVERSATION_MANAGER_IMPLEMENTATION_SUMMARY.md)
- [Usage Examples](./examples/conversation-manager-usage.ts)
- [Manual Tests](./tests/conversation-manager-manual.test.ts)
