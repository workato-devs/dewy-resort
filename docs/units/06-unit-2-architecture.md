---
layout: default
title: "Unit 2: Exploring the Architecture"
nav_order: 6
parent: Workshop Units
---

# Unit 2: Exploring the Architecture

**Guided Exploration (30 minutes)**

---

## Learning Objectives

- Navigate the recipe organization (atomic vs orchestrator)
- Trace a tool call from MCP config through Workato to Salesforce
- Understand the API Collection pattern
- Read recipe execution logs for debugging

---

## Part 1: Recipe Organization Tour (10 min)

### Explore the Repository Structure

Open your cloned repo and navigate:

```
workato/
+-- atomic-salesforce-recipes/   # 15 single-purpose operations
|   +-- search_contact_by_email.recipe.json
|   +-- search_room_by_number.recipe.json
|   +-- upsert_case.recipe.json
|   +-- ...
+-- atomic-stripe-recipes/       # 6 payment operations
|   +-- create_stripe_payment_intent.recipe.json
|   +-- ...
+-- orchestrator-recipes/        # 12 composed workflows
    +-- check_in_guest.recipe.json
    +-- process_guest_checkout.recipe.json
    +-- ...
```

### Discussion Questions

**At your table, discuss:**

1. Why separate atomic from orchestrator recipes?
2. What makes something "atomic"?
3. How might orchestrators compose atomics?

<div class="facilitator-only" markdown="1">

### Answers to Guide Discussion

| Question | Key Points |
|----------|------------|
| Why separate? | Reusability, testing, clear boundaries |
| What's atomic? | Single operation, one API call, no business logic |
| How compose? | Orchestrator calls atomic recipes via API endpoints |

</div>

---

## Part 2: Trace a Tool Call (10 min)

### Exercise: Follow `check_in_guest` End-to-End

**Step 1: MCP Configuration**

Open: `config/mcp/manager/mcp-config.json`

Find the `check_in_guest` tool definition:

```json
{
  "name": "check_in_guest",
  "description": "Check in a guest with existing reservation...",
  "inputSchema": {
    "properties": {
      "guest_email": { "type": "string" },
      "check_in_date": { "type": "string" }
    }
  }
}
```

**Note:** Parameters match what users naturally provide (email, date) - not system IDs.

---

**Step 2: API Collection (Workato UI)**

1. Open Workato
2. Navigate to **Tools -> API Platform -> API Collections**
3. Find the collection backing MCP tools
4. Locate the `/check_in_guest` endpoint
5. Note the endpoint path: `/[workspace]/check-in-guest`

**Note:** This is the HTTP endpoint the MCP client calls.

---

**Step 3: Orchestrator Recipe**

Open in Workato UI: **Projects -> orchestrator-recipes -> check_in_guest**

Trace the flow:

```
+---------------------------------------------+
| Trigger: API Platform request               |
| Input: guest_email, check_in_date           |
+---------------------------------------------+
                    |
                    v
+---------------------------------------------+
| Step 1: Search Contact by Email (atomic)    |
| Returns: contact_id or 404 error            |
+---------------------------------------------+
                    |
                    v
+---------------------------------------------+
| Step 2: Search Booking (atomic)             |
| Filter: contact_id + status=Reserved + date |
| Returns: booking_id, room_id or 404/409     |
+---------------------------------------------+
                    |
                    v
+---------------------------------------------+
| Step 3: Validate Room Status                |
| Check: Room.Status__c == 'Vacant'           |
| Error if: Room occupied -> 409              |
+---------------------------------------------+
                    |
                    v
+---------------------------------------------+
| Steps 4-6: State Transitions (atomic)       |
| - Update Booking -> Checked In              |
| - Update Room -> Occupied                   |
| - Update Opportunity -> Checked In          |
+---------------------------------------------+
                    |
                    v
+---------------------------------------------+
| Return: success, booking_id, room_number    |
+---------------------------------------------+
```

**Key observations:**
- Error handling at each step with specific codes (404, 409)
- Conditional logic for validation
- All state transitions happen only if validation passes

---

**Step 4: Execution Log**

1. Use the app to trigger a check-in:
   - "Check in Sarah Johnson, email sarah@example.com"
2. Open Workato -> **Tools -> Logs**
3. Find the recent `check_in_guest` execution
4. Expand to examine:
   - Input parameters received
   - Each step's duration
   - Output at each step
   - Final response

**What to notice:**
- Total execution time (~4 seconds)
- Where time is spent (Salesforce API calls)
- Transaction-level traceability

---

## Part 3: Pattern Recognition (10 min)

### Compare Approaches

| Metric | Naive (API Wrapper) | Compositional |
|--------|---------------------|---------------|
| Tool count | 47 | 12 |
| Calls per checkout | 8-12 | 2 |
| Average latency | Higher (multiple LLM round-trips) | 4-7 seconds |
| Complexity location | LLM context | Backend recipes |
| Error handling | Per-call in prompt | Centralized in recipe |
| Retry safety | Must engineer at each step | Platform retry + declarative idempotency |

### Discussion Questions

**In pairs or small groups:**

1. What patterns do you see in the orchestrator design?
   - *Look for: validation-first, atomic composition, structured errors*

2. How does the backend handle ID resolution?
   - *Look for: email -> contact_id, room_number -> room_id*

3. Where is authorization enforced?
   - *Look for: "on_behalf_of" patterns, contact type validation*

<div class="facilitator-only" markdown="1">

### Key Patterns to Highlight

| Pattern | Implementation |
|---------|----------------|
| Business identifiers | `guest_email` not `contact_id` |
| Validation first | Check prerequisites before mutations |
| Atomic composition | Orchestrator calls atomic recipes |
| Structured errors | 404, 409 with clear messages |
| Idempotency | External_ID__c fields |

</div>

---

## Bonus Activity (For Fast Learners)

If you finish early, try these explorations:

### Trigger Different Error Conditions

Use the chat interface to intentionally cause errors. Can you trigger:
- A 404 (resource not found)?
- A 409 (conflict/invalid state)?
- A validation error?

After each error, check the logs in **Tools -> Logs** to see how the error was structured and returned.

**Example prompts to try:**
- "Check in a guest who doesn't exist"
- "Check in someone who's already checked in"
- "Request service for room 999"

### Test LLM Coaching Behavior

Try starting a service request without providing all required information:
- "I need help with my room"
- "Something is broken"
- "Can you send someone?"

Observe: How does the LLM prompt you for the missing details (room number, description, priority)? How many turns does it take to gather everything needed to invoke the tool?

---

## Transition to Break

> "You've now seen how the architecture works from MCP config to Salesforce. After a 15-minute break, you'll build your own atomic skill and orchestrator from scratch."

<div class="facilitator-only" markdown="1">

**Display during break:**
- Time to return
- Reminder: Keep Workato and Salesforce tabs open

</div>
