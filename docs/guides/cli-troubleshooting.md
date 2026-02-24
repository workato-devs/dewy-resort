---
layout: default
title: CLI Troubleshooting
nav_order: 1
parent: Guides
---

# CLI Troubleshooting Guide

Common issues and solutions for Workato CLI, Salesforce CLI, and environment setup.

---

## Quick Diagnosis Commands

Run these to quickly identify issues:

```bash
# Check Node.js
node --version        # Need 20+

# Check Python (Workato CLI dependency)
python3 --version     # Need 3.11+
which python3         # Should show a path

# Check if CLIs installed
ls -la bin/           # Should show workato and sf
bin/workato --version # Test Workato CLI
bin/sf --version      # Test Salesforce CLI
```

---

## Workato CLI Issues

### Issue: "Python not found" or Version Mismatch

**Symptoms:**
```
Error: Python 3.11+ required
ModuleNotFoundError: No module named 'xyz'
```

**Diagnosis:**
```bash
python3 --version
# If shows <3.11 or command not found, Python needs setup
```

**Solutions:**

#### Option A: Using pyenv (Recommended)

```bash
# Install pyenv if not present
curl https://pyenv.run | bash

# Add to shell profile (~/.zshrc or ~/.bashrc)
export PATH="$HOME/.pyenv/bin:$PATH"
eval "$(pyenv init -)"

# Restart shell or source profile
source ~/.zshrc

# Install Python 3.11
pyenv install 3.11.14
pyenv local 3.11.14

# Verify
python3 --version  # Should show 3.11.x
```

#### Option B: Using Homebrew (macOS)

```bash
brew install python@3.11
export PATH="/opt/homebrew/opt/python@3.11/bin:$PATH"
python3 --version
```

#### Option C: Using System Package Manager (Linux)

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3.11 python3.11-venv

# Use update-alternatives if needed
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1
```

### Issue: "Permission denied" on bin/workato

**Symptoms:**
```
-bash: bin/workato: Permission denied
```

**Solution:**
```bash
chmod +x bin/workato
```

### Issue: "gem not found" or Ruby errors

**Symptoms:**
```
ERROR: Gem::GemNotFoundException
```

**Background:** Workato CLI is a Ruby gem that requires Python for certain operations.

**Solution:**
```bash
# Ensure Ruby is available (usually pre-installed on macOS)
ruby --version

# If missing on Linux:
sudo apt install ruby-full

# Re-run the setup script
./setup.sh          # Mac/Linux
.\setup.ps1         # Windows
```

### Issue: API Token Not Working

**Symptoms:**
```
Error: Unauthorized
Error: Invalid API key
```

**Diagnosis:**
```bash
# Check .env file
cat .env | grep WORKATO

# Verify token format (should be long alphanumeric string)
```

**Solutions:**
1. Ensure token is copied correctly (no extra spaces or newlines)
2. Verify API key permissions in Workato UI:
   - Settings -> API Keys & Clients
   - Required permissions:
     - Projects -> Project Assets (all)
     - Projects -> Recipe Lifecycle Management (all)
     - Tools -> API Platform (all except OpenAPI)
     - Admin -> Workspace Details (all)
3. Regenerate token if expired

### Issue: "make workato-init" Hangs

**Symptoms:**
- Command runs but no output for >2 minutes
- Eventually times out

**Solutions:**
1. Check network connectivity to Workato
2. Verify token is valid: `make status tool=workato`
3. Try running script directly with verbose output:
   ```bash
   export WORKATO_API_TOKEN=your_token
   bash -x scripts/tools/create_workato_folders.sh
   ```

---

## Salesforce CLI Issues

### Issue: "npm ERR!" during sf install

**Symptoms:**
```
npm ERR! code EACCES
npm ERR! syscall access
```

**Solution:**
```bash
# Fix npm permissions (don't use sudo with npm)
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH

# Re-run the setup script
./setup.sh          # Mac/Linux
.\setup.ps1         # Windows
```

### Issue: "sf: command not found" after install

**Symptoms:**
```
-bash: bin/sf: No such file or directory
```

**Diagnosis:**
```bash
ls -la bin/
# Check if sf exists
```

**Solution:**
```bash
# CLI installs to tools/sf-cli, symlink may have failed
ls tools/sf-cli/bin/
ln -sf ../tools/sf-cli/bin/sf bin/sf
```

### Issue: Salesforce Login Fails

**Symptoms:**
```
Error: OAuth exchange failed
Browser opened but login stuck
```

**Solutions:**

1. **Check browser popup blocker:**
   - Ensure popup is allowed for salesforce.com

2. **Try incognito/private window:**
   - Sometimes cached credentials interfere

3. **Manual authentication:**
   ```bash
   # Use device flow instead of web flow
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

2. **Check deployment order:**
   ```bash
   # Deploy metadata first
   cd salesforce
   ../bin/sf project deploy start --source-dir force-app --target-org myDevOrg

   # Then assign permission set
   ../bin/sf org assign permset --name Hotel_Management_Admin --target-org myDevOrg

   # Then import data
   ../bin/sf data import tree --plan data/data-plan.json --target-org myDevOrg
   ```

3. **Check for existing data conflicts:**
   ```bash
   # If seed data import fails, check for existing records
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
# Check .env exists and has content
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

3. **Reload shell:**
   ```bash
   source .env
   # Or restart terminal
   ```

---

<div class="facilitator-only" markdown="1">

## Workshop-Specific Quick Fixes

### "I'm Stuck and We're Running Out of Time"

**Temporary Workarounds:**

1. **Skip Workato CLI, use UI directly:**
   - Import recipes manually via Workato UI
   - Navigate to Projects -> Import -> Upload JSON files

2. **Use facilitator's Salesforce org:**
   - Have backup org pre-configured
   - Share connection credentials for workshop only

3. **Use mock mode:**
   ```bash
   # In .env
   MOCK_MODE=true

   # App will use local SQLite instead of Salesforce
   npm run dev
   ```

### Pre-Workshop Validation Script

Have attendees run this before the workshop:

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
