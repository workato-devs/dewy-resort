---
layout: default
title: "Unit 2: Observability & Monitoring"
nav_order: 6
parent: Workshop Units
---

# Unit 2: Observability & Monitoring

**Hands-On Session (30 minutes)**

---

## Learning Objectives

- Understand how Workato recipes are organized (atomic skills vs orchestrators)
- Exercise MCP tools through natural language and observe invocations in the debug panel
- Trace a tool call end-to-end in Workato: recipe → job → execution steps → payloads
- Use Workato's execution logs to diagnose issues and understand data flow

---

## Part 1: Understand the Recipe Architecture (10 min)

Before diving into the tools, take a guided tour of how they're built. This will make the logs much easier to read.

### 1.1 Open Your Workato Workspace

1. Log in to Workato: [app.trial.workato.com](https://app.trial.workato.com)
2. Navigate to **Projects**

You'll see the folder structure that `make push` created:

```
├── atomic-salesforce-recipes/   # Single-purpose Salesforce operations
├── atomic-stripe-recipes/       # Single-purpose payment operations
├── orchestrator-recipes/        # Composed workflows (exposed as MCP tools)
└── sf-api-collection/           # Salesforce API collection recipes
```

### 1.2 Atomic Recipes — The Building Blocks

Open the **atomic-salesforce-recipes** folder and click on any recipe (e.g., `search_contact_by_email`).

Key things to notice:
- **One operation** — each atomic recipe does exactly one thing (a single Salesforce query or update)
- **API trigger** — it starts with an API request, meaning it's callable from other recipes or external systems
- **Structured input/output** — well-defined request and response schemas

These are the LEGO bricks. They don't encode business logic — they just read or write one thing.

### 1.3 Orchestrator Recipes — The Workflows

Go back to **Projects** and open the **orchestrator-recipes** folder. Click on `check_in_guest`.

This is what an MCP tool actually calls. Walk through the recipe steps:

1. **Validate prerequisites** — Does the guest exist? Is there a reservation? Is the room vacant?
2. **Execute atomic recipes** — Calls multiple atomics to read/write Salesforce objects
3. **State transitions** — Updates Booking, Room, and Opportunity in the correct dependency order
4. **Return result** — Structured response back to the MCP tool caller

**Key concept:** When the LLM calls `check_in_guest` via MCP, it hits this orchestrator. The orchestrator calls atomics. The atomics call Salesforce. Every step is logged.

### 1.4 How MCP Tools Map to Recipes

| What the LLM sees | What Workato runs | What Salesforce does |
|--------------------|-------------------|---------------------|
| `Check_in_guest` tool | `check_in_guest` orchestrator | 3 reads + 3 updates across Booking, Room, Opportunity |
| `Search_rooms_on_behalf_of_staff` tool | `search_rooms_on_behalf_of_staff` orchestrator | SOQL query against Hotel_Room__c |
| `Submit_maintenance_request` tool | `submit_maintenance_request` orchestrator | Validates contact, creates Case |

Each MCP tool = one orchestrator recipe = multiple atomic operations = multiple Salesforce API calls. The logs capture every layer.

---

## Part 2: Exercise the Tools (10 min)

Now put the architecture into action. Log in to the hotel app as **Manager** and open the **Chat** interface with the debug panel visible.

### 2.1 Create a Booking

Use natural, vague language — the LLM should fill in gaps by asking follow-up questions or using context:

```
I need to book a room for a guest arriving next Monday
```

Watch the debug panel as the LLM:
- Asks for missing information (guest name, email, room preference, checkout date)
- Calls `Create_booking_orchestrator` with the gathered inputs
- Returns a confirmation with booking details

### 2.2 Check In a Guest

Use an existing booking from the seed data or the one you just created:

```
Check in the guest in room 101
```

Watch for:
- The tool call to `Check_in_guest`
- Input parameters (guest email, room number)
- The response showing state transitions (Booking → Checked In, Room → Occupied)

### 2.3 Submit a Service Request

```
The guest in room 101 is requesting extra pillows
```

Notice how the LLM resolves which tool to use and gathers the required fields before calling it.

### 2.4 Check Out a Guest

```
Process checkout for the guest in room 101
```

If Stripe is configured, watch for the payment processing step in the debug panel. If not, observe the error handling — the LLM should communicate the issue clearly.

**CHECKPOINT:** You've exercised multiple tools and can see each invocation in the debug panel

---

## Part 3: Trace Invocations in Workato (10 min)

Now follow one of those tool calls from the Workato side to see the full execution trace.

### 3.1 Find Your Recipe

1. In Workato, navigate to **orchestrator-recipes**
2. Click on the recipe that matches one of your recent tool calls (e.g., `check_in_guest`)

### 3.2 Open a Job

1. Click the **Jobs** tab
2. You should see recent executions — each one corresponds to a tool call from your chat session
3. Click on the most recent job

### 3.3 Read the Execution Log

Each job shows a step-by-step execution trace:

- **Trigger** — The API request from the MCP server, including the full input payload
- **Action steps** — Each atomic recipe call, with its own input and output
- **Conditionals** — Validation checks (did the guest exist? was the room vacant?)
- **Response** — The final payload returned to the MCP tool caller

Click on any step to expand it and see:
- **Input** — What was passed to this step
- **Output** — What it returned
- **Duration** — How long this step took

### 3.4 Trace an Atomic Call

From within the orchestrator job, click on one of the atomic recipe calls (e.g., "Search Contact by Email"). This opens the atomic recipe's own job, showing:

- The exact SOQL query or DML operation sent to Salesforce
- The Salesforce response
- Timing for the Salesforce API call

This is the full chain: **Chat → MCP → Orchestrator → Atomic → Salesforce → back up the stack**.

### 3.5 Trigger an Error

Go back to the chat and intentionally cause a failure:

```
Check in guest with email nonexistent@example.com
```

Then find the failed job in Workato:
1. The job will show a **failed** status
2. Expand the failing step to see the error code and message
3. Notice how the orchestrator returns a structured error (e.g., `404: guest not found`) rather than crashing

This is how you'd diagnose production issues — the logs capture every input, output, and failure at every layer.

**CHECKPOINT:** Traced a tool call end-to-end in Workato, including a failure case

### 3.6 (Optional) Verify in Salesforce

See the results of your tool calls in Salesforce itself:

1. Open your Salesforce org (`sf org open --target-org myDevOrg`)
2. Use **Global Search** to find the guest contact you created (search by email)
3. On the Contact record, scroll to the **Opportunities** related list
4. Click into an Opportunity — the **Booking** record is linked here

> **Tip:** Start from the Contact record and explore the related lists — bookings are easiest to find from there.

---

## What You Learned

- **Recipe organization**: Atomic recipes handle single operations; orchestrators compose them into validated workflows
- **MCP tool mapping**: Each tool the LLM calls maps to one orchestrator, which calls multiple atomics
- **Debug panel**: Client-side visibility into what the LLM is doing and what tools it invokes
- **Workato execution logs**: Server-side visibility into every step, payload, and timing of each invocation
- **Error tracing**: Failed jobs capture the exact step, error code, and context for diagnosis

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No jobs appearing in recipe | Verify the recipe is running (green status); check that MCP server URLs in `app/.env` match |
| Job shows "Connection error" | Re-authenticate the Salesforce connection in Workspace Connections |
| Can't expand job steps | Click the step name, not the status icon |
| Debug panel not updating | Hard refresh the browser (Cmd+Shift+R / Ctrl+Shift+R) |
| Tool call succeeds but no Workato job | The call may have hit a different recipe — check the tool name in the debug panel |

---

<div class="facilitator-only" markdown="1">

## Facilitator Notes

**Before this unit:**
- Verify your own Workato workspace has recent jobs visible (run a few chat interactions beforehand)
- Have a job pre-loaded on your screen to walk through if attendees need a guided example

**Pacing guidance:**
- Part 1 works best as a facilitator-led walkthrough — open the recipes on your shared screen while attendees follow along in their own workspaces
- Parts 2 and 3 are self-paced. Circulate and help attendees find their first job in Workato — that's the main sticking point

**Common issues:**
- Attendees looking in the wrong folder for recipes (atomic vs orchestrator)
- Jobs tab empty because recipe was restarted recently — previous jobs are cleared on restart
- Confusion between the recipe detail view and the job detail view

**If an attendee's Workato has no jobs:**
- Have them trigger a fresh tool call from chat, then immediately check the Jobs tab
- If still empty, verify the recipe status is "Running" and the MCP URLs are correct

</div>
