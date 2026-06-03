---
layout: default
title: "Unit 3: Build Challenge"
nav_order: 7
parent: Workshop Units
---

# Unit 3: Build Challenge

**Hands-On Challenge (25 minutes)**

---

## The Goal

Design and build a new orchestrator recipe, deploy it, and invoke it from chat. You've seen how the existing tools work end-to-end — now build one yourself.

---

## Choose Your Challenge

| Challenge | Difficulty | Systems | Choose If... |
|-----------|------------|---------|--------------|
| **Option A: Extended Stay** | Standard | Salesforce only | You don't have Stripe connected |
| **Option B: Room Upgrade** | Advanced | Salesforce + Stripe | You have Stripe connected and want a cross-system challenge |

---

## Choose How to Build

You have two paths to build your recipe:

### Path 1: Build with a Coding Agent

If you have access to a coding agent (Claude Code, Cursor, GitHub Copilot, etc.), you can install additional tools that give your agent the knowledge to write Workato recipes:

1. **Install Recipe Skills** — an agent-consumable knowledge base covering connector configuration, datapill syntax, control flow, and error handling:
   ```bash
   git clone https://github.com/workato-devs/recipe-skills.git
   ```

2. **Install the Recipe Linter** — catches datapill syntax errors, schema mismatches, and structural issues:

   macOS/Linux:
   ```bash
   brew install workato-devs/tap/recipe-lint
   wk plugins install recipe-lint
   ```

   Windows:
   ```powershell
   scoop install recipe-lint
   ```

   Then register the plugin with `wk`. Due to a known issue with Scoop's symlinked `current` directory on Windows, you must use the real versioned path:

   ```powershell
   # Navigate to the real install path (not the 'current' junction)
   Push-Location "$env:USERPROFILE\scoop\apps\recipe-lint\1.0.6-beta"
   wk plugins install .
   Pop-Location
   ```

   > **Tip:** If you have a different version, list the directory to find it: `ls $env:USERPROFILE\scoop\apps\recipe-lint\`

   Verify: `wk plugins list` should show `recipe-lint`.

3. **(Optional) Install the Recipe Visualizer** — VS Code/Cursor/Windsurf extension that renders recipe JSON as interactive workflow graphs. Download the `.vsix` from the [Workato Labs page](https://workato-devs.github.io/labs/) and install via your IDE.

Your workflow: **Agent writes recipe JSON → Linter validates → `make push` deploys → Test from chat**

> For full setup details and documentation, see [workato-devs.github.io/labs](https://workato-devs.github.io/labs/)

### Path 2: Build in the Workato UI

1. Navigate to **Projects → orchestrator-recipes** in Workato
2. Click **Create Recipe**
3. Use the visual recipe editor to build your orchestrator step by step
4. Start the recipe when you're ready to test

Both paths end the same way: invoke your new tool from the hotel app chat and trace the execution in Workato.

---

## Challenge Rules

| Rule | Details |
|------|---------|
| **Time** | 20 minutes to build + test |
| **Teams** | Individual or pairs |
| **Goal** | Working orchestrator, invocable from chat |
| **Stretch** | Trace your tool call end-to-end in Workato logs |

---

# Option A: Extended Stay

## The Scenario

A guest currently checked in wants to **extend their stay** by a few more nights. The front desk needs to verify availability and update the reservation.

**Build an `extend_stay` orchestrator.**

---

## Available Atomic Skills

| Atomic Skill | Purpose | Returns |
|--------------|---------|---------|
| `search_contact_by_email` | Find guest contact | id, found |
| `search_booking_by_contact_and_date` | Find current booking | booking_id, room_id, check_out_date |
| `search_bookings_by_room_and_dates` | Check availability for new dates | bookings[] or empty |
| `upsert_booking` | Update reservation | booking_id |
| `update_opportunity_stage` | Update revenue tracking | opportunity_id |

---

## Requirements

### Input Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `guest_email` | Yes | Guest's email address |
| `new_checkout_date` | Yes | New departure date (ISO format) |
| `idempotency_token` | Yes | UUID for retry safety |

### Success Criteria

Your solution must:

1. Find the guest's current active booking
2. Check room availability for the extended dates
3. Update the booking with the new checkout date
4. Handle "room unavailable for extension" gracefully
5. Be idempotent (safe to retry)

### Response Codes

| HTTP Status | Condition | error_code |
|-------------|-----------|------------|
| 200 | Success | (none) |
| 404 | Guest not found | `GUEST_NOT_FOUND` |
| 404 | No active booking | `NO_ACTIVE_BOOKING` |
| 409 | Room not available for extended dates | `EXTENSION_NOT_AVAILABLE` |

---

# Option B: Room Upgrade

## The Scenario

A guest wants to **upgrade to a better room** and is willing to pay the price difference. This requires checking availability, processing an additional payment, and updating the reservation.

**Build an `upgrade_room` orchestrator that coordinates Salesforce and Stripe.**

---

## Available Atomic Skills

**Salesforce:**

| Atomic Skill | Purpose | Returns |
|--------------|---------|---------|
| `search_contact_by_email` | Find guest contact | id, found |
| `search_booking_by_contact_and_date` | Find current booking | booking_id, room_id, room_number, opportunity_id |
| `search_room_by_number` | Find target room | id, status, nightly_rate |
| `update_room_status` | Update room availability | room_id, updated |
| `upsert_booking` | Update reservation | booking_id |

**Stripe:**

| Atomic Skill | Purpose | Returns |
|--------------|---------|---------|
| `create_stripe_payment_intent` | Charge price difference | payment_intent_id |
| `confirm_stripe_payment` | Confirm the charge | status, confirmed |

---

## Requirements

### Input Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `guest_email` | Yes | Guest's email address |
| `new_room_number` | Yes | Target room for upgrade |
| `payment_method_id` | Yes | Stripe payment method token |
| `idempotency_token` | Yes | UUID for retry safety |

### Success Criteria

Your solution must:

1. Find the guest's current active booking
2. Validate the target room is available
3. Calculate the price difference (remaining nights x rate difference)
4. Process the additional payment via Stripe
5. Update room statuses (old room → Dirty, new room → Occupied)
6. Update the booking with the new room
7. Handle payment failures gracefully
8. Be idempotent (safe to retry)

### Response Codes

| HTTP Status | Condition | error_code |
|-------------|-----------|------------|
| 200 | Success | (none) |
| 404 | Guest not found | `GUEST_NOT_FOUND` |
| 404 | No active booking | `NO_ACTIVE_BOOKING` |
| 404 | Target room not found | `ROOM_NOT_FOUND` |
| 409 | Target room not available | `ROOM_NOT_AVAILABLE` |
| 402 | Payment failed | `PAYMENT_FAILED` |

---

## Deploy and Test

Once your recipe is built:

1. **Deploy:**
   - Coding agent path: `wk lint` to validate, then `make push` to deploy
   - Workato UI path: Save and start the recipe

2. **Add to an API Collection:**
   - In Workato, go to **Platform → API Platform → API Collections**
   - Open the `dewy-resort-manager` collection
   - Add your new recipe as an endpoint (Method: POST)
   - Write a description that tells the LLM when and how to use your tool
   - Enable the endpoint

3. **Test from chat:**
   - Open the hotel app as Manager
   - Ask the agent to perform the action your tool handles
   - Watch the debug panel for your tool invocation
   - Check Workato logs to trace the execution

---

## Hints

<details>
<summary>Hint 1: Order of Operations</summary>

Think about dependencies:
- What must you validate before making any changes?
- For Option B: What happens if payment fails after you've already updated the room?
- Validate first, mutate last

</details>

<details>
<summary>Hint 2: Checking Extended Dates (Option A)</summary>

You need to check availability between:
- Current checkout date (from existing booking)
- New checkout date (from input)

The current booking already covers up to the original checkout date.

</details>

<details>
<summary>Hint 3: Calculating Price Difference (Option B)</summary>

Price difference = (new_room_rate - old_room_rate) x remaining_nights

You'll need:
- Current room's nightly rate (from booking or room lookup)
- New room's nightly rate (from room lookup)
- Remaining nights (checkout_date - today)

</details>

<details>
<summary>Hint 4: Idempotency Pattern</summary>

Use the `idempotency_token` in multiple places:
- As `external_id` in upsert_booking
- As `Idempotency-Key` header in Stripe calls (Option B)

</details>

---

<div class="facilitator-only" markdown="1">

## Facilitator Notes

**Pacing:** 20 minutes for building, 5 minutes for demo/discussion. If teams finish early, encourage them to trace their tool call in Workato logs or test edge cases (invalid email, unavailable room).

**Coding agent path:** Attendees using coding agents may finish significantly faster. Encourage them to tackle Option B or refine their error handling and tool description.

**If attendees get stuck on recipe-skills setup:** The repo README has step-by-step instructions for each agent platform. Prioritize getting the skills loaded — the linter and visualizer are nice-to-haves.

**If time is running short:** Have attendees focus on designing the steps (which atomics, in what order, what error handling) even if they don't finish building. The design exercise is still valuable.

## Judging Criteria

| Criterion | Weight | What We're Looking For |
|-----------|--------|------------------------|
| **Working End-to-End** | 40% | Can it be invoked from chat and produce the right result? |
| **Composition** | 25% | Proper use of atomic skills? Logical ordering? |
| **Error Handling** | 20% | What happens when things go wrong? Structured error codes? |
| **Tool Description** | 15% | Would the LLM know when and how to use this tool? |

## Solution Walkthrough

### Option A: Extended Stay

```
extend_stay
|
+-- search_contact_by_email
|   +-- Error if not found: 404 GUEST_NOT_FOUND
|
+-- search_booking_by_contact_and_date
|   +-- Error if not found: 404 NO_ACTIVE_BOOKING
|   +-- Save: current checkout_date, room_id
|
+-- search_bookings_by_room_and_dates
|   +-- Check: current_checkout_date to new_checkout_date
|   +-- IF conflicts exist: 409 EXTENSION_NOT_AVAILABLE
|
+-- upsert_booking
|   +-- Update: check_out_date = new_checkout_date
|   +-- Uses: idempotency_token as external_id
|
+-- Return: booking_id, new_checkout_date, total_nights
```

### Option B: Room Upgrade

```
upgrade_room
|
+-- search_contact_by_email
|   +-- Error if not found: 404 GUEST_NOT_FOUND
|
+-- search_booking_by_contact_and_date
|   +-- Error if not found: 404 NO_ACTIVE_BOOKING
|   +-- Save: room_id (old), opportunity_id, checkout_date
|
+-- search_room_by_number (target room)
|   +-- Error if not found: 404 ROOM_NOT_FOUND
|   +-- Error if not Vacant: 409 ROOM_NOT_AVAILABLE
|   +-- Save: new room_id, nightly_rate
|
+-- Calculate price difference
|   +-- (new_rate - old_rate) x remaining_nights
|
+-- create_stripe_payment_intent + confirm_stripe_payment
|   +-- Error if fails: 402 PAYMENT_FAILED
|   +-- Use idempotency_token as Idempotency-Key
|
+-- update_room_status (old room -> Dirty)
|
+-- update_room_status (new room -> Occupied)
|
+-- upsert_booking (update room reference)
|
+-- Return: booking_id, previous_room, new_room, amount_charged
```

### Key Teaching Points

| Point | Why It Matters |
|-------|----------------|
| Validate everything before mutating | Prevents partial updates on failure |
| Check availability for the RIGHT date range | Common mistake: checking wrong dates |
| Payment before room updates (Option B) | Don't change rooms if payment fails |
| Idempotency at every external call | Safe retries across systems |

### Common Mistakes

| Mistake | Better Approach |
|---------|-----------------|
| Checking wrong date range for availability | Extension: check from current checkout TO new checkout |
| Updating rooms before payment confirmed | Process payment first, then update state |
| Forgetting to calculate price difference | Need both room rates and remaining nights |
| No rollback plan for partial failures | Design for all-or-nothing where possible |
| Vague tool description | Be specific about required params and error codes — the LLM needs this |

</div>
