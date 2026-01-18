---
layout: default
title: "Unit 2: Testing Your MCP Servers"
nav_order: 6
parent: Workshop Units
---

# Unit 2: Testing Your MCP Servers

**Hands-On Testing (30 minutes)**

---

## Learning Objectives

- Configure the hotel app for authenticated chat
- Test MCP tools as both Guest and Manager personas
- Use debug mode to observe tool call activity
- Troubleshoot using Workato execution logs
- (Optional) Test via Claude Desktop or ChatGPT Desktop

---

## Part 1: Enable Chat in the Hotel App (10 min)

Now that your MCP servers are created, you'll configure the hotel app to use them with authenticated chat.

### 1.1 Switch to AWS Cognito Authentication

<!-- PLACEHOLDER: Specific env vars for Cognito switch -->

Update your `app/.env` file with the following changes:

```bash
# TODO: Add specific Cognito configuration variables
# Your facilitator will provide these values
```

### 1.2 Create Your Cognito Account

1. Restart the hotel app (if running):
   ```bash
   app/scripts/dev-tools/server.sh restart
   ```
2. Open http://localhost:3000
3. The app will guide you through creating an AWS Cognito account
4. This provisions LLM access via Amazon Bedrock

### 1.3 Add Facilitator-Provided Keys

Your facilitator will provide temporary keys for the workshop. Add them to your `app/.env`:

```bash
# TODO: Add Bedrock/Cognito keys provided by facilitator
```

### 1.4 Verify Login Options

After configuration is complete:

1. Restart the app
2. The login page will now show **static login options**:
   - Guest accounts (use your `+guest` email alias credentials)
   - Manager accounts (use your `+manager` email alias credentials)

**CHECKPOINT:** Login page shows Guest and Manager login options

---

## Part 2: Test as a Guest (10 min)

### 2.1 Log In as Guest

1. Select a **Guest** login option
2. Enter your credentials
3. Navigate to **Chat** in the left sidebar
4. Wait for the agent greeting message (confirms Bedrock is connected)

### 2.2 Enable Debug Mode

1. Look for the **Debug** toggle in the chat interface
2. Enable it to open the tool call activity panel on the right
3. This shows real-time MCP tool invocations

### 2.3 Test Guest Scenarios

Try these prompts and observe the tool calls in the debug panel:

**Room Information:**
```
What room am I staying in?
```
- Expected tool: `search_rooms_on_behalf_of_guest`

**Service Request:**
```
I need extra towels in my room
```
- Expected tools: `submit_guest_service_request`
- Watch: How does the agent gather missing info (room number, priority)?

**Check Service Status:**
```
What's the status of my service requests?
```
- Expected tool: `search_cases_on_behalf_of_guest`

**Booking Management:**
```
I'd like to extend my stay by one night
```
- Expected tool: `manage_booking_orchestrator`

### 2.4 Observe in Workato Logs

1. Open Workato → **Tools → Logs**
2. Find your recent tool executions
3. Click on a log entry to see:
   - Input parameters received
   - Each step's execution
   - Response returned to the agent

**CHECKPOINT:** Successfully tested guest scenarios with debug panel showing tool calls

---

## Part 3: Test as a Manager (5 min)

### 3.1 Switch to Manager Persona

1. Log out of the guest account
2. Log in with a **Manager** account
3. Navigate to **Chat**

### 3.2 Test Manager-Only Scenarios

These tools are only available to managers:

**View All Rooms:**
```
Show me all vacant rooms
```
- Expected tool: `search_rooms_on_behalf_of_staff`
- Note: Returns ALL rooms, not just guest's bookings

**Maintenance Request:**
```
Room 205 has a leaky faucet, please file a maintenance request
```
- Expected tool: `submit_maintenance_request`

**Process Refund:**
```
Process a refund for the failed checkout on booking BK-12345
```
- Expected tool: `compensate_checkout_failure`

**Manage Cases:**
```
Show me all open service cases
```
- Expected tool: `search_cases_on_behalf_of_staff`

### 3.3 Compare Guest vs Manager Access

Notice the difference:
- **Guest** `search_rooms` returns only their booked rooms
- **Manager** `search_rooms` returns all hotel rooms with guest details
- **Manager** has access to maintenance, case management, and refund tools

**CHECKPOINT:** Confirmed manager has elevated access and additional tools

---

## Part 4: Trigger Error Conditions (5 min)

Test how the system handles errors gracefully:

### 4.1 Resource Not Found (404)

```
Check in guest with email nonexistent@example.com
```
- Expected: Clear error message, no crash
- Check Workato logs for the 404 response

### 4.2 Invalid State (409)

```
Check in a guest who is already checked in
```
- Expected: Conflict error explaining the issue

### 4.3 Missing Required Info

```
I need housekeeping
```
- Expected: Agent asks for room number, not a tool error
- Observe: LLM gathers required fields before calling tool

---

## Alternative: Test via Desktop Clients

If the hotel app has issues, test your MCP servers directly:

### Claude Desktop

1. Copy the **Developer MCP Token** from your MCP server's Settings tab in Workato
2. Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dewy-guest-mcp": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://your_url?wkt_token=your_token"
      ]
    }
  }
}
```

3. Restart Claude Desktop
4. Test with: "What tools do you have available?"

### ChatGPT Desktop

1. Open Settings → MCP Servers
2. Add your MCP server URL and token
3. Test the same scenarios

### Workato API Platform (Direct)

1. Go to **Tools → API Platform → API Collections**
2. Click on your collection
3. Select an endpoint
4. Use the **Test** tab to send requests directly

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No agent greeting in chat | Bedrock provisioning incomplete; check env vars |
| Login page unchanged | Restart app after env changes |
| Tool calls not showing | Enable Debug mode toggle |
| "Unauthorized" errors | Verify MCP server tokens in .env |
| Tool returns error | Check Workato **Tools → Logs** for details |

---

## What You Accomplished

- Configured authenticated chat with AWS Cognito + Bedrock
- Tested MCP tools as both Guest and Manager personas
- Used debug mode to observe real-time tool activity
- Explored error handling and LLM coaching behavior
- (Optional) Validated MCP servers via desktop clients

---

<div class="facilitator-only" markdown="1">

## Facilitator Notes

**Before this unit:**
- Ensure all attendees have MCP servers created from Unit 1
- Have temporary Cognito/Bedrock keys ready to distribute
- Test the full flow yourself before the session

**Common issues:**
- Attendees forgetting to restart app after env changes
- Bedrock provisioning delays (can take 1-2 minutes)
- Debug panel not appearing (browser cache issue - try hard refresh)

**If hotel app fails for an attendee:**
- Pair them with someone whose app works
- Direct them to desktop client alternative
- Use Workato's direct API test as fallback

</div>
