---
layout: default
title: Dewy Resort Demo
nav_order: 3
parent: Workshop Units
---

# Dewy Resort Demo

**Live Demonstration (15 minutes)**

---

## What You'll See

During this live demonstration, your facilitator will show the Dewy Resort application in action. Watch for these key concepts:

### Compositional MCP Tools in Action

Instead of calling many small API wrappers, you'll see how a single compositional tool handles entire workflows:

| Scenario | What Happens |
|----------|--------------|
| **Guest Check-In** | One tool call updates booking status, room status, and opportunity stage atomically |
| **Checkout + Maintenance** | Two intents in one message handled by independent tools |
| **Edge Case Handling** | Structured errors enable graceful recovery without hallucination |

### Key Takeaways to Watch For

- **Single tool calls** instead of 6+ API wrappers
- **Fast execution** (3-4 seconds vs 8-12 seconds)
- **Higher reliability** (~94% vs ~73% success rate)
- **Natural conversation** - no complex prompt engineering required
- **Observability** - every step traceable in Workato logs

---

## Demo Scenarios

Your facilitator will demonstrate three scenarios:

1. **Guest Check-In** - A guest arrives and checks in using their email
2. **Checkout with Maintenance Request** - A guest checks out while reporting an issue
3. **Edge Case** - Requesting service for a non-existent room

After each scenario, pay attention to how the LLM selects tools and how errors are handled gracefully.

---

<div class="facilitator-only" markdown="1">

## Facilitator Demo Script

### Pre-Demo Checklist

- [ ] Dewy Resort app running locally or on demo server
- [ ] Workato workspace open in separate tab
- [ ] Salesforce org open in separate tab
- [ ] Fresh test data (or reset seed data)

---

### Scenario 1: Guest Check-In (5 min)

**User Input:**
> "I'm Sarah Johnson, checking in. My email is sarah@example.com."

**Tool Called:** `check_in_guest`

**What to highlight:**
- Single tool call (not 6+ API wrappers)
- 3-second execution time
- Atomic state transitions:
  - Booking: Reserved -> Checked In
  - Room: Vacant -> Occupied
  - Opportunity: Confirmed -> Checked In

**Show in Workato:**
1. Open Job History
2. Find the `check_in_guest` execution
3. Expand to show:
   - Input parameters (guest_email)
   - Step 1: Search Contact (300ms)
   - Step 2: Search Booking (400ms)
   - Step 3: Validate Room (200ms)
   - Steps 4-6: Update operations (500ms each)
4. Highlight transaction-level tracing

**Show in Salesforce:**
1. Open the Contact record
2. Show Booking record status change
3. Show Room status change

---

### Scenario 2: Checkout with Maintenance Request (5 min)

**User Input:**
> "Beth Gibbs is checking out, and she mentioned the toilet in room 302 is broken."

**Tools Called:**
1. `process_guest_checkout`
2. `submit_maintenance_request`

**Contrast with Naive Approach (show slide or whiteboard):**

| Approach | Tool Calls | Latency | Success Rate |
|----------|------------|---------|--------------|
| Naive | 11+ | 8-12 sec | ~73% |
| Compositional | 2 | 3-4 sec | ~94% |

**What to highlight:**
- LLM correctly identified TWO intents in one message
- Each tool handled its workflow independently
- Maintenance request includes room context automatically
- No complex prompt engineering required

---

### Scenario 3: Edge Case Handling (3 min)

**User Input:**
> "I need extra towels in room 404."

*(Room 404 doesn't exist in the system)*

**Tool Called:** `submit_guest_service_request`

**Error Returned:** `404 - Room not found`

**LLM Response:**
> "I couldn't find room 404 in our system. Could you double-check the room number?"

**What to highlight:**
- Structured error codes enable graceful recovery
- LLM doesn't hallucinate or retry endlessly
- User gets actionable guidance
- Error logged for debugging

---

### Behind the Scenes: Observability (2 min)

**Show Logs:**
1. In Workato, navigate to Tools > Logs
2. Click on the most recent logs (displayed in descending order by default)
3. Show:
   - All three executions visible
   - Correlation IDs (idempotency tokens)
   - Input/output for each step
   - Execution duration breakdown

**Demonstrate Idempotency:**
1. Copy the idempotency token from a successful check-in
2. Attempt to re-run the same check-in
3. Show: Returns success without duplicate operations
4. Explain: "Safe to retry. No duplicate bookings."

---

### Q&A Transition

> "Any questions about what you just saw? We're about to take a break, and then you'll set up your own environment to build these patterns yourselves."

**Common questions to prepare for:**

1. "How does it know which tool to call?"
   - MCP tool descriptions guide selection
   - LLM reasoning in context window

2. "What if both tools fail?"
   - Each tool independent
   - Partial success is possible
   - Saga pattern for rollback (advanced topic)

3. "How do you test these tools before going live?"
   - Workato provides test mode for individual recipes
   - Use recipe versioning to iterate safely
   - MCP tools can be tested directly via API before connecting to an LLM
   - Mock payloads can be built into recipe designs for testing

</div>

---

## Transition to Break

> "We'll take a 15-minute break. When we come back, you'll set up your own environment - Salesforce metadata, Workato recipes, and the local application. Grab coffee, stretch, and we'll dive into hands-on work."

<div class="facilitator-only" markdown="1">

**Display on screen during break:**
- Wifi credentials
- Restroom locations
- Slack/Discord channel for questions
- "Back at [TIME]"

</div>
