---
layout: default
title: CLI Troubleshooting
nav_order: 1
parent: Guides
---

# CLI Troubleshooting Guide

Common issues and solutions for the Workato CLI (`wk`), Salesforce CLI (`sf`), and environment setup.

---

## Quick Diagnosis Commands

Run these to quickly identify issues:

```bash
# Check Node.js
node --version        # Need 20+

# Check Workato CLI
wk version            # Should show version
wk auth status        # Should show authenticated profile

# Check Salesforce CLI
bin/sf --version      # Should show version

# Check overall status
make status           # Shows both CLIs
make doctor           # Detailed diagnostics
```

---

## Workato CLI Issues

### Issue: "wk: command not found"

**Solution:**

macOS/Linux:
```bash
brew install workato-devs/tap/wk
```

Windows:
```powershell
scoop install wk
```

Verify: `wk version`

### Issue: "Not authenticated" or Auth Failures

**Symptoms:**
```
Error: not authenticated
Error: Unauthorized
```

**Diagnosis:**
```bash
wk auth status
# Should show Profile, Workspace, Environment, Region, API status
```

**Solutions:**
1. Re-run authentication:
   ```bash
   make workato-login
   ```
2. Verify your token in the root `.env` file:
   ```bash
   # Should be a long token string, no extra spaces or newlines
   WORKATO_API_TOKEN=wrkatrial-eyJ0eXAiOi...
   ```
3. If the token was regenerated in Workato, update `.env` and re-run `make workato-login`

### Issue: API Token Not Working

**Symptoms:**
```
Error: Unauthorized
Error: Invalid API key
Error: Forbidden
```

**Solutions:**
1. Ensure token is copied correctly (no extra spaces or newlines)
2. Verify API client permissions in Workato UI:
   - Workspace Admin → API Clients → your client
   - Required permissions:
     - Projects → Project Assets (all)
     - Projects → Recipe Lifecycle Management (all)
     - Tools → API Platform (all)
     - Admin → Workspace Details (all)
     - Admin → Developer API clients (all)
3. Regenerate token if expired

### Issue: "make workato-init" Fails

**Symptoms:**
- Command errors or no output

**Solutions:**
1. Check that `wk auth status` shows a valid profile
2. Ensure you're in the `dewy-resort` root directory
3. Try running with verbose output:
   ```bash
   make status tool=workato
   ```

### Issue: "make push" Fails

**Symptoms:**
```
Error: project not initialized
Error: no recipes found
```

**Solutions:**
1. Run `make workato-init` first — this creates the local project scaffold
2. Verify the `workato/recipes/` directory contains `.recipe.json` files
3. Lint warnings during push are expected and will not block deployment

---

## Salesforce CLI Issues

### Issue: "sf: command not found" after install

**Diagnosis:**
```bash
ls -la bin/
# Check if sf wrapper exists
```

**Solution:**
```bash
make setup tool=salesforce
```

### Issue: Salesforce Login Fails

**Symptoms:**
```
Error: OAuth exchange failed
Browser opened but login stuck
```

**Solutions:**

1. **Check browser popup blocker:**
   - Ensure popups are allowed for salesforce.com

2. **Try incognito/private window:**
   - Cached credentials can interfere

3. **Use device flow instead of web flow:**
   ```bash
   bin/sf org login device --alias myDevOrg
   ```

4. **Check org status:**
   - Log into Salesforce directly in browser
   - Verify org isn't locked or expired

### Issue: "sf-deploy" Fails with Permission Error

**Symptoms:**
```
NOT_FOUND: Cannot find permission set
INSUFFICIENT_ACCESS: Cannot access object
```

**Solutions:**

1. **Verify org type:**
   - Must be Developer Edition or Sandbox
   - Cannot use Production org

2. **Re-run the deploy:**
   ```bash
   make sf-deploy org=myDevOrg
   ```

3. **Check for existing data conflicts:**
   ```bash
   bin/sf data query --query "SELECT Id FROM Account LIMIT 5" --target-org myDevOrg
   ```

---

## Environment Variable Issues

### Issue: .env Not Loading

**Symptoms:**
- Commands work manually but not via Makefile
- "WORKATO_API_TOKEN: unbound variable"

**Diagnosis:**
```bash
# Check .env exists in the project root and has content
cat .env

# Check for invisible characters
file .env
# Should show: ASCII text

# Check for Windows line endings (if edited on Windows)
cat -A .env
# Should NOT show ^M at end of lines
```

**Solutions:**

1. **Fix line endings:**
   ```bash
   # Convert Windows to Unix line endings
   sed -i '' 's/\r$//' .env  # macOS
   sed -i 's/\r$//' .env     # Linux
   ```

2. **Check file format:**
   ```bash
   # .env should be KEY=value format, no spaces around =
   # Correct:
   WORKATO_API_TOKEN=abc123

   # Wrong:
   WORKATO_API_TOKEN = abc123
   ```

3. **Check you have the right .env file:**
   - Root `.env` — contains `WORKATO_API_TOKEN` (used by Makefile and `wk` CLI)
   - `app/.env` — contains MCP URLs, Cognito config, app settings (used by the hotel app)

---

<div class="facilitator-only" markdown="1">

## Workshop-Specific Quick Fixes

### "I'm Stuck and We're Running Out of Time"

**Temporary Workarounds:**

1. **Skip `wk` CLI, use Workato UI directly:**
   - Import recipes manually via Workato UI
   - Navigate to Projects → Import → Upload JSON files

2. **Use facilitator's Salesforce org:**
   - Have backup org pre-configured
   - Share connection credentials for workshop only

3. **Use mock mode:**
   ```bash
   # In app/.env
   WORKATO_MOCK_MODE=true
   AUTH_PROVIDER=mock

   # App will use local SQLite instead of Salesforce
   cd app && npm run dev
   ```

### Pre-Workshop Validation Script

Have attendees run this before the workshop:

```bash
#!/bin/bash
echo "=== Pre-Workshop Environment Check ==="

# Node.js
echo -n "Node.js: "
node --version 2>/dev/null || echo "NOT INSTALLED"

# Git
echo -n "Git: "
git --version 2>/dev/null || echo "NOT INSTALLED"

# Workato CLI
echo -n "wk CLI: "
wk version 2>/dev/null || echo "NOT INSTALLED"

# Network (can reach Workato)
echo -n "Network (Workato): "
curl -s -o /dev/null -w "%{http_code}" https://app.trial.workato.com | grep -q "200" && echo "OK" || echo "BLOCKED"

# Network (can reach Salesforce)
echo -n "Network (Salesforce): "
curl -s -o /dev/null -w "%{http_code}" https://login.salesforce.com | grep -q "200" && echo "OK" || echo "BLOCKED"

echo "=== Check Complete ==="
```

</div>

---

## Escalation Path

If issues persist after trying these solutions:

1. **Check Dewy Resort repo issues:** [github.com/workato-devs/dewy-resort/issues](https://github.com/workato-devs/dewy-resort/issues)
2. **Workato Community:** [community.workato.com](https://community.workato.com)
3. **Salesforce Developer Forums:** [developer.salesforce.com/forums](https://developer.salesforce.com/forums)

For workshop-day emergencies, work with a partner who completed setup successfully.
