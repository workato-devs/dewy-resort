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

Copy and paste the appropriate command for your operating system. The script clones the repository, checks for required prerequisites, installs any that are missing, sets up the local application, and installs the Salesforce and Workato CLIs.

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

**CHECKPOINT:** `make status` shows all prerequisites and CLIs installed

---

## Step 2: Initialize App & Deploy Salesforce Metadata (10 min)

### 2.1 Initialize Local Database

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

```bash
cd ..
```

### 2.2 Authenticate to Salesforce

```bash
bin/sf org login web --alias myDevOrg
```

A browser window will open. Log in to your Salesforce Developer Edition org.

> **Tip:** If you have multiple Salesforce accounts, make sure to use the correct username for your Developer Edition org (the one you noted during pre-workshop setup).

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
bin/sf org open --target-org myDevOrg
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
8. Enter "Dewy Resort App" in the Name field
9. Select "New client role" from the Client Role dropdown
10. Select "All Projects" in the Project Access drop-down menu
11. Click **Create Client**
12. **Copy the token** (you won't see it again)

### 3.2 Add Token to Environment

Edit `app/.env` file:

```bash
WORKATO_API_TOKEN=your_token_here
```

### 3.3 Deploy Recipes

```bash
make workato-init
```

### 3.4 Configure Salesforce Connector in Workato

1. Go to **Projects → Workspace Connections**
2. Click the **Salesforce** connection
3. Click **Connect**
4. Authenticate to your Salesforce Developer Edition org
5. **WARNING: DO NOT rename the connection**

### 3.5 Manual Activation (Required)

Four recipes need manual activation due to SOQL metadata caching:

1. Open Workato → **Projects → orchestrator-recipes**
2. In the recipe search box, type **"search"** to filter the list
3. Find and activate each of these recipes:
   - `Search cases on behalf of guest`
   - `Search cases on behalf of staff`
   - `Search rooms on behalf of guest`
   - `Search rooms on behalf of staff`
4. For each recipe:
   - Click the recipe name
   - Click **Edit Recipe**
   - Click the Salesforce action step
   - Click the **Edit** button to the right of "Connect to Salesforce"
   - Re-select the Salesforce connection **"SF Dev Account"**
   - Click **Save**
   - Click **Exit**

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

**Expected Output:**
```
========================================
Summary
========================================
Total recipes: <count>
Started: <count>
Already running: 0
Failed: 0
```

All recipes should show as started with 0 failed.

**NOTE** If you did not setup or activate Stripe, some recipes will fail to start

**CHECKPOINT:** All Salesforce recipes showing "Running" status

### 3.8 Enable API Endpoints

```bash
make enable-api-endpoints
```

This enables the endpoints on all API collections in your Workato account.

### 3.9 Create API Client

```bash
make create-api-client
```

This creates an API Client for the Salesforce API Collection.

**CHECKPOINT:** API endpoints enabled and client created

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
- Local application connected to both

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Python version mismatch | Run `brew install python@3.11` |
| Salesforce login timeout | Re-run `bin/sf org login web --alias myDevOrg` |
| Recipes won't start | Manual activation (Step 3.7) |
| "Connection not configured" | Verify Workspace Connections authenticated |
| API Collection 401 | Check WORKATO_API_TOKEN in .env |
| Room search returns empty | Verify SF seed data imported |
| API call fails silently | Check **Tools → Logs** in Workato for error details |
| Recipe returns error | Expand the job in Logs to see error message and code |
| Workato CLI command errors | Ensure API client scopes match guidance in Step 3.1 |

### Manual Verification Script

Run this script to quickly check your environment (Mac/Linux):

```bash
#!/bin/bash
echo "=== Pre-Workshop Environment Check ==="

# Node.js
echo -n "Node.js: "
node --version 2>/dev/null || echo "NOT INSTALLED"

# Python
echo -n "Python: "
python3 --version 2>/dev/null || echo "NOT INSTALLED"

# Git
echo -n "Git: "
git --version 2>/dev/null || echo "NOT INSTALLED"

# Network (can reach Workato)
echo -n "Network (Workato): "
curl -s -o /dev/null -w "%{http_code}" https://app.trial.workato.com/users/sign_in_trial | grep -q "200" && echo "OK" || echo "BLOCKED"

# Network (can reach Salesforce)
echo -n "Network (Salesforce): "
curl -s -o /dev/null -w "%{http_code}" https://login.salesforce.com | grep -q "200" && echo "OK" || echo "BLOCKED"

echo "=== Check Complete ==="
```

---

<div class="facilitator-only" markdown="1">

## Facilitator Notes

**Support Ratio:** 1 facilitator per 8-10 attendees for this unit

**Time Buffer:** This unit often runs 5-10 minutes over. Build buffer into break if needed.

**Fallback:** If attendee can't complete setup, pair them with someone who did for remaining units.

</div>
