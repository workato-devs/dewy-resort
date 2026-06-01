# Workato Setup Guide

This guide covers the complete setup of Workato recipes for the Dewy Resort hotel management system. Workato provides the integration layer that connects Salesforce, Stripe, and Twilio to power the hotel application.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation Steps](#installation-steps)
- [Manual Recipe Activation](#manual-recipe-activation)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Dewy Resort application uses **Workato recipes** to integrate with backend systems:

- **Salesforce**: Manages hotel data (rooms, bookings, guests, cases)
- **Stripe**: Processes payments and refunds (optional)
- **Twilio**: Sends SMS notifications (optional)

### Why Workato?

This project demonstrates **MCP (Model Context Protocol) server patterns** using Workato as the integration platform. The architecture showcases:

- API Collection design patterns
- Atomic recipe composition
- Orchestrator patterns for complex workflows
- Error handling and retry logic

---

## Architecture

### Compositional MCP Architecture

This project demonstrates **persona-based MCP servers** organized by user role and "jobs to be done":

**Key Principle:**
> "All data movement orchestrated through Workato - No direct system integrations"

The architecture implements:

1. **Multiple MCP Servers** - Separate servers for Guest and Staff personas
2. **Orchestrators (High-level)** - Fast, validated workflows for common scenarios
3. **Atomic Skills (Low-level)** - Composable building blocks for AI agents
4. **API Platform Layer** - REST endpoints exposing orchestrators and atomic skills as MCP tools

**Example: Guest Check-In Orchestrator**

![Guest Check-In Flow](./architecture/guest-checkin-flow.png)
*Guest Check-In orchestrator workflow - Multi-object state transition*

When an MCP tool calls `POST /check-in-guest {guest_email, check_in_date}`:

1. **Orchestrator validates prerequisites:**
   - Guest exists (Contact.id)
   - Reservation exists (Booking.status = Reserved)
   - Room is available (Hotel_Room.status = Vacant)

2. **Executes parallel Salesforce reads** (3 atomic skills):
   - Search Contact by Email
   - Search Booking (Reserved status)
   - Check Room Status

3. **Executes state transitions in dependency order:**
   - Booking: Reserved → Checked In
   - Room: Vacant → Occupied
   - Opportunity: Booking Confirmed → Checked In

4. **Returns success** with booking_id, room_number, check_in_date

**Execution Time:** < 3 seconds | **API Operations:** 6 calls (3 reads + 3 updates)

**Additional Orchestrator Flows:**
See [`docs/architecture/`](./architecture) for detailed visualizations:
- Guest Checkout - Payment processing and room release
- Guest Service Request - Service case creation
- Maintenance Request - Staff maintenance workflows

**Why Atomic Skills Matter:**

When a guest says "I need towels in room 101" but the contact doesn't exist:
- **Orchestrator would fail** (requires existing contact)
- **AI agent composes atomic skills:**
  1. `create_contact` (with proper approval authority)
  2. `upsert_case` (submit service request)

This enables AI agents to handle edge cases and dynamic scenarios intelligently.

---

### Recipe Organization

The Workato recipes are organized into three categories:

#### 1. **Atomic Salesforce Recipes** (`workato/recipes/atomic-salesforce-recipes/`) - Atomic Skills

Low-level, single-purpose operations that AI agents can compose at runtime:

- `search_bookings_by_room_and_dates.recipe.json` - Check room availability
- `search_room_by_number.recipe.json` - Find room details
- `search_contact_by_email.recipe.json` - Find guest information
- `search_booking_by_contact_and_date.recipe.json` - Find guest bookings
- `search_case_by_token.recipe.json` - Find service requests
- `upsert_booking.recipe.json` - Create/update bookings
- `upsert_contact.recipe.json` - Create/update contacts
- `upsert_case.recipe.json` - Create/update cases
- `update_booking_status.recipe.json` - Update booking status
- `update_case_status.recipe.json` - Update case status
- `update_room_status.recipe.json` - Update room status
- `update_opportunity_stage.recipe.json` - Update opportunity stage
- `create_opportunity.recipe.json` - Create opportunities
- `create_contact.recipe.json` - Create contacts
- `search_booking_by_external_id.recipe.json` - Find booking by external ID

**Total: 15 atomic Salesforce recipes (MCP atomic skills)**

**Characteristics:**
- Single responsibility (one Salesforce operation)
- Composable by AI agents at runtime
- Handle edge cases with proper authority
- Enable dynamic scenario handling

#### 2. **Atomic Stripe Recipes** (`workato/recipes/atomic-stripe-recipes/`) - Optional Atomic Skills

Low-level payment operations for AI agent composition:

- `create_stripe_customer.recipe.json` - Create customer in Stripe
- `create_stripe_payment_intent.recipe.json` - Initialize payment
- `confirm_stripe_payment.recipe.json` - Complete payment
- `retrieve_stripe_payment_status.recipe.json` - Check payment status
- `stripe_payment_status.recipe.json` - Get payment details
- `create_stripe_refund.recipe.json` - Process refunds

**Total: 6 atomic Stripe recipes (MCP atomic skills)**

#### 3. **Orchestrator Recipes** (`workato/recipes/orchestrator-recipes/`) - High-level Workflows

Complex, validated workflows for common scenarios (exposed as MCP tools):

- `create_booking_orchestrator.recipe.json` - Complete booking flow
- `manage_booking_orchestrator.recipe.json` - Booking lifecycle management
- `check_in_guest.recipe.json` - Guest check-in process
- `process_guest_checkout.recipe.json` - Guest checkout process
- `submit_guest_service_request.recipe.json` - Service request workflow
- `submit_maintenance_request.recipe.json` - Maintenance request workflow
- `manage_cases_orchestrator.recipe.json` - Case management workflow
- `search_rooms_on_behalf_of_guest.recipe.json` - Guest room search
- `search_rooms_on_behalf_of_staff.recipe.json` - Staff room search
- `search_cases_on_behalf_of_guest.recipe.json` - Guest case search
- `search_cases_on_behalf_of_staff.recipe.json` - Staff case search
- `upsert_contact_by_email.recipe.json` - Contact upsert workflow

**Total: 12 orchestrator recipes (MCP high-level tools)**

**Characteristics:**
- Encode business rules and prerequisites
- Fast and convenient for happy-path scenarios
- Execute state transitions in correct dependency order
- Idempotent via ID checks
- Fail gracefully (no auto-creation for edge cases)

**Workshop Teaching Points:**
- **Prerequisite validation:** Guest + Reservation + Vacant Room required
- **State transition ordering:** Dependencies enforced (Booking before Room)
- **Idempotency:** Check booking_id to prevent duplicate operations
- **Human intervention:** No auto-creation - AI must use atomic skills for edge cases

### Persona-Based MCP Servers

The recipes are organized into **two MCP servers** by user persona:

#### Guest MCP Server
**Purpose:** Guest-facing workflows and self-service operations

**Orchestrators:**
- `check_in_guest` - Multi-object state transition
- `checkout_guest` - Complete checkout with payment
- `service_request` - Submit guest service requests

**Atomic Skills:**
- `search_contact`, `search_booking`, `upsert_case`

#### Staff MCP Server
**Purpose:** Staff operations and management workflows

**Orchestrators:**
- `maintenance_request` - Maintenance workflow
- `assign_room` - Room assignment logic
- `update_case_status` - Case management

**Atomic Skills:**
- `create_contact`, `search_room`, `update_room_status`

This persona-based organization enables AI agents to access only the tools appropriate for their user context.

---

## Prerequisites

Before setting up Workato, ensure you have completed:

1. ✅ **Salesforce Setup** - Custom objects deployed and seed data imported
   - See [SALESFORCE_SETUP.md](../../vendor/salesforce/docs/SALESFORCE_SETUP.md)
   - Verify objects exist: `Booking__c`, `Hotel_Room__c`, `Payment_Transaction__c`, `SMS_Notification__c`

2. ✅ **Workato Sandbox Account** - Trial/Developer Sandbox with API Platform access
   - You should have received a sandbox URL and API token from your facilitator

3. ✅ **wk CLI Installed**
   - macOS/Linux: `brew install workato/tap/wk`
   - Windows: `scoop install wk`
   - Run `make setup tool=workato` to verify

4. ✅ **Stripe Developer Account** (required for payment features)
   - Sign up at https://dashboard.stripe.com/register
   - Have your **test mode** secret key ready (`sk_test_...`)

---

## Installation Steps

### Step 1: Install wk CLI

```bash
# macOS/Linux
brew install workato/tap/wk

# Windows
scoop install wk

# Verify installation
make setup tool=workato
```

### Step 2: Add Your API Token

Open the `.env` file in the project root and paste your Workato API token:

```
WORKATO_API_TOKEN=wrkatrial-eyJ0eXAiOi...
```

Your facilitator will provide this token for your sandbox.

### Step 3: Authenticate wk CLI

```bash
make workato-login
```

This reads the token from `.env` and creates a keychain-backed auth profile. Verify with:

```bash
wk auth status
```

**Expected output:**
```
Profile:     workshop
Workspace:   Your Name
Environment: dev
Region:      trial
API:         connected
```

### Step 4: Initialize Project

```bash
make workato-init
```

This creates the local project scaffold so the CLI knows where your recipes live.

### Step 5: Push Recipes

```bash
make push
```

**What this does:**
- Deploys all recipes to your Workato workspace (15 Salesforce + 6 Stripe + 12 orchestrators + supporting recipes)
- Creates the folder structure (`atomic-salesforce-recipes`, `atomic-stripe-recipes`, `orchestrator-recipes`, etc.)
- Lint warnings are expected and will not block the push

**Expected output:** A list of `.recipe.json` files with `created` status.

### Step 6: Activate Connections in Workato UI

⚠️ **Manual step** — connections must be activated in the Workato UI before any recipe can run.

1. **Log in to Workato**: Use your sandbox URL (e.g., https://app.trial.workato.com)
2. **Navigate to Projects** → **Workspace Connections**
3. **Activate each connection:**

#### Salesforce Connection (Required)

1. Click on the **Salesforce** connection
2. Click **Connect** or **Authenticate**
3. Log in to your Salesforce org (the same org you deployed metadata to)
4. Authorize Workato to access your Salesforce org
5. **⚠️ CRITICAL**: Do NOT rename the connection — keep the default name

#### Stripe Connection (Required for payment features)

1. Click on the **Stripe** connection
2. Click **Connect** or **Authenticate**
3. Select **API key** as the authentication type
4. Paste your Stripe **test mode** secret key (`sk_test_...`)
5. Click **Connect** to complete authentication
6. **⚠️ CRITICAL**: Do NOT rename the connection — keep the default name

**Why connection names matter:** Recipes reference connections by name. Renaming a connection breaks every recipe that uses it.

### Step 7: Start Recipes (First Pass)

```bash
make start-recipes
```

This starts all stopped recipes. Most should start successfully.

**If 4 recipes fail to start** (known platform caching issue), see [Manual Recipe Activation](#manual-recipe-activation) below, then run `make start-recipes` again to pick up the stragglers.

**If all recipes start**, skip ahead to Step 8.

### Step 8: Set Up API Platform

```bash
make setup-api
```

**What this does:**
- Creates two API collections: `dewy-resort-guest` (7 endpoints) and `dewy-resort-manager` (10 endpoints)
- Maps each endpoint to its backing orchestrator recipe

**Expected output:**
```
API Platform setup complete.
  - Guest collection: dewy-resort-guest (7 endpoints)
  - Manager collection: dewy-resort-manager (10 endpoints)
```

### Step 9: Enable API Endpoints

```bash
make enable-api-endpoints
```

This activates all API endpoints so they can receive traffic. All recipes must be running first — if any endpoint fails with "underlying recipe is inactive", start the missing recipe and re-run this command.

### Step 10: Set Up MCP Servers

```bash
make setup-mcp
```

**What this does:**
- Creates two MCP servers: `dewy-resort-guest` and `dewy-resort-manager`
- Retrieves MCP URLs and tokens
- Writes connection details to `app/.env`

**Expected output:**
```
MCP servers created.
  Guest MCP:   https://...dewy-resort-guest-v1?wkt_token=...
  Manager MCP: https://...dewy-resort-manager-v1?wkt_token=...
  Values saved to app/.env
```

The full MCP URLs can be used directly with Claude, Codex, or any MCP-compatible client.

### Step 11: Verify

Test that the MCP servers respond:

```bash
# Replace with your actual MCP URL from the output above
curl -s -X POST "YOUR_MCP_URL" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | python3 -m json.tool
```

You should see a list of tools (7 for guest, 10 for manager).

---

## Manual Recipe Activation

**⚠️ CRITICAL STEP**: Some recipes require manual activation in the Workato UI because they use dynamic SOQL queries that need connection configuration in the recipe builder.

### Recipes Requiring Manual Activation

#### Salesforce SOQL Recipes (4 recipes)

These recipes use the **"Execute SOQL query"** action in Salesforce, which requires manual connection selection:

1. `Search bookings by room and dates`
2. `Search room by number`
3. `Search on behalf of staff`
4. `Search on behalf of guest`

#### Why Manual Activation is Needed

These recipes require manual activation due to a **metadata caching issue** in Workato. When recipes with dynamic SOQL queries are deployed via the CLI, the Salesforce connection is not automatically linked. Opening the recipe's **Connections** tab and selecting your Salesforce connection refreshes the metadata cache, allowing the recipe to start.

---

### Salesforce SOQL Recipe Activation Steps

**⚠️ You must repeat these steps for each of the 4 recipes listed above.**

#### Step-by-Step Instructions

For **each** of the 4 Salesforce SOQL recipes:

1. **Navigate to the recipe:**
   - Log in to Workato: https://app.trial.workato.com (if using Developer Sandbox -- recommended)
   - Go to **Projects** → find the recipe's project (e.g., **orchestrator-recipes** or **atomic-salesforce-recipes**)
   - Click on the recipe name to open its detail page

2. **Link the Salesforce connection:**
   - Click the **Connections** tab (between "Jobs" and "Versions")
   - In the left panel, you'll see **"Salesforce connection"** with a red **"Requires connection"** warning
   - In the main panel under "Showing active connections", click your Salesforce connection (e.g., **"SF Dev Account"**)
   - A green **"Connection updated successfully"** banner appears at the top

3. **Repeat for remaining recipes:**
   - Return to the project listing and repeat steps 1-2 for each recipe

4. **Start all recipes:**
   - Once all 4 recipes have their connections linked, run:
     ```bash
     make start-recipes
     ```

---

### Stripe Recipe Activation (Optional)

If you configured the Stripe connection, no manual activation is required. The `make start-recipes` command should have started all Stripe recipes automatically.

**If Stripe recipes failed to start:**

1. Verify the Stripe connection is authenticated in **Workspace-Connections**
2. Check the recipe error message in Workato
3. Common issues:
   - Connection not authorized
   - API key expired
   - Insufficient Stripe permissions

---

## Troubleshooting

### Testing API Endpoints with curl

If you need to test Workato API Collection endpoints directly:

```bash
# Get your Workato API Collection URL from recipe details
# Navigate to any recipe → API Collection → Copy URL

# Test search endpoint (example)
curl -X POST "https://apim.workato.com/your-collection-id/search_room_by_number" \
  -H "Content-Type: application/json" \
  -H "API-TOKEN: your_api_token" \
  -d '{"room_number": "101"}'

# Expected response: Room details from Salesforce
{
  "room_id": "a00...",
  "room_number": "101",
  "room_type": "Standard",
  "status": "Available",
  "max_occupancy": 2
}
```

---

### Recipe Fails to Start: "Connection not configured"

**Cause**: The recipe references a connection that hasn't been authenticated.

**Solution**:
1. Go to **Projects** → **Workspace-Connections**
2. Find the connection (Salesforce, Stripe, or Twilio)
3. Click **Connect** and authenticate
4. Return to the recipe and click **Start Recipe**

---

### Recipe Fails: "Invalid SOQL query"

**Cause**: The SOQL query references Salesforce objects or fields that don't exist in your org.

**Solution**:
1. Verify Salesforce metadata is deployed (see [SALESFORCE_SETUP.md](../../vendor/salesforce/docs/SALESFORCE_SETUP.md))
2. Check that custom objects exist:
   ```bash
   bin/sf org open --target-org myDevOrg
   # Navigate to Setup → Object Manager
   # Verify: Booking__c, Hotel_Room__c, Payment_Transaction__c, SMS_Notification__c
   ```
3. If objects are missing, redeploy Salesforce metadata:
   ```bash
   make sf-deploy org=myDevOrg
   ```

---

### Cannot Find Recipe in Workato UI

**Cause**: Recipes may be in a different project or folder than expected.

**Solution**:
1. Use the global search in Workato (top search bar)
2. Search for the recipe name (e.g., "Search bookings")
3. Verify the recipe is in the correct project folder:
   - Atomic Salesforce recipes → `atomic-salesforce-recipes/`
   - Atomic Stripe recipes → `atomic-stripe-recipes/`
   - Orchestrators → `orchestrator-recipes/`

---

### "Start Recipe" Button is Disabled

**Cause**: The recipe has validation errors or missing required configuration.

**Solution**:
1. Click **"Edit Recipe"** to open the recipe builder
2. Look for red error indicators on actions
3. Common issues:
   - Connection not selected
   - Required input field empty
   - Invalid formula or datapill reference
4. Fix errors, save, and exit
5. Try starting the recipe again

---

### API Endpoint Returns 401 Unauthorized

**Cause**: MCP token is missing, expired, or the MCP server wasn't created.

**Solution**:
1. Re-run `make setup-mcp-env` to refresh tokens in `app/.env`
2. Verify MCP servers exist: `wk mcp servers list`
3. If no servers exist, run `make setup-mcp` to create them

---

### Recipe Runs But Returns Empty Data

**Cause**: Salesforce seed data may not be imported, or query filters don't match test data.

**Solution**:
1. Verify Salesforce seed data is imported:
   ```bash
   bin/sf org open --target-org myDevOrg
   # Check: Hotel Rooms tab (should show 10 rooms)
   # Check: Bookings tab (should show sample bookings)
   # Check: Contacts tab (should show 24 contacts)
   ```
2. If data is missing, reimport seed data:
   ```bash
   cd salesforce
   ../bin/sf data import tree --plan data/data-plan.json --target-org myDevOrg
   ```
   Note: You may need to delete Account records first, if any have been imported.
---

### make workato-init Fails

**Cause**: wk CLI not authenticated or session expired.

**Solution**:
1. Verify authentication:
   ```bash
   wk auth status
   ```
2. Re-authenticate if needed:
   ```bash
   make workato-login
   ```
3. If authentication still fails, check that `WORKATO_API_TOKEN` in `.env` is correct and has the required permissions

---

## Next Steps

After completing Workato setup:

1. ✅ **Verify `app/.env`** — MCP URLs and tokens were written by `make setup-mcp`. Confirm `MCP_GUEST_MCP_URL` and `MCP_MANAGER_MCP_URL` are present.
2. ⚠️ **Configure SF API collection** — The hotel app needs `SALESFORCE_API_AUTH_TOKEN` and `SALESFORCE_API_COLLECTION_URL` in `app/.env` (not yet automated).
3. ✅ **Start development server** — Run `npm run dev`

---

## Additional Resources

- [Workato Developer Docs](https://docs.workato.com/developing-connectors.html)
- [Workato API Reference](https://docs.workato.com/oem/oem-api.html)
- [wk CLI Documentation](https://docs.workato.com/wk-cli.html)
- [Salesforce Setup Guide](../../vendor/salesforce/docs/SALESFORCE_SETUP.md)
- [Project README](../../README.md)

---

## Workshop Facilitator Runlist

Quick checklist for workshop facilitators to verify before and during the session.

### Pre-Workshop (Facilitator)

1. **Provision sandboxes** — Each attendee (or pair) needs a Workato trial sandbox with API Platform access.
2. **Generate API tokens** — Create a `WORKATO_API_TOKEN` for each sandbox (Settings → API Keys & Clients). Distribute to attendees.
3. **Salesforce + Stripe pre-reqs** — Ensure SF org is deployed with custom objects and seed data, and attendees have Stripe test-mode keys.

### Attendee Setup Flow

| Step | Command | Manual? | Notes |
|------|---------|---------|-------|
| 1 | `brew install workato/tap/wk` | — | `scoop install wk` on Windows |
| 2 | Paste token in `.env` | ✋ | `WORKATO_API_TOKEN=wrkatrial-...` |
| 3 | `make workato-login` | — | Creates keychain profile `workshop` |
| 4 | `make workato-init` | — | Initializes project scaffold |
| 5 | `make push` | — | Deploys all recipes; lint warnings are OK |
| 6 | Activate connections in UI | ✋ | Salesforce (required) + Stripe (required for payments) |
| 7 | `make start-recipes` | — | First pass — most recipes start |
| 8 | Fix 4 caching recipes (if needed) | ✋ | See [Manual Recipe Activation](#manual-recipe-activation) |
| 9 | `make start-recipes` | — | Second pass to pick up stragglers (skip if Step 7 started all) |
| 10 | `make setup-api` | — | Creates API collections + endpoints |
| 11 | `make enable-api-endpoints` | — | Activates all endpoints |
| 12 | `make setup-mcp` | — | Creates MCP servers, writes tokens to `app/.env` |

### Key Things to Know

1. **wk CLI installation** — `brew install workato/tap/wk` (macOS/Linux) or `scoop install wk` (Windows). No Python, no npm. Single Go binary.
2. **Token-based auth** — Attendees paste `WORKATO_API_TOKEN` in `.env`, then `make workato-login` creates a non-interactive keychain profile. No browser-based OAuth needed.
3. **Push tolerates lint warnings** — `wk push` returns exit code 2 for lint warnings. The Makefile handles this gracefully; warnings do not block the push.
4. **Connection activation is a manual gate** — No recipe or endpoint can run until connections are activated in the Workato UI. This must happen before `make start-recipes`.
5. **Caching issue (4 recipes)** — Some recipes using dynamic SOQL may fail to start on first attempt. Opening the recipe's Connections tab in the UI and re-selecting the Salesforce connection fixes it. This is intermittent — it may not happen on every sandbox.
6. **Endpoint enablement requires running recipes** — `make enable-api-endpoints` will fail for any endpoint whose backing recipe is not running. Fix the recipe first, then re-run.
7. **MCP tokens are stable** — `make setup-mcp-env` reads existing tokens via `wk mcp servers get`. It does not rotate tokens, so it's safe to re-run.
8. **Windows parity** — All Make targets work on Windows. PowerShell equivalents exist for scripts in `vendor/workato/scripts/cli/`. Use `scoop` instead of `brew` for wk installation.
9. **TODO: SF API collection token** — The hotel app also needs `SALESFORCE_API_AUTH_TOKEN` and `SALESFORCE_API_COLLECTION_URL` in `app/.env`. These are not yet automated and must be configured manually.
10. **Verify everything works** — After setup, `curl` the MCP URL with `{"jsonrpc":"2.0","id":1,"method":"tools/list"}` — you should see 7 guest tools and 10 manager tools.
