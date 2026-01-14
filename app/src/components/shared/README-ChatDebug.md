# Chat Debug Components

## Overview

This directory contains components for debugging chat operations during development.

## Components

### ChatDebugPanel
**File**: `ChatDebugPanel.tsx`

A comprehensive debug panel that displays real-time chat events, message history, API calls, and tool executions.

**Features**:
- Tabbed interface (Events, Messages, API, SSE, Tools, Errors)
- Expandable event details
- Connection status indicator
- Clear functionality
- Real-time updates

**Usage**:
```tsx
import { ChatDebugPanel } from '@/components/shared/ChatDebugPanel';

<ChatDebugPanel
  events={debugEvents}
  messages={messages}
  conversationId={conversationId}
  isConnected={isConnected}
  onClear={handleClear}
/>
```

### BedrockChatInterfaceWithDebug
**File**: `BedrockChatInterfaceWithDebug.tsx`

Enhanced version of BedrockChatInterface with integrated debug panel.

**Features**:
- Side-by-side layout (60/40 split)
- Automatic debug mode detection
- Zero overhead when disabled
- Full feature parity with BedrockChatInterface

**Usage**:
```tsx
import { BedrockChatInterfaceAuto } from '@/components/shared/BedrockChatInterfaceWithDebug';

<BedrockChatInterfaceAuto
  role="guest"
  onError={handleError}
/>
```

## Hooks

### useBedrockChatDebug
**File**: `hooks/use-bedrock-chat-debug.ts`

Extended version of useBedrockChat with debug event tracking.

**Features**:
- Captures all API calls
- Logs SSE events
- Tracks tool executions
- Records errors
- Zero overhead when disabled

**Usage**:
```tsx
import { useBedrockChatDebug } from '@/hooks/use-bedrock-chat-debug';

const {
  messages,
  sendMessage,
  debugEvents,
  conversationId,
  isConnected,
  clearMessages,
  clearDebugEvents,
} = useBedrockChatDebug();
```

## Enabling Debug Mode

Add to `.env.local`:
```bash
NEXT_PUBLIC_ENABLE_CHAT_DEBUG=true
```

Restart server:
```bash
bash scripts/dev-tools/server.sh restart
```

## Documentation

See [Chat Debug Panel Documentation](../../docs/CHAT_DEBUG_PANEL.md) for detailed information.

## Production Safety

Debug mode is automatically disabled in production when `NEXT_PUBLIC_ENABLE_CHAT_DEBUG` is false or omitted. There is zero performance overhead when disabled.

## Related Files

- `BedrockChatInterface.tsx` - Main chat interface
- `hooks/use-bedrock-chat.ts` - Main chat hook
- `hooks/use-bedrock-chat-debug.ts` - Debug-enabled hook
- `docs/CHAT_DEBUG_PANEL.md` - Full documentation
- `docs/CHAT_DEBUG_SETUP.md` - Setup guide
