---
layout: default
title: "Unit 1: Running the Hotel App"
nav_order: 5
parent: Workshop Units
---

# Unit 1: Running the Hotel App

**Hands-On Session (45 minutes)**

---

## Learning Objectives

- Configure the hotel app for authenticated chat via AWS Cognito + Bedrock
- Launch the app and verify both Guest and Manager personas
- Explore the Manager dashboard and its live Salesforce data
- Use the built-in MCP debug panel to observe LLM tool invocations

---

## Part 1: Configure and Launch the App (20 min)

### 1.1 Disable Mock Mode

Now that Workato and Salesforce are connected, switch the app from mock mode to live services. Open `app/.env` and update the following:

```bash
WORKATO_MOCK_MODE=false
SALESFORCE_ENABLED=true
```

### 1.2 Add Cognito & Bedrock Configuration

Your facilitator will share the Cognito and Bedrock values via a password-protected link.
**The password will be shown on screen by your facilitator.**

🔐 **[Open the values (PrivateBin)](https://privatebin.net/?3782822ed656cd65#CGeJ4JdUR4PcT5zjuqQLLKgYLxBTUcdhGB8unzcSKuNo)**

Open the link and enter the password shown on screen. Then copy each line from the file and replace the matching line in your local `app/.env` (including setting `AUTH_PROVIDER=cognito`).

### 1.3 Start the Application

#### macOS / Linux

```bash
app/scripts/dev-tools/server.sh start
```

#### Windows

```powershell
cd app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000){:target="_blank"}

The login page should now show Cognito-based login options instead of mock mode.

> **If the login page still shows mock mode:** Restart the app after env changes — `app/scripts/dev-tools/server.sh restart` (macOS/Linux) or press `Ctrl+C` and re-run `npm run dev` (Windows)

### 1.5 Create Your Accounts

You'll need two accounts to test both personas. Use email aliases to create them from a single inbox (see [Pre-Workshop Setup](01-pre-workshop.html#4-email-account-with-alias-support) for details):

| Persona | Email Format | Example |
|---------|-------------|---------|
| Guest | `yourname+guest@yourdomain.com` | `john.doe+guest@gmail.com` |
| Manager | `yourname+manager@yourdomain.com` | `john.doe+manager@gmail.com` |

1. Click **Sign Up** and create your **Guest** account first
2. Verify via email if prompted
3. Log out, then create your **Manager** account

### 1.6 Verify Guest Login

1. Log in with your Guest account
2. You should see the guest view — a chat interface and limited navigation
3. Wait for the agent greeting message (confirms Bedrock is connected)

**CHECKPOINT:** App running, Cognito login working, guest greeting received

---

## Part 2: Explore the Manager Dashboard (10 min)

### 2.1 Switch to Manager

1. Log out of the Guest account
2. Log in with your Manager account

### 2.2 Tour the Dashboard

The Manager view includes a dashboard that pulls live data from Salesforce via the SF API Collection you created in Unit 0:

- **Room status** — Vacant, Occupied, Dirty, Maintenance
- **Active bookings** — Current and upcoming reservations
- **Open cases** — Service requests and maintenance tickets

Take a minute to explore. The data you see is the seed data deployed to Salesforce in Unit 0.

### 2.3 Understand What Powers This

The dashboard doesn't call Salesforce directly. It uses the **SF API Collection** — the same `sf-api-collection` created during `make setup-api`. This is an example of how both direct API calls and MCP tool calls are often part of a single application's architecture, even when it uses agents.

**CHECKPOINT:** Manager dashboard showing live Salesforce data

---

## Part 3: Your First AI Chat (15 min)

### 3.1 Open the Chat Interface

1. From the Manager view, navigate to **Chat** in the sidebar
2. The MCP debug panel should be visible on the right side of the chat interface

> **If the debug panel is not visible:** Check that `NEXT_PUBLIC_ENABLE_CHAT_DEBUG=true` is set in `app/.env` and restart the app.

### 3.2 Understand the Debug Panel

The debug panel shows you exactly what the LLM is doing behind the scenes:

- **Tool calls** — Which MCP tools the LLM invokes and in what order
- **Inputs** — The parameters the LLM passes to each tool
- **Outputs** — The responses returned from Workato
- **Timing** — How long each tool call takes

This is a client-side view of the full MCP conversation between the LLM and your Workato backend.

### 3.3 Try a Simple Query

Start with something straightforward:

```
Show me all vacant rooms
```

Watch the debug panel:
- The LLM calls `search_rooms_on_behalf_of_staff`
- Workato's orchestrator recipe executes a SOQL query against Salesforce
- Room data flows back through MCP → LLM → chat UI

### 3.4 Try a Multi-Step Interaction

```
Are there any open service cases?
```

Then follow up with:

```
Show me the details on the highest priority one
```

Watch how the LLM uses context from the first call to inform the second. The debug panel reveals how many tool calls each interaction requires.

### 3.5 Observe Manager-Only Access

As a Manager, you have tools that Guests don't:

```
File a maintenance request for room 205 — the bathroom faucet is leaking
```

- Expected tool: `submit_maintenance_request`
- Watch the debug panel for the full input/output payload

**CHECKPOINT:** Successfully used Manager chat with debug panel showing tool invocations

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Login page still shows mock mode | Verify `AUTH_PROVIDER=cognito` in `app/.env`, restart app |
| No agent greeting in chat | Bedrock not connected; check Cognito/Bedrock env vars |
| Debug panel not showing | Set `NEXT_PUBLIC_ENABLE_CHAT_DEBUG=true`, restart app |
| Dashboard shows no data | Check `SALESFORCE_ENABLED=true` and SF API Collection credentials in `app/.env` |
| "Unauthorized" on tool calls | Verify MCP server URLs and tokens in `app/.env` |
| Slow first response | Normal — cold start on first Bedrock call. Subsequent calls are faster |

---

## Alternative: Test via Desktop Clients

If the hotel app has issues, you can test your MCP servers directly with a desktop client:

### Claude Desktop

1. Find your MCP server URLs and tokens in `app/.env` (written by `make setup-mcp`)
2. Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dewy-guest-mcp": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://your_mcp_guest_url?wkt_token=your_token"
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

<div class="facilitator-only" markdown="1">

## Facilitator Notes

**Before this unit:**
- Have Cognito/Bedrock credentials ready to distribute (printed cards or shared doc)
- Test the full flow yourself — Cognito sign-up can occasionally require email verification
- Ensure your own Manager dashboard is populated and working as a reference

**Common issues:**
- Attendees forgetting to restart the app after `.env` changes (most common)
- Cognito sign-up email verification delays (1-2 minutes)
- Debug panel not appearing (usually a missing `NEXT_PUBLIC_` env var — needs restart, not just refresh)

**If the app fails for an attendee:**
- Pair them with a working neighbor

**Support Ratio:** 1 facilitator per 8-10 attendees — this unit has the most environment-specific troubleshooting

**Time Buffer:** Part 1 often runs long. If needed, shorten Part 3 to one or two prompts — the key checkpoint is seeing the debug panel work.

</div>
