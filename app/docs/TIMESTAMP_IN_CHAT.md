# Timestamp Integration in Chat System

## Overview

The chat system now includes timestamps at **two levels** to ensure the AI assistant has accurate temporal context:

1. **System Prompt Timestamp**: Included once when the conversation starts (provides baseline time context)
2. **Per-Message Timestamp**: Prepended to each user message (provides current time for each interaction)

This dual approach ensures the LLM has both initial context and up-to-date time information for every message in the conversation.

## Implementation

### 1. System Prompt Timestamp (Conversation-Level)

The initial timestamp is generated in the chat stream route and included in the system prompt:

```typescript
const now = new Date();
const currentDateTime = now.toLocaleString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZoneName: 'short',
});
```

This timestamp is interpolated into the system prompt template via the `{{currentDateTime}}` variable.

### 2. Per-Message Timestamp (Message-Level)

Each user message gets its own timestamp prepended to it:

```typescript
// Generate timestamp for this specific message
const messageTimestamp = new Date().toLocaleString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZoneName: 'short',
});

// Prepend timestamp to user message for temporal context
const messageWithTimestamp = `[Current time: ${messageTimestamp}]\n\n${sanitizedMessage}`;
```

**Example message sent to LLM:**
```
[Current time: Monday, January 19, 2026 at 10:45:30 PM PST]

What's the weather like today?
```

The timestamp is included in the `userContext` object that's passed to the prompt manager:

```typescript
const userContext = {
  userName: user?.name || 'User',
  userEmail: user?.email || '',
  userRole: role,
  roomNumber: user?.roomNumber || 'N/A',
  tools: toolsList,
  currentDateTime,  // ← Added timestamp
};

systemPrompt = await promptManager.getPromptWithVariables(role, userContext);
```

### 3. Prompt Template Updates

All role-specific prompt files have been updated to include the `{{currentDateTime}}` placeholder near the top:

- `app/config/prompts/guest.txt`
- `app/config/prompts/manager.txt`
- `app/config/prompts/housekeeping.txt`
- `app/config/prompts/maintenance.txt`

**Example:**
```
You are a helpful AI assistant for hotel guests at the Dewy Hotel.

CURRENT DATE AND TIME: {{currentDateTime}}

GUEST PROFILE:
- Name: {{userName}}
- Email: {{userEmail}}
- Room Number: {{roomNumber}}
```

## Benefits

1. **Dual-Level Temporal Awareness**: 
   - System prompt provides baseline time context
   - Per-message timestamps provide current time for each interaction
2. **Multi-Turn Accuracy**: Each message in a conversation has its own accurate timestamp
3. **Timezone Context**: Includes timezone information (e.g., PST, EST) for accurate time-based operations
4. **Consistent Format**: Uses a human-readable format that's easy for the LLM to parse
5. **Tool-Use Loop Awareness**: Even during multi-step tool executions, the original message timestamp is preserved

## Use Cases

The dual timestamp system enables the LLM to:

- Provide accurate time-based responses (e.g., "Good morning", "It's currently evening")
- Calculate time differences (e.g., "Your checkout is in 2 hours")
- Schedule future events with proper context
- Reference past events accurately
- Handle timezone-aware operations

## Example Conversation Flow

Here's how timestamps work in a multi-turn conversation:

**Turn 1 (10:30 AM):**
```
System Prompt: CURRENT DATE AND TIME: Monday, January 19, 2026 at 10:30:00 AM PST
User Message: [Current time: Monday, January 19, 2026 at 10:30:15 AM PST]

What time is checkout?
```

**Turn 2 (10:35 AM - same conversation):**
```
System Prompt: CURRENT DATE AND TIME: Monday, January 19, 2026 at 10:30:00 AM PST
User Message: [Current time: Monday, January 19, 2026 at 10:35:42 AM PST]

Can you extend my checkout by 2 hours?
```

Notice how:
- The system prompt timestamp stays the same (conversation start time)
- Each user message has its own current timestamp
- The LLM can see time progression within the conversation

## Testing

A comprehensive test script is available at:
```
app/scripts/tests/bedrock/test-timestamp-in-prompt.js
```

Run it with:
```bash
node app/scripts/tests/bedrock/test-timestamp-in-prompt.js
```

The test verifies:
- ✓ Timestamp generation works correctly
- ✓ All prompt files include the `{{currentDateTime}}` placeholder
- ✓ Variable interpolation includes the timestamp
- ✓ Route implementation includes timestamp generation

## Technical Details

### Timestamp Format Options

The timestamp uses the following `toLocaleString()` options:

| Option | Value | Purpose |
|--------|-------|---------|
| `weekday` | `'long'` | Full day name (e.g., "Monday") |
| `year` | `'numeric'` | 4-digit year (e.g., "2026") |
| `month` | `'long'` | Full month name (e.g., "January") |
| `day` | `'numeric'` | Day of month (e.g., "19") |
| `hour` | `'2-digit'` | 2-digit hour (e.g., "10") |
| `minute` | `'2-digit'` | 2-digit minute (e.g., "35") |
| `second` | `'2-digit'` | 2-digit second (e.g., "17") |
| `timeZoneName` | `'short'` | Abbreviated timezone (e.g., "PST") |

### Performance Impact

- **Minimal**: Timestamp generation is a lightweight operation
- **No caching issues**: Fresh timestamp for each request
- **No additional API calls**: Uses JavaScript's built-in Date API

## Future Enhancements

Potential improvements:

1. **Configurable timezone**: Allow users to specify their preferred timezone
2. **Locale support**: Support different date/time formats for international users
3. **Relative time**: Include relative time phrases (e.g., "morning", "afternoon", "evening")
4. **Business hours context**: Include whether the hotel is in business hours

## Related Files

- `app/src/app/api/chat/stream/route.ts` - Timestamp generation
- `app/src/lib/bedrock/prompt-manager.ts` - Variable interpolation
- `app/config/prompts/*.txt` - Prompt templates
- `app/scripts/tests/bedrock/test-timestamp-in-prompt.js` - Test script
