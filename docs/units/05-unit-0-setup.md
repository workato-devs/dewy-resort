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
node --version     # Should be 18+
git --version      # Any recent version
python3 --version  # Should be 3.9+
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
cp .env.example .env
```

### 1.3 Install Node Dependencies

```bash
npm install
```

### 1.4 Initialize Local Database

```bash
npm run db:init
```

**Expected Output:**
```
Database initialized successfully
Tables created: users, conversations, messages, devices...
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

# If using pyenv, ensure correct version is active
pyenv local 3.11

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
4. Verify 10 rooms appear

**CHECKPOINT:** 10 hotel rooms visible in Salesforce

---

## Step 4: Configure Workato (10 min)

### 4.1 Get Workato API Token

1. Log in to your Workato Developer Edition
2. Go to **Settings -> API Keys & Clients**
3. Click **Create API Key**
4. Set permissions:
   - Projects -> Project Assets (all)
   - Projects -> Recipe Lifecycle Management (all)
   - Tools -> API Platform (all except OpenAPI)
   - Admin -> Workspace Details (all)
5. **Copy the token** (you won't see it again)

### 4.2 Add Token to Environment

Edit `.env` file:

```bash
WORKATO_API_TOKEN=your_token_here
WORKATO_API_EMAIL=your_email@example.com
```

### 4.3 Deploy Recipes

```bash
make workato-init
```

### 4.4 Start Recipes

```bash
make start-recipes
```

**Expected Output:**
```
Started: 29
Failed: 4 (these need manual activation)
```

### 4.5 Configure Salesforce Connection

1. Go to **Projects -> Workspace-Connections**
2. Click the **Salesforce** connection
3. Click **Connect**
4. Authenticate to your Salesforce Developer Edition org
5. **WARNING: DO NOT rename the connection**

### 4.6 Manual Activation (Required)

Four recipes need manual activation due to SOQL metadata caching:

1. Open Workato -> **Projects -> atomic-salesforce-recipes**
2. Find and activate each of these recipes:
   - `Search bookings by room and dates`
   - `Search room by number`
   - `Search on behalf of staff`
   - `Search on behalf of guest`
3. For each recipe:
   - Click the recipe name
   - Click **Edit Recipe**
   - Click the Salesforce action step
   - Re-select the Salesforce connection
   - Click **Save**
   - Click **Start Recipe**

**CHECKPOINT:** All 33 recipes showing "Running" status

---

## Step 5: Verify End-to-End (5 min)

### 5.1 Start the Application

```bash
npm run dev
```

### 5.2 Test the System

1. Open http://localhost:3000
2. Navigate to **Guest** interface
3. Type: "What rooms are available?"
4. Wait for response (may take 5-10 seconds first time)

**Expected:** Response listing available rooms with data from Salesforce

### 5.3 Verify in Workato

1. Open Workato -> **Tools -> Logs**
2. Find recent log entry (within last minute)
3. Verify it completed successfully

**CHECKPOINT:** Room availability response received with real data

---

## Setup Complete!

You now have:
- Salesforce org with hotel data model
- Workato workspace with 33 recipes
- Local application connected to both

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Python version mismatch | Use `pyenv local 3.11` |
| Salesforce login timeout | Re-run `bin/sf org login web --alias myDevOrg` |
| Recipes won't start | Manual activation (Step 4.6) |
| "Connection not configured" | Verify Workspace-Connections authenticated |
| API Collection 401 | Check WORKATO_API_TOKEN in .env |
| Room search returns empty | Verify SF seed data imported |

---

<div class="facilitator-only" markdown="1">

## Facilitator Notes

**Support Ratio:** 1 facilitator per 8-10 attendees for this unit

**Time Buffer:** This unit often runs 5-10 minutes over. Build buffer into break if needed.

**Fallback:** If attendee can't complete setup, pair them with someone who did for remaining units.

</div>
