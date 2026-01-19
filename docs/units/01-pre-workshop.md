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

---

## Local Environment Requirements

### Required Software

| Software | Minimum Version | Check Command |
|----------|-----------------|---------------|
| Node.js | 20+ | `node --version` |
| Git | Any recent | `git --version` |
| Python | 3.11+ | `python3 --version` |

### Recommended
- VS Code or preferred IDE
- Terminal access (iTerm2, Terminal.app, Windows Terminal)

---

## Optional (Enhanced Experience)

### MCP Desktop Client (Backup Testing Option)

If the LLM setup in the hotel app has issues, you can test your MCP servers directly using a desktop client:

- **Claude Desktop:** [claude.ai/download](https://claude.ai/download) (requires Claude Pro)
- **ChatGPT Desktop:** [openai.com/chatgpt/desktop](https://openai.com/chatgpt/desktop) (requires ChatGPT Plus)

Configuration instructions are provided in Unit 1 after you create your MCP servers.

---

## Testing Multiple Personas with Gmail Aliases

To test both guest and manager personas using a single Gmail account, use the `+` alias feature:

| Persona | Email Format | Example |
|---------|-------------|---------|
| Guest | `yourname+guest@gmail.com` | `john.doe+guest@gmail.com` |
| Manager | `yourname+manager@gmail.com` | `john.doe+manager@gmail.com` |

All emails go to your main inbox. Register each alias as a separate contact in Salesforce with the appropriate contact type (Guest or Manager).

---

## Pre-Workshop Verification Script

Run this script to verify your environment:

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

4. Verify your local environment:
   - Node.js 20+: `node --version`
   - Git: `git --version`
   - Python 3.11+: `python3 --version`

5. Ensure you have an IDE installed:
   - Recommended: VS Code (https://code.visualstudio.com)
   - Any code editor that supports TypeScript will work

If you encounter any issues, reply to this email and we'll help troubleshoot before the workshop.

See you there!
```

</div>

---

## Troubleshooting Common Pre-Workshop Issues

### Python Version Issues

**Problem:** `python3 --version` shows version < 3.11

**Solution using pyenv:**
```bash
# Install pyenv
curl https://pyenv.run | bash

# Add to shell profile (~/.zshrc or ~/.bashrc)
export PATH="$HOME/.pyenv/bin:$PATH"
eval "$(pyenv init -)"

# Restart shell, then install Python 3.11
pyenv install 3.11.14
pyenv local 3.11.14
```

### Node.js Version Issues

**Problem:** `node --version` shows version < 20

**Solution using nvm:**
```bash
# Install nvm (if not installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart shell, then install Node 20
nvm install 20
nvm use 20
```

### Network/Firewall Issues

**Problem:** Curl tests return "BLOCKED"

**Solutions:**
1. Check corporate VPN settings
2. Try from personal network/hotspot
3. Contact IT to whitelist: `app.trial.workato.com`, `login.salesforce.com`

---

## Day-Before Checklist

- [ ] Workato Developer Edition approved and accessible
- [ ] Salesforce Developer Edition login working (note your username!)
- [ ] Stripe Developer Account created (Sandbox mode)
- [ ] Gmail aliases created for testing (e.g., `yourname+guest@gmail.com`, `yourname+manager@gmail.com`)
- [ ] Node.js 20+ installed and verified
- [ ] Python 3.11+ installed and verified
- [ ] Git installed
- [ ] IDE installed (VS Code recommended)
- [ ] Laptop charged / power adapter packed
