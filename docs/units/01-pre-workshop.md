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

### Stripe Developer Account
- **URL:** [dashboard.stripe.com/register](https://dashboard.stripe.com/register)
- **Purpose:** Payment processing features in Unit 2
- **Note:** Workshop works without this; payment features will be mocked

### LLM API Key
- Anthropic or OpenAI API key
- **Purpose:** Testing MCP client interactions
- **Note:** Workshop provides test mode; API key enables live testing

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

3. Verify your local environment:
   - Node.js 20+: `node --version`
   - Git: `git --version`
   - Python 3.11+: `python3 --version`

4. Ensure you have an IDE installed:
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
- [ ] Salesforce Developer Edition login working
- [ ] Node.js 20+ installed and verified
- [ ] Python 3.11+ installed and verified
- [ ] Git installed
- [ ] IDE installed (VS Code recommended)
- [ ] Laptop charged / power adapter packed
