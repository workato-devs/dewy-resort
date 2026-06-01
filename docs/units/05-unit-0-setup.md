---
layout: default
title: "Unit 0: Environment Setup"
nav_order: 4
parent: Workshop Units
---

# Unit 0: Environment Setup

**Hands-On Session (45 minutes)**

---

## Learning Objectives

- Successfully deploy Salesforce metadata and seed data
- Configure Workato connection and start recipes
- Verify end-to-end connectivity
- Troubleshoot common setup issues

---

## Step 1: Run the Setup Script (15 min)

Copy and paste the appropriate command for your operating system. The script clones the repository, checks for required prerequisites (Git, Node.js, make), installs any that are missing, and sets up the Salesforce CLI.

### 1.1 Run relevant setup script for your machine

#### Mac/Linux

```bash
curl -fsSL https://raw.githubusercontent.com/workato-devs/dewy-resort/main/bootstrap.sh | bash
```

#### Windows

```powershell
powershell -ExecutionPolicy Bypass -Command "Invoke-Expression (curl https://raw.githubusercontent.com/workato-devs/dewy-resort/main/bootstrap.ps1 -UseBasicParsing)"
```

Once the script completes, change into the project directory:

```bash
cd dewy-resort
```

Watch for any errors and flag a facilitator or assistant for help.

### 1.2 Verify CLIs

```bash
make status
```

This checks that the Workato CLI (`wk`) and Salesforce CLI (`sf`) are both installed and shows their authentication status.

> **If `wk` is not found:** Install it now — `brew install workato-devs/tap/wk` (macOS/Linux) or `scoop install wk` (Windows).

**CHECKPOINT:** `make status` shows both CLIs installed

### 1.3 Create an .env file

The project includes a `.env.example` file in the root directory with placeholder values for all required environment variables. Copy this file into the `app/` directory and save it as `.env`:

#### Mac/Linux

```bash
cp .env.example app/.env
```

#### Windows

```powershell
$copyParams = @{
    Path        = ".env.example"
    Destination = "app\.env"
}
Copy-Item @copyParams
```

> **Important:** This `.env` file will be used throughout the workshop. Future setup steps will have you update its values as you configure each service.

### 1.4 Initialize Local Database

```bash
cd app
npm install
npm run db:setup
```

**Expected Output:**

```
Database initialized successfully
Tables created: users, conversations, messages, devices...
```
Navigate back to the `dewy-resort` folder:

```bash
cd ..
```
**CHECKPOINT:** `app/.env` file exists with placeholder values

---

## Step 2: Initialize CLIs & Deploy Salesforce Metadata (10 min)

### 2.1 Verify CLIs

From the `dewy-resort` directory, verify that both CLIs are available:

```bash
make setup
```

This checks for the Workato CLI (`wk`) and installs the Salesforce CLI (`sf`) if needed.

### 2.2 Authenticate to Salesforce

```bash
sf org login web --alias myDevOrg
```

A browser window will open. Log in to your Salesforce Developer Edition org.

> **Tip:** If you have multiple Salesforce accounts, make sure to use the correct username for your **Developer Edition** org (the one you noted during pre-workshop setup).

### 2.3 Deploy Metadata + Seed Data

```bash
make sf-deploy org=myDevOrg
```

**Expected Output:**
```
Deploying Salesforce metadata to myDevOrg...
[x] Deployed 4 custom objects
[x] Deployed Lightning application
[x] Assigned permission set
[x] Imported seed data (23 accounts, 24 contacts, 10 rooms)
```

### 2.4 Verify in Salesforce

```bash
sf org open --target-org myDevOrg
```

1. Click App Launcher (9 dots, top left)
2. Search for "Dewy Hotel Management"
3. Click **Hotel Rooms** tab
4. Verify room records appear

> **If the list appears empty:** Don't worry—Salesforce defaults to "Recently Viewed" which only shows records you've opened. The data is there. Use the list view search box or global search and type **"Oceanview"** to confirm hotel room records exist.

**CHECKPOINT:** Hotel room records visible in Salesforce

---

## Step 3: Configure Workato (10 min)

### 3.1 Get Workato API Token

1. Log in to your Workato Developer Edition
2. Go to **Workspace Admin -> API Clients -> Client roles** [https://app.trial.workato.com/members/api/clients]
3. Click **Create Client Role** tab
4. Set permissions:
   - Projects tab -> Project Assets — select: Projects & folders, Connections, Recipes, Skills, MCP servers, Recipe Versions, Jobs
   - Projects tab -> Recipe Lifecycle Management — select: Recipe lifecycle management, Export manifests
   - Tools tab -> Workspace data — select: Environment properties
   - Tools tab -> API Platform — select: API portal, Collections & endpoints, Clients & access profiles
   - Admin tab -> Workspace Details — select: Workspace details
   - Admin tab -> Developer API clients — select: API Clients, API client roles
5. Click **Save Changes**
6. Click **API Clients** tab [https://app.trial.workato.com/members/api/roles]
7. Click **Create API Client** button
8. Enter "My CLI Client" in the Name field
9. Select "New client role" from the Client Role dropdown
10. Select "All Projects" in the Project Access drop-down menu
11. Click **Create Client**
12. **Copy the token** (you won't see it again)

### 3.2 Add Token to Environment

Edit the `.env` file in the **project root** (not `app/.env`):

```bash
WORKATO_API_TOKEN=your_token_here
```

### 3.3 Authenticate and Deploy Recipes

```bash
make workato-login
```

This reads the token from `.env` and creates an authenticated CLI profile. Verify with `wk auth status`.

Next, initialize the local project and push all recipes to your workspace:

```bash
make workato-init
make push
```

**Expected output:** A list of `.recipe.json` files with `created` status. Lint warnings are expected and will not block the push.

### 3.4 Configure Salesforce Connector in Workato

1. Go to **Projects → Workspace Connections**
2. Click the **Salesforce** connection
3. Click **Connect**
4. Authenticate to your Salesforce Developer Edition org
5. **WARNING: DO NOT rename the connection**

### 3.5 Manual Activation (If Needed)

Some recipes with dynamic SOQL queries may fail to start because their Salesforce connection isn't automatically linked. **If all your recipes started successfully in Step 3.7, skip to [Step 3.8](#38-set-up-api-platform).**

The recipes that may need manual activation:

1. `Search bookings by room and dates`
2. `Search room by number`
3. `Search rooms on behalf of staff`
4. `Search rooms on behalf of guest`

For **each** affected recipe:

1. Navigate to the recipe in Workato (under **orchestrator-recipes** or **atomic-salesforce-recipes**)
2. Click the recipe name to open its detail page
3. Click the **Connections** tab (between "Jobs" and "Versions")
4. In the left panel, you'll see **"Salesforce connection"** with a red **"Requires connection"** warning
5. In the main panel under "Showing active connections", click your Salesforce connection
6. A green **"Connection updated successfully"** banner confirms it worked

Once all 4 are linked, run `make start-recipes` again to pick up the stragglers.

### 3.6 Configure Stripe Connection (Optional)

1. Go to **Projects → Workspace Connections**
2. Click the **Stripe** connection
3. Click **Connect**
4. Select **API key** as the authentication type
5. **Get your Stripe Secret API Key:**
   - Open the [Stripe Dashboard](https://dashboard.stripe.com/) in a new tab
   - Stripe is in **Test mode** by default when you don't fill out a profile. You must be in **Sandbox mode**:
     - Click your account drop-down menu (upper left)
     - Select **"Switch to Sandbox"** → choose your sandbox environment
     - Close any pop-ups
   - Click the **"Developers"** toolbar (bottom of page)
   - Select **"API keys"**
   - Under "Standard keys", find the **Secret key**
   - Click **Reveal test key** to show the full key
   - Copy the key (starts with `sk_test_`)
6. **Paste the Secret API Key** into Workato's connection field
7. Click **Connect** to complete authentication
8. **WARNING: DO NOT rename the connection**

{: .warning }
> Always use **test mode** keys for workshop environments. Never use live/production keys (`sk_live_`).

### 3.7 Start Recipes

```bash
make start-recipes
```

If all recipes start successfully, skip ahead to [Step 3.8](#38-set-up-api-platform). If some recipes fail to start, follow [Step 3.5](#35-manual-activation-if-needed) to link their connections, then run `make start-recipes` again.

**NOTE:** If you did not set up or activate Stripe, some Stripe recipes will fail to start — that's expected.

**CHECKPOINT:** All Salesforce recipes showing "Running" status

### 3.8 Set Up API Platform

```bash
make setup-api
```

This creates two API collections (`dewy-resort-guest` and `dewy-resort-manager`), their endpoints, and an API client with credentials written to `app/.env`.

### 3.9 Enable API Endpoints

```bash
make enable-api-endpoints
```

This activates all API endpoints so they can receive traffic. All recipes must be running first.

### 3.10 Set Up MCP Servers

```bash
make setup-mcp
```

This creates two MCP servers (`dewy-resort-guest` and `dewy-resort-manager`) and writes the MCP URLs and tokens to `app/.env`.

**CHECKPOINT:** API endpoints enabled, MCP servers created, `app/.env` populated with URLs and tokens

---

## Step 4: Verify End-to-End (5 min)

### 4.1 Start the Application

```bash
app/scripts/dev-tools/server.sh start
```

### 4.2 Verify the Dashboard

1. Open [http://localhost:3000](http://localhost:3000){:target="_blank"}
2. All indicators should show **Mock Mode enabled**

---

## Setup Complete!

You now have:
- Salesforce org with hotel data model
- Workato workspace with all recipes running
- API collections and MCP servers configured
- Local application connected to all services

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `wk` not found | Install: `brew install workato-devs/tap/wk` (macOS/Linux) or `scoop install wk` (Windows) |
| `wk auth` fails | Re-run `make workato-login`, check token in root `.env` |
| Salesforce login timeout | Re-run `sf org login web --alias myDevOrg` |
| Recipes won't start | Manual activation (Step 3.5), then re-run `make start-recipes` |
| "Connection not configured" | Verify Workspace Connections authenticated |
| API Collection 401 | Check WORKATO_API_TOKEN in `.env` |
| Room search returns empty | Verify SF seed data imported |
| API call fails silently | Check **Tools → Logs** in Workato for error details |
| Recipe returns error | Expand the job in Logs to see error message and code |
| `wk` CLI command errors | Ensure API client scopes match guidance in Step 3.1 |

---

<div class="facilitator-only" markdown="1">

## Facilitator Notes

**Support Ratio:** 1 facilitator per 8-10 attendees for this unit

**Time Buffer:** This unit often runs 5-10 minutes over. Build buffer into break if needed.

**Fallback:** If attendee can't complete setup, pair them with someone who did for remaining units.

</div>
