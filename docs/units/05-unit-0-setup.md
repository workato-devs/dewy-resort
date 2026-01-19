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

## Pre-Requisites Check (5 min)

**Run these checks before proceeding:**

```bash
node --version     # Should be 20+
git --version      # Any recent version
python3 --version  # Should be 3.11+
```

**If any check fails:** See [Pre-Workshop Setup](01-pre-workshop.html) for installation instructions.

---

## Step 1: Clone and Initial Setup (10 min)

### 1.1 Clone the Repository

```bash
git clone https://github.com/workato-devs/dewy-resort.git
cd dewy-resort
```

### 1.2 Copy Environment Template

```bash
cd app
cp .env.example .env
```

### 1.3 Install Node Dependencies

```bash
npm install
```

### 1.4 Initialize and Seed Local Database

```bash
npm run db:init
npm run db:seed
```

**Expected Output:**
```
Database initialized successfully
Tables created: users, conversations, messages, devices...
```

### 1.5 Return to Parent Directory

```bash
cd ..
```

**CHECKPOINT:** Database initialized message appears

---

## Step 2: Install CLIs (10 min)

### 2.1 Install Both Salesforce and Workato CLIs

```bash
make setup
```

**Expected Output:**
```
Setting up all vendor CLIs...
[x] Installed Salesforce CLI to bin/sf
[x] Installed Workato CLI to bin/workato
```

### Troubleshooting: Python Issues

If Workato CLI fails with Python errors:

```bash
# Check Python version
python3 --version

# If Python 3.11 not found, install via Homebrew
brew install python@3.11

# Retry Workato setup only
make setup tool=workato
```

### Troubleshooting: Permission Issues

```bash
# If "permission denied" on bin/workato or bin/sf
chmod +x bin/workato bin/sf
```

**CHECKPOINT:** Both `bin/sf --version` and `bin/workato --version` return version info

---

## Step 3: Deploy Salesforce Metadata (10 min)

### 3.1 Authenticate to Salesforce

```bash
bin/sf org login web --alias myDevOrg
```

A browser window will open. Log in to your Salesforce Developer Edition org.

> **Tip:** If you have multiple Salesforce accounts, make sure to use the correct username for your Developer Edition org (the one you noted during pre-workshop setup).

### 3.2 Deploy Metadata + Seed Data

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

### 3.3 Verify in Salesforce

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

## Step 4: Configure Workato (10 min)

### 4.1 Get Workato API Token

1. Log in to your Workato Developer Edition
2. Go to **Workspace Admin → Settings → API Keys & Clients**
3. Click **Create API Key**
4. Set permissions:
   - Projects -> Project Assets (all)
   - Projects -> Recipe Lifecycle Management (all)
   - Tools -> API Platform (all except OpenAPI)
   - Admin -> Workspace Details (all)
5. **Copy the token** (you won't see it again)

### 4.2 Add Token to Environment

Edit `app/.env` file:

```bash
WORKATO_API_TOKEN=your_token_here
```

### 4.3 Deploy Recipes

```bash
make workato-init
```

### 4.4 Configure Salesforce Connector in Workato

1. Go to **Projects → Workspace Connections**
2. Click the **Salesforce** connection
3. Click **Connect**
4. Authenticate to your Salesforce Developer Edition org
5. **WARNING: DO NOT rename the connection**

### 4.5 Manual Activation (Required)

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

### 4.6 Configure Stripe Connection (Optional)

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

### 4.7 Start Recipes

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

### 4.8 Enable API Endpoints

```bash
make enable-api-endpoints
```

This enables the endpoints on all API collections in your Workato account.

### 4.9 Create API Client

```bash
make create-api-client
```

This creates an API Client for the Salesforce API Collection.

**CHECKPOINT:** API endpoints enabled and client created

---

## Step 5: Verify End-to-End (5 min)

### 5.1 Start the Application

```bash
app/scripts/dev-tools/server.sh start
```

### 5.2 Verify the Dashboard

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
| Recipes won't start | Manual activation (Step 4.7) |
| "Connection not configured" | Verify Workspace Connections authenticated |
| API Collection 401 | Check WORKATO_API_TOKEN in .env |
| Room search returns empty | Verify SF seed data imported |
| API call fails silently | Check **Tools → Logs** in Workato for error details |
| Recipe returns error | Expand the job in Logs to see error message and code |

---

<div class="facilitator-only" markdown="1">

## Facilitator Notes

**Support Ratio:** 1 facilitator per 8-10 attendees for this unit

**Time Buffer:** This unit often runs 5-10 minutes over. Build buffer into break if needed.

**Fallback:** If attendee can't complete setup, pair them with someone who did for remaining units.

</div>
