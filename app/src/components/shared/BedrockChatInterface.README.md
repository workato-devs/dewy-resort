# BedrockChatInterface Component

A reusable chat interface component for Amazon Bedrock streaming chat with role-based styling and features.

## Overview

The `BedrockChatInterface` component provides a complete chat UI for interacting with Amazon Bedrock LLMs. It supports multiple user roles (guest, manager, housekeeping, maintenance) with role-specific styling, system prompts, and MCP tool configurations.

## Features

- ✅ **Message list with auto-scroll** - Automatically scrolls to the latest message
- ✅ **Message input with send button** - Text area with keyboard shortcuts (Enter to send)
- ✅ **Typing indicator during streaming** - Shows animated indicator while AI is responding
- ✅ **Tool execution status indicators** - Displays status of MCP tool invocations
- ✅ **Error message display** - Shows clear error messages when issues occur
- ✅ **Clear conversation functionality** - Allows users to reset the conversation
- ✅ **Role-based styling** - Different colors and themes for each role
- ✅ **Accessibility support** - ARIA labels, keyboard navigation, screen reader support
- ✅ **Responsive design** - Works on desktop and mobile devices

## Requirements

Implements requirements: 1.1, 1.4, 2.1, 2.4, 10.1, 10.2, 10.3, 10.4, 10.5

## Usage

### Basic Usage

```tsx
import { BedrockChatInterface } from '@/components/shared/BedrockChatInterface';

export function ChatPage() {
  return <BedrockChatInterface role="guest" />;
}
```

### With Error Handling

```tsx
import { BedrockChatInterface } from '@/components/shared/BedrockChatInterface';

export function ChatPage() {
  const handleError = (error: Error) => {
    console.error('Chat error:', error);
    // Custom error handling
  };

  return (
    <BedrockChatInterface 
      role="manager" 
      onError={handleError}
    />
  );
}
```

### With Conversation ID

```tsx
import { BedrockChatInterface } from '@/components/shared/BedrockChatInterface';

export function ChatPage() {
  const conversationId = 'conv_123'; // From previous session

  return (
    <BedrockChatInterface 
      role="housekeeping"
      conversationId={conversationId}
    />
  );
}
```

### With Custom Styling

```tsx
import { BedrockChatInterface } from '@/components/shared/BedrockChatInterface';

export function ChatPage() {
  return (
    <BedrockChatInterface 
      role="maintenance"
      className="max-w-4xl mx-auto h-[800px]"
    />
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `role` | `'guest' \| 'manager' \| 'housekeeping' \| 'maintenance'` | Yes | User role for role-specific styling and behavior |
| `conversationId` | `string` | No | Existing conversation ID to continue a previous conversation |
| `className` | `string` | No | Additional CSS classes for the container |
| `onError` | `(error: Error) => void` | No | Custom error handler (defaults to toast notification) |

## Role Configuration

Each role has specific configuration:

### Guest
- **Icon**: 🤖
- **Title**: "Chat with Dewy"
- **Color**: Blue
- **Focus**: Service requests, room controls, billing

### Manager
- **Icon**: 💼
- **Title**: "Manager AI Assistant"
- **Color**: Indigo
- **Focus**: Operations, analytics, management tasks

### Housekeeping
- **Icon**: 🧹
- **Title**: "Housekeeping Assistant"
- **Color**: Green
- **Focus**: Cleaning tasks, room status, supplies

### Maintenance
- **Icon**: 🔧
- **Title**: "Maintenance Assistant"
- **Color**: Orange
- **Focus**: Work orders, equipment, repairs

## Features in Detail

### Auto-Scroll

The component automatically scrolls to the latest message when:
- A new message is added
- Streaming tokens are received
- The typing indicator appears

### Streaming Display

Messages are displayed in real-time as tokens arrive from the Bedrock API:
- Shows "Typing..." badge during streaming
- Displays partial content as it arrives
- Marks message as complete when streaming finishes

### Tool Execution Indicators

When the AI uses MCP tools, status indicators show:
- **Pending** (blue): Tool is executing
- **Complete** (green): Tool execution succeeded
- **Error** (red): Tool execution failed

### Error Handling

Errors are displayed inline in the chat:
- Connection errors
- API errors
- Tool execution errors
- Clear error messages for users

### Keyboard Shortcuts

- **Enter**: Send message
- **Shift + Enter**: New line in message

### Clear Conversation

Users can clear the conversation with a confirmation dialog:
- Removes all messages
- Resets conversation ID
- Clears any errors

## Accessibility

The component follows accessibility best practices:
- ARIA labels for all interactive elements
- Screen reader announcements for new messages
- Keyboard navigation support
- Focus management
- Semantic HTML structure

## Styling

The component uses Tailwind CSS and shadcn/ui components:
- Responsive design
- Dark mode support (via theme provider)
- Role-specific color schemes
- Smooth animations

## Dependencies

- `@/hooks/use-bedrock-chat` - Chat state management hook
- `@/components/ui/*` - shadcn/ui components
- `lucide-react` - Icons
- `@/lib/utils` - Utility functions

## Integration with useBedrockChat Hook

The component uses the `useBedrockChat` hook for all chat functionality:
- Message state management
- Streaming connection
- Tool execution tracking
- Error handling
- Conversation management

See `hooks/README-use-bedrock-chat.md` for hook documentation.

## Examples

See `BedrockChatInterface.example.tsx` for complete usage examples including:
- Basic usage for each role
- Custom error handling
- Full-page layouts
- Side-by-side layouts
- Conversation continuation

## Testing

The component can be tested by:
1. Ensuring AUTH_PROVIDER is set to "cognito"
2. Configuring COGNITO_IDENTITY_POOL_ID
3. Setting up role-specific MCP configurations
4. Testing with different user roles

## Future Enhancements

Potential improvements:
- Message search functionality
- Export conversation history
- Voice input support
- File attachment support
- Message reactions
- Conversation branching
