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

#### 1. **Atomic Salesforce Recipes** (`workato/atomic-salesforce-recipes/`) - Atomic Skills

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

#### 2. **Atomic Stripe Recipes** (`workato/atomic-stripe-recipes/`) - Optional Atomic Skills

Low-level payment operations for AI agent composition:

- `create_stripe_customer.recipe.json` - Create customer in Stripe
- `create_stripe_payment_intent.recipe.json` - Initialize payment
- `confirm_stripe_payment.recipe.json` - Complete payment
- `retrieve_stripe_payment_status.recipe.json` - Check payment status
- `stripe_payment_status.recipe.json` - Get payment details
- `create_stripe_refund.recipe.json` - Process refunds

**Total: 6 atomic Stripe recipes (MCP atomic skills)**

#### 3. **Orchestrator Recipes** (`workato/orchestrator-recipes/`) - High-level Workflows

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

1. ✅ **Salesforce Setup** - Custom objects must be deployed first
   - See [SALESFORCE_SETUP.md](./SALESFORCE_SETUP.md)
   - Verify objects exist: `Booking__c`, `Hotel_Room__c`, `Payment_Transaction__c`, `SMS_Notification__c`

2. ✅ **Workato Account** - Trial or paid account
   - Sign up at https://www.workato.com/trial

3. ✅ **Workato CLI Installed**
   - Run `make setup tool=workato` to install

4. ✅ **Environment Variables Configured**
   ```bash
   WORKATO_API_TOKEN=your_api_token_here
   WORKATO_API_EMAIL=your_email@example.com
   ```

5. ⚠️ **Optional: Stripe Account** (if using payment features)
   - Test account at https://dashboard.stripe.com/register

6. ⚠️ **Optional: Twilio Account** (SMS recipes not yet released)
   - Sign up at https://www.twilio.com/try-twilio

---

## Installation Steps

### Step 1: Install Workato CLI

```bash
# Install Workato CLI (if not already installed)
make setup tool=workato

# Verify installation
make status tool=workato
```

You should see the Workato CLI version and authentication status.

### Step 2: Configure Workato API Token

1. Log in to your Workato account: https://app.trial.workato.com (if using a Developer sandbox--recommended)
2. Navigate to **Settings** → **API Keys & Clients**
3. Create a new API key with these permissions:
   - **Projects** → **Project Assets** :
      - Projects & folders, Connections, Recipes, Recipe Versions (select all)
   - **Projects** → **Recipe Lifecycle Management**:
      - Recipe lifecycle management, Export manifests (select all)
   - **Tools** → **API Platform**:
      - Collections & endpoints (select everything except 2 OpenAPI-related perms)
   - **Admin** → **Workspace Details**:
      - Workspace details (select all)
4. Save changes
5. Copy the API token
6. Add to your `.env` file:

```bash
WORKATO_API_TOKEN=your_api_token_here
WORKATO_API_EMAIL=your_email@example.com
```

### Step 3: Deploy All Recipes

This command initializes Workato folders/projects and deploys all recipes:

```bash
make workato-init
```

**What this does:**
- Creates project folders in Workato
- Pushes all 33 recipes (15 Salesforce + 6 Stripe + 12 orchestrators)
- Creates connection definitions in `Workspace-Connections` folder

**Expected output:**
```
Initializing Workato projects...
✓ Created project: atomic-salesforce-recipes
✓ Created project: atomic-stripe-recipes
✓ Created project: orchestrator-recipes
✓ Created project: Workspace-Connections
✓ Pushed 33 recipes successfully
```

### Step 4: Configure Connections in Workato UI

After deploying recipes, you must authenticate each connection in the Workato UI.

1. **Log in to Workato**: https://app.trial.workato.com (if using Dev Sandbox--recommended)
2. **Navigate to Projects** → **Workspace-Connections**
3. **Authenticate each connection:**

#### Salesforce Connection (Required)

1. Click on the **Salesforce** connection
2. Click **Connect** or **Authenticate**
3. Log in to your Salesforce org (the same org you deployed metadata to)
4. Authorize Workato to access your Salesforce org
5. **⚠️ CRITICAL**: Do NOT rename the connection - keep the default name

#### Stripe Connection (Optional)

1. Click on the **Stripe** connection
2. Click **Connect** or **Authenticate**
3. Select **API key** as the authentication type
4. **Get your Stripe Secret API Key:**
   - Open the [Stripe Dashboard](https://dashboard.stripe.com/) in a new tab
   - Ensure you're in **Test mode** (toggle in the top-right corner)
   - Navigate to **Developers** → **API keys**
   - Under "Standard keys", find the **Secret key**
   - Click **Reveal test key** to show the full key
   - Copy the key (starts with `sk_test_`)
5. **Paste the Secret API Key** into Workato's connection field
6. Click **Connect** to complete authentication
7. **⚠️ CRITICAL**: Do NOT rename the connection - keep the default name

**Note**: Always use **test mode** keys for workshop environments. Never use live/production keys (`sk_live_`) in development.

#### Twilio Connection (Optional)

1. Click on the **Twilio** connection
2. Click **Connect** or **Authenticate**
3. Enter your Twilio Account SID and Auth Token
4. **⚠️ CRITICAL**: Do NOT rename the connection

**Why connection names matter:**
Recipes reference connections by name. Renaming connections will break recipe execution and cause authentication errors.

### Step 5: Start Recipes (Automated)

After configuring connections, start all recipes using the automated script:

```bash
make start-recipes
```

**What this does:**
- Fetches all deployed recipes from Workato
- Sorts recipes by ID (ascending order)
- Starts each recipe sequentially
- Reports success/failure for each recipe

**Expected results:**
- If you configured **Salesforce only**: 4 Salesforce recipes remain inactive (manually activated), and all Stripe-dependent recipes inactive (11 total)
- If you configured **Salesforce + Stripe**: Just 4 Salesforce recipes (manually activated) remain inactive

**Sample output:**
```
========================================
Starting Workato Recipes
========================================

Found 33 recipes

Recipe ID: 12345 - Create booking orchestrator
  ✓ Started successfully

Recipe ID: 12346 - Search bookings by room and dates
  ✗ Failed to start: Connection not configured

...

========================================
Summary
========================================
Total recipes: 33
Started: 29
Already running: 0
Failed: 4

⚠️  Some recipes failed to start
```

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

These recipes require manual activation due to a **metadata caching issue** in Workato. When recipes with dynamic SOQL queries are deployed via the CLI, the Salesforce connection metadata may not be properly cached. Opening the recipe in the builder and re-selecting the connection refreshes the metadata cache, allowing the recipes to start successfully.

---

### Salesforce SOQL Recipe Activation Steps

**⚠️ You must repeat these steps for each of the 4 recipes listed above.**

#### Step-by-Step Instructions

For **each** of the 4 Salesforce SOQL recipes:

1. **Navigate to the recipe:**
   - Log in to Workato: https://app.trial.workato.com (if using Developer Sandbox -- recommended)
   - Go to **Projects** → **atomic-salesforce-recipes**
   - Find the recipe (e.g., "Search bookings by room and dates")

2. **Open the recipe editor:**
   - Click on the recipe name
   - Click **"Edit Recipe"** button (top right)
   - Wait for the recipe builder to load

3. **Configure the Salesforce action:**
   - In the recipe canvas, locate the **Salesforce** action (usually the second step)
   - Click on the action to select it
   - In the right-hand panel, click **"Edit"**
   - Select your **Salesforce connection** from the dropdown (e.g., "SF Dev Account" or your connection name)
   - Verify the SOQL query appears correctly
   - Click **"Done"** or **"Save"** in the action panel

4. **Save the recipe:**
   - Click **"Save"** in the top right of the recipe builder
   - Wait for the save confirmation
   - Click **"Exit"** to return to the recipe details page

5. **Start the recipe:**
   - On the recipe details page, click **"Start Recipe"** (top right)
   - Wait for confirmation that the recipe is running
   - Verify the status shows "Running"

6. **Repeat for remaining recipes:**
   - Return to **Projects** → **atomic-salesforce-recipes**
   - Repeat steps 1-5 for the next recipe

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
1. Verify Salesforce metadata is deployed (see [SALESFORCE_SETUP.md](./SALESFORCE_SETUP.md))
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

**Cause**: API token is missing, expired, or incorrect.

**Solution**:
1. Verify `WORKATO_API_AUTH_TOKEN` in `.env` matches your Workato API key
2. Check API key permissions in Workato:
   - Go to **Settings** → **API Keys & Clients**
   - Ensure "Execute recipes" permission is enabled
3. Regenerate API key if necessary

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

**Cause**: Workato API token not configured or expired.

**Solution**:
1. Check `.env` file has `WORKATO_API_TOKEN` set
2. Verify token is valid:
   ```bash
   make status tool=workato
   ```
3. If authentication still fails, check that you have granted all permissions to your API client in Workato settings

---

## Next Steps

After completing Workato setup:

1. ✅ **Configure hotel app** - Add Workato API Collection URL to `.env`
2. ✅ **Start development server** - Run `npm run dev`
3. ⚠️ **Optional: Configure Cognito** - See [COGNITO_SETUP.md](./COGNITO_SETUP.md) (for workshop convenience)
4. ⚠️ **Optional: Configure Bedrock AI** - See Bedrock documentation (future: bring your own API key)

---

## Additional Resources

- [Workato Developer Docs](https://docs.workato.com/developing-connectors.html)
- [Workato API Reference](https://docs.workato.com/oem/oem-api.html)
- [Workato CLI Guide](https://docs.workato.com/workato-cli.html)
- [Salesforce Setup Guide](./SALESFORCE_SETUP.md)
- [Project README](../README.md)
