# useBedrockChat Hook

React hook for managing streaming chat with Amazon Bedrock via Server-Sent Events (SSE).

## Features

- ✅ **EventSource Connection Management**: Handles SSE connections for real-time streaming
- ✅ **Message State Management**: Maintains chat history and conversation state
- ✅ **Streaming Token Updates**: Appends tokens in real-time as they arrive
- ✅ **Tool Use Status Tracking**: Tracks MCP tool execution with status indicators
- ✅ **Error Handling**: Comprehensive error handling with retry logic
- ✅ **Connection Cleanup**: Automatic cleanup on unmount
- ✅ **Auto-Reconnect**: Optional automatic reconnection on connection loss
- ✅ **Cancel Stream**: Ability to cancel ongoing streams

## Installation

The hook is already included in the project at `hooks/use-bedrock-chat.ts`.

## Basic Usage

```tsx
import { useBedrockChat } from '@/hooks/use-bedrock-chat';

function ChatComponent() {
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    conversationId,
    isConnected,
    cancelStream,
  } = useBedrockChat();

  const handleSend = async () => {
    await sendMessage('Hello, how can you help me?');
  };

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>
          <strong>{msg.role}:</strong> {msg.content}
        </div>
      ))}
      <button onClick={handleSend} disabled={isLoading}>
        Send
      </button>
    </div>
  );
}
```

## API Reference

### Options

```typescript
interface UseBedrockChatOptions {
  conversationId?: string;           // Resume existing conversation
  onError?: (error: Error) => void;  // Custom error handler
  autoReconnect?: boolean;           // Enable auto-reconnect (default: false)
  reconnectDelay?: number;           // Delay between reconnects (default: 2000ms)
  maxReconnectAttempts?: number;     // Max reconnect attempts (default: 3)
}
```

### Return Value

```typescript
interface UseBedrockChatReturn {
  messages: ChatMessage[];           // Array of chat messages
  isLoading: boolean;                // True when streaming response
  error: Error | null;               // Last error that occurred
  sendMessage: (content: string) => Promise<void>;  // Send a message
  clearMessages: () => void;         // Clear all messages
  conversationId: string | null;     // Current conversation ID
  isConnected: boolean;              // True when SSE connected
  cancelStream: () => void;          // Cancel ongoing stream
}
```

### ChatMessage Interface

```typescript
interface ChatMessage {
  id: string;                        // Unique message ID
  role: 'user' | 'assistant';        // Message sender
  content: string;                   // Message text
  timestamp: Date;                   // When message was created
  isStreaming?: boolean;             // True while streaming
  toolUses?: Array<{                 // MCP tools used
    toolName: string;
    status: 'pending' | 'complete' | 'error';
    result?: any;
  }>;
}
```

## Advanced Usage

### With Custom Error Handling

```tsx
const { messages, sendMessage } = useBedrockChat({
  onError: (error) => {
    console.error('Chat error:', error);
    // Custom error handling logic
  },
});
```

### With Auto-Reconnect

```tsx
const { messages, sendMessage, isConnected } = useBedrockChat({
  autoReconnect: true,
  reconnectDelay: 3000,
  maxReconnectAttempts: 5,
});
```

### Resume Existing Conversation

```tsx
const { messages, sendMessage, conversationId } = useBedrockChat({
  conversationId: 'conv_123456',
});
```

### Cancel Ongoing Stream

```tsx
const { sendMessage, cancelStream, isLoading } = useBedrockChat();

const handleCancel = () => {
  if (isLoading) {
    cancelStream();
  }
};
```

## SSE Event Types

The hook handles the following Server-Sent Events from `/api/chat/stream`:

### Token Event
```json
{
  "type": "token",
  "content": "Hello"
}
```
Appends text content to the streaming message.

### Tool Use Start Event
```json
{
  "type": "tool_use_start",
  "toolName": "get_bookings"
}
```
Indicates an MCP tool is being invoked.

### Tool Result Event
```json
{
  "type": "tool_result",
  "toolName": "get_bookings",
  "result": { ... }
}
```
Provides the result of a tool execution.

### Tool Error Event
```json
{
  "type": "tool_error",
  "toolName": "get_bookings",
  "error": "Tool execution failed"
}
```
Indicates a tool execution error.

### Done Event
```json
{
  "type": "done",
  "conversationId": "conv_123456"
}
```
Signals the end of the stream.

### Error Event
```json
{
  "type": "error",
  "error": "Service unavailable"
}
```
Indicates a stream error occurred.

## Error Handling

The hook handles several error scenarios:

1. **Connection Errors**: Network issues, connection lost
2. **Stream Errors**: Errors during streaming from Bedrock
3. **API Errors**: HTTP errors from the endpoint
4. **Parse Errors**: Invalid SSE event data

Errors are:
- Stored in the `error` state
- Passed to the `onError` callback if provided
- Displayed via toast notification (default behavior)

## Connection Management

The hook automatically:
- Closes connections on unmount
- Cleans up event listeners
- Aborts pending requests
- Clears reconnect timers

## Tool Use Tracking

When the LLM uses MCP tools, the hook tracks:
- Tool name
- Execution status (pending, complete, error)
- Tool results

Tool uses are attached to the assistant message:

```tsx
{messages.map(msg => (
  <div key={msg.id}>
    {msg.content}
    {msg.toolUses?.map(tool => (
      <div key={tool.toolName}>
        {tool.toolName}: {tool.status}
      </div>
    ))}
  </div>
))}
```

## Performance Considerations

- Messages are stored in React state (in-memory)
- Streaming updates trigger re-renders for each token
- Consider debouncing UI updates for very fast streams
- Connection pooling is handled by the browser
- Automatic cleanup prevents memory leaks

## Requirements Satisfied

This implementation satisfies the following requirements:

- **8.1**: Provides React hook for managing chat state and streaming
- **8.2**: Establishes Server-Sent Events connection to streaming endpoint
- **8.3**: Appends streaming tokens to current message in real-time
- **8.4**: Adds complete message to chat history when stream completes
- **8.5**: Provides loading states during response generation
- **8.6**: Handles connection errors with error messages
- **8.7**: Supports canceling in-progress streams on navigation
- **10.1-10.5**: All user experience requirements for typing indicators and feedback

## Example

See `hooks/examples/use-bedrock-chat-example.tsx` for a complete working example.

## Testing

To test the hook:

1. Ensure Bedrock integration is configured (AUTH_PROVIDER=cognito)
2. Start the development server
3. Navigate to a page using the hook
4. Send a message and observe streaming
5. Test tool execution if MCP tools are configured
6. Test error scenarios (network issues, invalid input)

## Troubleshooting

### Messages not streaming
- Check that `/api/chat/stream` returns `text/event-stream` content type
- Verify Bedrock credentials are valid
- Check browser console for errors

### Connection errors
- Verify network connectivity
- Check that session is valid
- Ensure Identity Pool is configured

### Tool execution not working
- Verify MCP configuration for your role
- Check that MCP servers are running
- Review server logs for tool execution errors

## Related Files

- `app/api/chat/stream/route.ts` - SSE streaming endpoint
- `lib/bedrock/client.ts` - Bedrock service
- `lib/bedrock/mcp-manager.ts` - MCP tool manager
- `components/shared/BedrockChatInterface.tsx` - UI component using this hook
