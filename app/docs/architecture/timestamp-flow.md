# Timestamp Flow Architecture

## Overview

This diagram shows how timestamps flow through the chat system at both the conversation and message levels.

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER SENDS MESSAGE                           │
│                 "What time is checkout?"                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              POST /api/chat/stream                              │
│                                                                 │
│  1. Validate session & get user info                           │
│  2. Sanitize message                                            │
│  3. Generate MESSAGE timestamp ──────────────┐                 │
│     → "Monday, Jan 19, 2026 at 10:30:15 AM PST"                │
│                                               │                 │
│  4. Prepend to message: ◄────────────────────┘                 │
│     "[Current time: Monday, Jan 19, 2026 at 10:30:15 AM PST]   │
│                                                                 │
│      What time is checkout?"                                    │
│                                                                 │
│  5. Add to conversation history                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              LOAD SYSTEM PROMPT                                 │
│                                                                 │
│  1. Generate CONVERSATION timestamp ─────────┐                 │
│     → "Monday, Jan 19, 2026 at 10:30:00 AM PST"                │
│                                               │                 │
│  2. Create userContext: ◄────────────────────┘                 │
│     {                                                           │
│       userName: "Sarah Johnson",                                │
│       userEmail: "sarah.j@example.com",                         │
│       roomNumber: "305",                                        │
│       tools: "create_service_request, ...",                     │
│       currentDateTime: "Monday, Jan 19, 2026 at 10:30:00 AM PST"│
│     }                                                           │
│                                                                 │
│  3. Interpolate into prompt template:                           │
│     "You are a helpful AI assistant...                          │
│      CURRENT DATE AND TIME: {{currentDateTime}}                 │
│      GUEST PROFILE: ..."                                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              SEND TO BEDROCK                                    │
│                                                                 │
│  System Prompt:                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ You are a helpful AI assistant for hotel guests...        │ │
│  │                                                            │ │
│  │ CURRENT DATE AND TIME: Monday, Jan 19, 2026 at 10:30:00 AM│ │
│  │                                                            │ │
│  │ GUEST PROFILE:                                             │ │
│  │ - Name: Sarah Johnson                                      │ │
│  │ - Email: sarah.j@example.com                               │ │
│  │ - Room Number: 305                                         │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Conversation History:                                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ [Previous messages if any...]                              │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Current Message:                                               │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ [Current time: Monday, Jan 19, 2026 at 10:30:15 AM PST]   │ │
│  │                                                            │ │
│  │ What time is checkout?                                     │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              LLM PROCESSING                                     │
│                                                                 │
│  LLM sees:                                                      │
│  • Conversation started at: 10:30:00 AM                         │
│  • Current message sent at: 10:30:15 AM                         │
│  • Time difference: 15 seconds                                  │
│                                                                 │
│  LLM can:                                                       │
│  • Calculate time until checkout (11:00 AM)                     │
│  • Provide accurate "from now" references                       │
│  • Track time progression in conversation                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              RESPONSE STREAMING                                 │
│                                                                 │
│  "Hi Sarah! Standard checkout time is 11:00 AM.                 │
│   Since it's currently 10:30 AM, you have about                 │
│   30 minutes until checkout."                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Multi-Turn Conversation Example

```
┌─────────────────────────────────────────────────────────────────┐
│                    TURN 1 (10:30:15 AM)                         │
└─────────────────────────────────────────────────────────────────┘

System Prompt Timestamp: 10:30:00 AM ◄─── Generated once
Message Timestamp: 10:30:15 AM       ◄─── Fresh for this message

User: "[Current time: 10:30:15 AM] What time is checkout?"
Assistant: "Checkout is at 11:00 AM. You have about 30 minutes."

┌─────────────────────────────────────────────────────────────────┐
│                    TURN 2 (10:45:30 AM)                         │
└─────────────────────────────────────────────────────────────────┘

System Prompt Timestamp: 10:30:00 AM ◄─── Same (not regenerated)
Message Timestamp: 10:45:30 AM       ◄─── NEW timestamp!

User: "[Current time: 10:45:30 AM] Can I extend by 2 hours?"
Assistant: "Yes! That would be until 1:00 PM. Since it's now 10:45 AM,
           you'd have 2 hours and 15 minutes."

┌─────────────────────────────────────────────────────────────────┐
│                    TURN 3 (10:46:05 AM)                         │
└─────────────────────────────────────────────────────────────────┘

System Prompt Timestamp: 10:30:00 AM ◄─── Same (not regenerated)
Message Timestamp: 10:46:05 AM       ◄─── NEW timestamp!

User: "[Current time: 10:46:05 AM] Yes please, book it."
Assistant: "Done! Late checkout confirmed until 1:00 PM.
           That's about 2 hours and 14 minutes from now."
```

## Key Points

### 1. Two Timestamp Levels

**System Prompt Level (Static per conversation)**
- Generated once when conversation starts
- Provides baseline temporal context
- Shows conversation start time

**Message Level (Dynamic per message)**
- Generated fresh for each user message
- Prepended to message content
- Shows current time for that specific message

### 2. Time Progression Tracking

The LLM can see:
- When the conversation started (system prompt)
- When each message was sent (per-message timestamp)
- Time elapsed between messages
- Current time for calculations

### 3. Accurate Time Calculations

With both timestamps, the LLM can:
- Calculate "from now" accurately
- Track urgency (e.g., "only 30 minutes left")
- Adjust responses based on time progression
- Provide time-aware recommendations

### 4. Tool Execution Context

When tools are executed:
```
Message at 10:30:00 AM: "Book a spa appointment"
  ↓
Tool execution (takes 5 seconds)
  ↓
LLM uses 10:30:00 AM as reference time (not 10:30:05 AM)
```

This ensures consistency even when tools take time to execute.

## Implementation Details

### Timestamp Format

Both timestamps use the same format:
```javascript
new Date().toLocaleString('en-US', {
  weekday: 'long',      // "Monday"
  year: 'numeric',      // "2026"
  month: 'long',        // "January"
  day: 'numeric',       // "19"
  hour: '2-digit',      // "10"
  minute: '2-digit',    // "30"
  second: '2-digit',    // "15"
  timeZoneName: 'short' // "PST"
});
```

Output: `Monday, January 19, 2026 at 10:30:15 AM PST`

### Why This Format?

1. **Human-readable**: Easy for LLM to parse and understand
2. **Complete**: Includes all temporal information
3. **Timezone-aware**: Includes timezone abbreviation
4. **Consistent**: Same format for both levels
5. **Unambiguous**: Full date prevents confusion

## Benefits

✓ **Temporal Awareness**: LLM knows both start time and current time
✓ **Time Progression**: Can track time passing in conversation
✓ **Accurate Calculations**: Precise time-based responses
✓ **Timezone Context**: Handles timezone-aware operations
✓ **Tool Context**: Tools have accurate timestamp reference
✓ **Multi-Turn Support**: Each message has its own timestamp
