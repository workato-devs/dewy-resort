# Timestamp Integration - Example Flow

This document shows a real example of how timestamps work in the chat system.

## Scenario: Guest Requesting Late Checkout

### Initial Request (10:30:15 AM)

**System Prompt (sent once at conversation start):**
```
You are a helpful AI assistant for hotel guests at the Dewy Hotel.

CURRENT DATE AND TIME: Monday, January 19, 2026 at 10:30:00 AM PST

GUEST PROFILE:
- Name: Sarah Johnson
- Email: sarah.j@example.com
- Room Number: 305

Your role is to:
1. Answer questions about hotel amenities, services, and policies
...
```

**User Message (with prepended timestamp):**
```
[Current time: Monday, January 19, 2026 at 10:30:15 AM PST]

What time is checkout today?
```

**Assistant Response:**
```
Hi Sarah! Standard checkout time at the Dewy Hotel is 11:00 AM. 
Since it's currently 10:30 AM, you have about 30 minutes until checkout.

Would you like to request a late checkout?
```

---

### Follow-up Request (10:45:30 AM - same conversation)

**System Prompt:** *(same as above, not regenerated)*

**User Message (with NEW timestamp):**
```
[Current time: Monday, January 19, 2026 at 10:45:30 AM PST]

Yes, can I extend checkout by 2 hours?
```

**Assistant Response:**
```
I can help you with that! Let me check availability for a late checkout 
until 1:00 PM (2 hours from the standard 11:00 AM checkout).

[Tool use: check_late_checkout_availability]
[Tool result: Available, $50 fee]

Good news! Late checkout until 1:00 PM is available for room 305. 
There's a $50 fee for the extension. Since it's now 10:45 AM, this 
would give you an additional 2 hours and 15 minutes.

Would you like me to proceed with booking the late checkout?
```

---

### Confirmation (10:46:05 AM - same conversation)

**System Prompt:** *(same as above, not regenerated)*

**User Message (with NEW timestamp):**
```
[Current time: Monday, January 19, 2026 at 10:46:05 AM PST]

Yes please, book it.
```

**Assistant Response:**
```
Perfect! I've booked your late checkout.

[Tool use: book_late_checkout]
[Tool result: Success, confirmation #LC-305-012026]

✓ Late checkout confirmed for room 305
✓ New checkout time: 1:00 PM today (Monday, January 19, 2026)
✓ Fee: $50 (will be added to your final bill)
✓ Confirmation: LC-305-012026

You now have until 1:00 PM to check out. That's about 2 hours and 
14 minutes from now. Enjoy your extra time!
```

---

## Key Observations

### 1. Time Progression Awareness
The LLM can see time passing:
- First message: 10:30:15 AM
- Second message: 10:45:30 AM (15 minutes later)
- Third message: 10:46:05 AM (35 seconds later)

### 2. Accurate Time Calculations
The LLM provides accurate time-based information:
- "you have about 30 minutes until checkout" (at 10:30 AM)
- "give you an additional 2 hours and 15 minutes" (at 10:45 AM)
- "about 2 hours and 14 minutes from now" (at 10:46 AM)

### 3. Context Preservation
The system prompt timestamp (10:30:00 AM) provides the conversation start time, while per-message timestamps show the current time for each interaction.

### 4. Tool Execution Context
Even when tools are executed (which may take several seconds), the LLM knows the original message timestamp and can provide accurate time references.

---

## Technical Flow

```
┌─────────────────────────────────────────────────────────────┐
│ User sends message at 10:30:15 AM                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Server generates timestamp: "Monday, Jan 19, 2026 10:30:15" │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Prepend to message: "[Current time: ...]\\n\\nWhat time..."   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Load system prompt with conversation start time (10:30:00)  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Send to Bedrock:                                            │
│ - System prompt (with 10:30:00 timestamp)                   │
│ - Conversation history                                      │
│ - Current message (with 10:30:15 timestamp)                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ LLM processes with full temporal context                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Benefits in This Example

1. **Accurate Urgency Assessment**: The LLM knows checkout is in 30 minutes (urgent)
2. **Time-Based Calculations**: Can calculate "2 hours and 15 minutes" accurately
3. **Temporal Consistency**: Maintains awareness of time passing between messages
4. **Natural Language**: Can use phrases like "from now", "until", "about X minutes"
5. **Tool Context**: Tools executed at 10:45 AM have the correct time context

---

## Edge Cases Handled

### Long Tool Execution
```
User message: [Current time: 10:30:00 AM] "Book a spa appointment"
Tool execution takes 5 seconds...
LLM response: "I've booked your spa appointment for 2:00 PM today"
```
The LLM uses 10:30:00 AM as the reference time, not 10:30:05 AM.

### Multi-Tool Workflow
```
User message: [Current time: 10:30:00 AM] "Check me out and book a taxi"
Tool 1: process_checkout (2 seconds)
Tool 2: book_taxi (3 seconds)
LLM response: "Checkout complete and taxi booked for 10:45 AM"
```
All tools use the same message timestamp (10:30:00 AM) for consistency.

### Timezone Awareness
```
User message: [Current time: Monday, Jan 19, 2026 at 10:30:00 AM PST]
LLM knows: It's morning in PST timezone
LLM can: Convert to other timezones if needed
```
