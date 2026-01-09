---
layout: default
title: "Unit 2: Building an Orchestrator"
nav_order: 6
parent: Workshop Units
---

# Unit 2: Building an Orchestrator

**Hands-On Building (45 minutes)**

---

## Learning Objectives

- Compose existing atomic skills into a new orchestrator
- Understand how orchestrators chain multiple operations
- Expose the orchestrator as an MCP tool
- Test the complete flow end-to-end

---

## Challenge: Build a Room Transfer Orchestrator

**Scenario:** A guest wants to move to a different room - maybe their current room is too noisy, or they'd prefer a higher floor. Currently, the front desk has to manually update multiple records in Salesforce. Let's build an orchestrator that handles this in one tool call.

**Available Atomic Skills:**
- `search_contact_by_email` - Find guest by email
- `search_booking_by_contact_and_date` - Find active booking
- `search_room_by_number` - Check if target room exists
- `update_booking_status` - Modify booking record
- `update_room_status` - Change room availability
- `upsert_booking` - Update booking with new room

---

## Step 1: Design the Workflow (10 min)

### 1.1 What Needs to Happen

When a guest transfers rooms, we need to:

1. **Validate the guest** - Find their contact record
2. **Find their current booking** - Get the active booking for today
3. **Validate the new room** - Confirm it exists and is available
4. **Update the old room** - Mark as "Cleaning"
5. **Update the new room** - Mark as "Occupied"
6. **Update the booking** - Point to the new room

### 1.2 Define Inputs and Outputs

| Input | Type | Description |
|-------|------|-------------|
| `guest_email` | string | Guest's email address |
| `new_room_number` | string | Target room (e.g., "205") |
| `reason` | string | Optional - why they're transferring |
| `idempotency_token` | string | For retry safety |

| Output | Description |
|--------|-------------|
| success | Boolean |
| previous_room | Room they moved from |
| new_room | Room they moved to |
| booking_id | Updated booking reference |

### 1.3 Response Codes

Your orchestrator should return these HTTP status codes and response bodies:

| HTTP Status | Condition | error_code | Example error_message |
|-------------|-----------|------------|----------------------|
| 200 | Success | (none) | "Successfully transferred guest to room 205" |
| 404 | Guest not found | `GUEST_NOT_FOUND` | "No guest found with email x@example.com" |
| 404 | No active booking | `NO_ACTIVE_BOOKING` | "Guest has no active booking for today" |
| 404 | Target room doesn't exist | `ROOM_NOT_FOUND` | "Room 999 does not exist" |
| 409 | Target room not vacant | `ROOM_NOT_AVAILABLE` | "Room 205 is not available (status: Occupied)" |

**Important:** Workato requires you to configure response status codes in the API Platform trigger. Make sure to set up both success (200) and error responses, or Workato will block recipe activation.

---

## Step 2: Build the Orchestrator (20 min)

### 2.1 Create the Recipe in Workato

1. Navigate to **Projects -> orchestrator-recipes**
2. Click **Create Recipe**
3. Name: `Transfer guest room`

### 2.2 Configure Trigger

- **Trigger Type:** API Platform
- **Endpoint Path:** `/transfer_guest_room`
- **Method:** POST
- **Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "guest_email": { "type": "string" },
    "new_room_number": { "type": "string" },
    "reason": { "type": "string" },
    "idempotency_token": { "type": "string" }
  },
  "required": ["guest_email", "new_room_number", "idempotency_token"]
}
```

### 2.3 Add Recipe Steps

**Step 1: Call Atomic - Search Contact by Email**

- Action: **HTTP Request** (to your API endpoint) or **Call Recipe**
- Target: `search_contact_by_email`
- Input:
  ```json
  {
    "email": "[guest_email from trigger]"
  }
  ```
- **Returns:** `id` (Contact ID), `email`, `first_name`, `last_name`, `found`

**Step 2: Handle Guest Not Found**

- Add **IF** condition
- Condition: `found` = false OR `id` is empty
- IF true: **Stop job** with error response:
  ```json
  {
    "success": false,
    "error_code": "GUEST_NOT_FOUND",
    "error_message": "No guest found with email [guest_email]"
  }
  ```

**Step 3: Call Atomic - Search Booking by Contact and Date**

- Target: `search_booking_by_contact_and_date`
- Input:
  ```json
  {
    "contact_id": "[id from Step 1]",
    "check_in_date": "[today's date]"
  }
  ```
- **Returns:** `booking_id`, `room_id` (current room), `room_number` (current room), `opportunity_id`

> **Note:** This gives us the guest's current room information. Save these datapills - you'll need `room_id` in Step 7 and `room_number` for the success response.

**Step 4: Handle No Active Booking**

- Add **IF** condition
- Condition: `bookings` array is empty (size = 0)
- IF true: **Stop job** with error:
  ```json
  {
    "success": false,
    "error_code": "NO_ACTIVE_BOOKING",
    "error_message": "Guest has no active booking for today"
  }
  ```

**Step 5: Call Atomic - Search Room by Number (Target Room)**

- Target: `search_room_by_number`
- Input:
  ```json
  {
    "room_number": "[new_room_number from trigger]"
  }
  ```
- **Returns:** `id` (new room's Salesforce ID), `status`, `room_type`, `floor`, `found`

> **Note:** You'll need the `id` field in Steps 8-9. The `status` field is used in Step 6 for validation.

**Step 6: Validate Target Room**

- Add **IF** condition
- Condition: `found` = false OR `status` != "Vacant"
- IF `found` = false:
  ```json
  {
    "success": false,
    "error_code": "ROOM_NOT_FOUND",
    "error_message": "Room [new_room_number] does not exist"
  }
  ```
- IF `status` != "Vacant":
  ```json
  {
    "success": false,
    "error_code": "ROOM_NOT_AVAILABLE",
    "error_message": "Room [new_room_number] is not available (current status: [status])"
  }
  ```

**Step 7: Call Atomic - Update Old Room Status**

- Target: `update_room_status`
- Input:
  ```json
  {
    "room_id": "[room_id from Step 3 booking search]",
    "status": "Cleaning"
  }
  ```

> This marks the guest's current room for cleaning.

**Step 8: Call Atomic - Update New Room Status**

- Target: `update_room_status`
- Input:
  ```json
  {
    "room_id": "[id from Step 5 room search]",
    "status": "Occupied"
  }
  ```

> This marks the target room as occupied.

**Step 9: Call Atomic - Update Booking with New Room**

- Target: `upsert_booking`
- Input:
  ```json
  {
    "booking_id": "[booking_id from Step 3]",
    "room_id": "[id from Step 5]",
    "notes": "Transferred from room [room_number from Step 3] to [new_room_number from trigger]. Reason: [reason from trigger]"
  }
  ```

**Step 10: Return Success**

```json
{
  "success": true,
  "guest_email": "[guest_email from trigger]",
  "previous_room": "[room_number from Step 3]",
  "new_room": "[new_room_number from trigger]",
  "booking_id": "[booking_id from Step 3]",
  "message": "Successfully transferred guest to room [new_room_number from trigger]"
}
```

### 2.4 Test the Orchestrator

1. Save and start the recipe
2. Go to **Tools -> API Platform -> API Collections**
3. Find your `/transfer_guest_room` endpoint
4. Click **Test**

**Test Case:**
```json
{
  "guest_email": "sarah@example.com",
  "new_room_number": "205",
  "reason": "Requested quieter room",
  "idempotency_token": "transfer-test-001"
}
```

**Verify in Salesforce:**
- Old room status changed to "Cleaning"
- New room status changed to "Occupied"
- Booking record updated with new room

**CHECKPOINT:** Orchestrator successfully transfers guest between rooms

---

## Step 3: Expose as MCP Tool (10 min)

### 3.1 Add to MCP Configuration

Open: `config/mcp/manager/mcp-config.json`

Add this tool definition:

```json
{
  "name": "transfer_guest_room",
  "description": "Transfer a checked-in guest to a different room. Updates the old room to 'Cleaning', marks the new room as 'Occupied', and updates the booking record. Use when a guest requests a room change.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "guest_email": {
        "type": "string",
        "description": "Email address of the guest to transfer"
      },
      "new_room_number": {
        "type": "string",
        "description": "Target room number (e.g., '205', '302')"
      },
      "reason": {
        "type": "string",
        "description": "Optional reason for the transfer"
      }
    },
    "required": ["guest_email", "new_room_number"]
  }
}
```

### 3.2 Restart the Application

```bash
# Stop current process (Ctrl+C)
npm run dev
```

### 3.3 Test in the App

1. Open http://localhost:3000
2. Navigate to **Staff** or **Manager** interface
3. Try these prompts:

**Prompt 1:**
> "Move Sarah Johnson to room 205, she wants a quieter room"

**Prompt 2:**
> "Transfer the guest in 101 to room 302"

**Prompt 3 (Error case):**
> "Move Beth to room 999"

Expected: Appropriate error message (room not found)

**CHECKPOINT:** Natural language triggers room transfer with proper validation

---

## Step 4: Verify End-to-End (5 min)

### Verification Checklist

- [ ] Orchestrator validates guest exists
- [ ] Orchestrator validates active booking exists
- [ ] Orchestrator validates target room is vacant
- [ ] Old room marked as "Cleaning"
- [ ] New room marked as "Occupied"
- [ ] Booking updated with new room reference
- [ ] Errors return structured codes (404, 409)

### What You Built

You composed **6 existing atomic skills** into a new workflow:
1. `search_contact_by_email`
2. `search_booking_by_contact_and_date`
3. `search_room_by_number`
4. `update_room_status` (x2)
5. `upsert_booking`

This is the power of compositional design - new capabilities from existing building blocks.

---

## Bonus Challenge: Booking Cancellation

If you finish early, build a `cancel_booking` orchestrator:

**Scenario:** Guest needs to cancel their reservation. Handle the full workflow.

**Compose these atomics:**
- `search_contact_by_email`
- `search_booking_by_contact_and_date`
- `update_booking_status` (set to "Cancelled")
- `update_room_status` (conditionally)
- `update_opportunity_stage` (set to "Closed Lost")

**Think about the flow control logic:**

Not every cancellation should update the room status. You'll need conditional branching based on the current booking status and/or room status to determine when (and how) to update the room.

**Error conditions:**
- Guest not found (404)
- No booking found (404)
- Booking already cancelled (409)

**MCP tool description hint:**
> "Cancel a guest's booking. Updates booking status to 'Cancelled', closes the opportunity, and releases the room if the guest is currently checked in. Use when a guest needs to cancel their reservation."

**Input parameters:**
- `guest_email` (string, required) - Email address of the guest
- `reason` (string, optional) - Reason for cancellation
- `idempotency_token` (string, required) - For retry safety
