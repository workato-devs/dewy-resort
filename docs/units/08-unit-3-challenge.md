---
layout: default
title: "Unit 3: Design Challenge"
nav_order: 7
parent: Workshop Units
---

# Unit 3: Design Challenge

**Competitive Design Challenge (25 minutes)**

---

## Choose Your Challenge

You have two options based on your environment setup:

| Challenge | Difficulty | Systems | Choose If... |
|-----------|------------|---------|--------------|
| **Option A: Extended Stay** | Standard | Salesforce only | You don't have Stripe connected |
| **Option B: Room Upgrade** | Advanced | Salesforce + Stripe | You have Stripe connected and want a cross-system challenge |

---

## Challenge Rules

| Rule | Details |
|------|---------|
| **Time Limit** | 20 minutes for design + implementation |
| **Teams** | Individual or pairs |
| **Deliverable** | MCP tool definition + workflow design |
| **Bonus** | Working implementation in Workato |

---

# Option A: Extended Stay

## The Scenario

A guest currently checked in wants to **extend their stay** by a few more nights. The front desk needs to verify availability and update the reservation.

**Your Mission:** Design an `extend_stay` orchestrator using compositional patterns.

---

## Available Atomic Skills (Option A)

| Atomic Skill | Purpose | Returns |
|--------------|---------|---------|
| `search_contact_by_email` | Find guest contact | id, found |
| `search_booking_by_contact_and_date` | Find current booking | booking_id, room_id, check_out_date |
| `search_bookings_by_room_and_dates` | Check availability for new dates | bookings[] or empty |
| `upsert_booking` | Update reservation | booking_id |
| `update_opportunity_stage` | Update revenue tracking | opportunity_id |

---

## Requirements (Option A)

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

### Response Codes (Option A)

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

**Your Mission:** Design an `upgrade_room` orchestrator that coordinates Salesforce and Stripe.

---

## Available Atomic Skills (Option B)

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

## Requirements (Option B)

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
5. Update room statuses (old room -> Cleaning, new room -> Occupied)
6. Update the booking with the new room
7. Handle payment failures gracefully
8. Be idempotent (safe to retry)

### Response Codes (Option B)

| HTTP Status | Condition | error_code |
|-------------|-----------|------------|
| 200 | Success | (none) |
| 404 | Guest not found | `GUEST_NOT_FOUND` |
| 404 | No active booking | `NO_ACTIVE_BOOKING` |
| 404 | Target room not found | `ROOM_NOT_FOUND` |
| 409 | Target room not available | `ROOM_NOT_AVAILABLE` |
| 402 | Payment failed | `PAYMENT_FAILED` |

---

## Design Template

### Workflow Diagram

Fill in your workflow:

```
[your_orchestrator_name]
|
+-- Step 1: ______________________
|   +-- Error if: ________________
|
+-- Step 2: ______________________
|   +-- Error if: ________________
|
+-- Step 3: ______________________
|   +-- IF unavailable: __________
|
+-- Step 4: ______________________
|
+-- Step 5: ______________________
|
+-- Return: ______________________
```

### MCP Tool Definition

Fill in your tool definition:

```json
{
  "name": "______________________",
  "description": "_____________________________",
  "inputSchema": {
    "type": "object",
    "properties": {
      // Your parameters here
    },
    "required": [
      // Required fields
    ]
  }
}
```

---

<div class="facilitator-only" markdown="1">

## Judging Criteria

| Criterion | Weight | What We're Looking For |
|-----------|--------|------------------------|
| **Completeness** | 40% | Does the solution handle the full workflow? |
| **Composition** | 30% | Proper use of atomic skills? Minimal duplication? |
| **Error Handling** | 20% | What happens when things go wrong? |
| **Tool Design** | 10% | Clear description? Intuitive parameters? |

</div>

---

## Hints

<details>
<summary>Hint 1: Order of Operations (Click to reveal)</summary>

Think about dependencies:
- What must you validate before making any changes?
- For Option B: What happens if payment fails after you've already updated the room?
- Check availability/validity FIRST, then make changes

</details>

<details>
<summary>Hint 2: Calculating Extended Dates (Option A)</summary>

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
<summary>Hint 4: Idempotency Pattern (Click to reveal)</summary>

Use the `idempotency_token` in multiple places:
- As `external_id` in upsert_booking
- As `Idempotency-Key` header in Stripe calls (Option B)

</details>

---

## Timer: 20 Minutes

**START NOW**

---

<div class="facilitator-only" markdown="1">

## Solution Discussion (5 min)

### Option A: Extended Stay - Ideal Workflow

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

### Option B: Room Upgrade - Ideal Workflow

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
+-- update_room_status (old room -> Cleaning)
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

---

## Scoring Rubric

| Category | Criteria | Points |
|----------|----------|--------|
| **Completeness** | Guest/booking lookup | 10 |
| | Availability/room validation | 10 |
| | Core operation (date update OR payment + room swap) | 10 |
| | Proper state updates | 10 |
| **Composition** | Uses existing atomics correctly | 15 |
| | Logical ordering of operations | 15 |
| **Error Handling** | Handles primary failure case | 10 |
| | Returns appropriate error codes | 5 |
| | Helpful error messages | 5 |
| **Tool Design** | Clear, helpful description | 5 |
| | Intuitive parameter names | 5 |
| **Total** | | **100** |

</div>

---

## Transition to Wrap-Up

> "Great work everyone! Whether you tackled the extended stay or the room upgrade challenge, you've now applied compositional thinking to design a real workflow. Let's wrap up with key takeaways and resources for continuing your learning."
