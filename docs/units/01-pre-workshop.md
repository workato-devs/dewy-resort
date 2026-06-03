---
layout: default
title: Pre-Workshop Setup
nav_order: 1
parent: Workshop Units
---

# Pre-Workshop Setup

**Complete these steps 2-3 days before the workshop.**

---

## Required Account Signups

### 1. Workato Developer Edition
- **URL:** [workato.com/sandbox](https://workato.com/sandbox)
- **Cost:** Free
- **Approval Time:** 24-48 hours
- **Required Permissions:** Full workspace access

### 2. Salesforce Developer Edition
- **URL:** [developer.salesforce.com/signup](https://developer.salesforce.com/signup)
- **Cost:** Free
- **Approval Time:** Instant
- **Action:** Verify you can log in before workshop day
- **Important:** Note your username (e.g., `yourname@yourcompany.com.devorg`) — you'll need it for CLI authentication

### 3. Stripe Developer Account (Highly Recommended)
- **URL:** [dashboard.stripe.com/register](https://dashboard.stripe.com/register)
- **Cost:** Free
- **Purpose:** Payment processing features (checkout, refunds)
- **Why it matters:** Without Stripe, payment-related recipes won't function and you'll miss key parts of the workshop experience
- **Important Setup Steps:**
  1. For new accounts, Stripe's onboarding asks you to register a business
  2. Click **"Skip for now"** (twice)
  3. Choose the **"Sandbox"** option
  4. **Never use a Live Stripe account** for the workshop

### 4. Email Account with Alias Support
- **Purpose:** You'll create separate Guest and Manager accounts using email aliases (e.g., `yourname+guest@gmail.com`, `yourname+manager@gmail.com`)
- **Gmail** works out of the box — the `+` suffix routes to your main inbox
- **Outlook/Hotmail** also supports `+` aliases
- **Action:** Verify alias delivery works by sending yourself a test email to `yourname+test@yourdomain.com` before workshop day

---

## Local Environment Requirements

### Required Software

| Software | Minimum Version | Check Command | Install |
|----------|-----------------|---------------|---------|
| [Homebrew](https://brew.sh) (macOS/Linux) | Any | `brew --version` | `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"` |
| [Scoop](https://scoop.sh) (Windows) | Any | `scoop --version` | `irm get.scoop.sh \| iex` |
| Node.js | 20.x (LTS) | `node --version` | See platform-specific instructions below |
| Git | Any recent | `git --version` | |
| make | Any | `make --version` | |
| Workato CLI (`wk`) | Any | `wk version` | See below |

### Install the Workato CLI

The `wk` CLI must be installed before the workshop. The setup script will check for it but **cannot install it automatically**.

#### macOS / Linux

```bash
brew install workato-devs/tap/wk
```

#### Windows

```powershell
scoop bucket add workato-devs https://github.com/workato-devs/scoop-bucket
scoop install wk
```

Verify it's installed: `wk version`

### Install Node.js

#### macOS / Linux

```bash
brew install node@20
```

#### Windows

{: .warning }
> **Windows users: install Node.js 20 specifically.** Scoop's default `nodejs` (v26) and `nodejs-lts` (v24) packages are too new — native modules like `bcrypt` and `better-sqlite3` don't ship prebuilt Windows binaries for these versions, and compilation requires Visual Studio Build Tools. Node 20 has prebuilt binaries that work out of the box.

```powershell
scoop bucket add versions
scoop install versions/nodejs20
```

If you have other Node versions installed via Scoop, make Node 20 the active version:

```powershell
scoop reset nodejs20
```

Verify: `node --version` should show `v20.x.x`

#### Windows: Native Module Build Dependencies (Optional)

If you need Node 22+ on Windows, you must install the native build toolchain:

```powershell
scoop install python
scoop install extras/vcredist2022
```

Then install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the **"Desktop development with C++"** workload. Without these, `npm install` will silently fail on native modules (`bcrypt`, `better-sqlite3`).

### Recommended
- VS Code or preferred IDE
- Terminal access (iTerm2, Terminal.app, Windows Terminal)


---

## Optional (Enhanced Experience)

### MCP Desktop Client

Another way to test MCP functionality is with a desktop client that connects directly to your MCP servers:

- **Claude Desktop:** [claude.ai/download](https://claude.ai/download) (requires Claude Pro)
- **ChatGPT Desktop:** [openai.com/chatgpt/desktop](https://openai.com/chatgpt/desktop) (requires ChatGPT Plus)

Configuration instructions are provided in Unit 1 as an alternative way to test your MCP servers.

---

## Testing Multiple Personas with Gmail Aliases

The Dewy Hotel app provides both manager and guest login experiences. To test both personas using a single Gmail account, use the `+` alias feature:

| Persona | Email Format | Example |
|---------|-------------|---------|
| Guest | `yourname+guest@gmail.com` | `john.doe+guest@gmail.com` |
| Manager | `yourname+manager@gmail.com` | `john.doe+manager@gmail.com` |

All emails go to your main inbox. Register each alias as a separate contact in Salesforce with the appropriate contact type (Guest or Manager).

---

<div class="facilitator-only" markdown="1">

## Pre-Workshop Email Template

*Send 1 week before the workshop:*

```
Subject: MCP Workshop - Setup Checklist (Action Required)

Hi [Name],

Please complete these steps before the workshop on [Date]:

1. Sign up for Workato Developer Edition
   https://workato.com/sandbox
   Note: Approval may take 24-48 hours

2. Sign up for Salesforce Developer Edition
   https://developer.salesforce.com/signup
   Note: Instant approval, but verify you can log in

3. Sign up for Stripe Developer Account (Highly Recommended)
   https://dashboard.stripe.com/register
   Note: Skip business registration, choose Sandbox mode

4. Verify your email supports aliases:
   - Send a test email to yourname+test@gmail.com
   - You'll use +guest and +manager aliases during the workshop

5. Install the Workato CLI:
   - macOS/Linux: brew install workato-devs/tap/wk
   - Windows: scoop install wk
   - Verify: wk version

6. Verify your local environment:
   - Node.js 20+: `node --version`
   - Git: `git --version`

7. Ensure you have an IDE installed:
   - Recommended: VS Code (https://code.visualstudio.com)
   - Any code editor that supports TypeScript will work

If you encounter any issues, reply to this email and we'll help troubleshoot before the workshop.

See you there!
```

</div>

---

## Day-Before Checklist

- [ ] Workato Developer Edition approved and accessible
- [ ] Salesforce Developer Edition login working (note your username!)
- [ ] Stripe Developer Account created (Sandbox mode)
- [ ] Email alias delivery verified (e.g., `yourname+test@gmail.com`)
- [ ] Homebrew (macOS/Linux) or Scoop (Windows) installed
- [ ] Workato CLI installed (`wk version`)
- [ ] Node.js 20+ installed (`node --version`) — Windows: must be v20.x specifically
- [ ] Git installed (`git --version`)
- [ ] make installed (`make --version`)
- [ ] IDE installed (VS Code recommended)
- [ ] Laptop charged / power adapter packed
