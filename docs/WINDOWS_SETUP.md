# Dewy Resort Workshop - Windows Setup Guide

This guide covers setting up the Dewy Resort workshop environment on Windows.

## Prerequisites

The setup script will automatically install missing prerequisites via **winget**:

- Windows 10 version 1803 or later
- PowerShell 5.0 or later (included with Windows 10)
- **Git** (auto-installed if missing)
- **make** (auto-installed if missing) - for workshop Makefile commands
- **Node.js v20 LTS** (auto-installed if missing)
- **wk CLI** - Workato CLI ([install instructions](https://docs.workato.com/wk-cli.html))

> **Note:** Node.js v20 is specifically required. Other versions (v18, v21, v22) may cause compatibility issues.

## Quick Start

1. Open PowerShell as Administrator (right-click → "Run as Administrator")

2. Enable script execution (one-time setup):
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. Clone the repository and navigate to it:
   ```powershell
   git clone <repository-url>
   cd dewy-resort
   ```

4. Run the setup script:
   ```powershell
   .\setup.ps1
   ```

   Or setup specific tools:
   ```powershell
   .\setup.ps1 -Tool workato
   .\setup.ps1 -Tool salesforce
   ```

## Available Scripts

### Setup Scripts

| Script | Description |
|--------|-------------|
| `.\setup.ps1` | Main setup entry point |
| `.\app\scripts\setup\setup-cli.ps1 -Tool <name>` | Setup specific CLI tool |
| `.\app\scripts\setup\fix-bcrypt.ps1` | Fix bcrypt architecture issues |
| `.\app\scripts\setup\create-cognito-staff-users.ps1` | Create Cognito test users |

### Workato Commands

Workato operations are now handled by the cross-platform `wk` CLI and Make targets:

| Command | Description |
|---------|-------------|
| `make setup tool=workato` | Verify wk CLI installation |
| `make workato-init` | Initialize Workato workspace (clone projects) |
| `make validate` | Lint all Workato recipes |
| `make push` | Push recipes to workspace |
| `make pull` | Pull recipes from workspace |
| `make start-recipes` | Start all stopped recipes |
| `make stop-recipes` | Stop all running recipes |
| `make enable-api-endpoints` | Enable all disabled API endpoints |
| `make create-api-client` | Create API client and update .env |

### Salesforce Scripts

| Script | Description |
|--------|-------------|
| `.\vendor\salesforce\scripts\salesforce-setup.ps1` | Install Salesforce CLI |
| `.\vendor\salesforce\scripts\deploy.ps1 -TargetOrg <alias>` | Deploy to Salesforce org |

### Dev Server Scripts

| Script | Description |
|--------|-------------|
| `.\app\scripts\dev-tools\server.ps1 -Action start` | Start development server |
| `.\app\scripts\dev-tools\server.ps1 -Action stop` | Stop development server |
| `.\app\scripts\dev-tools\server.ps1 -Action restart` | Restart development server |
| `.\app\scripts\dev-tools\server.ps1 -Action status` | Check server status |

### Utility Scripts

| Script | Description |
|--------|-------------|
| `.\app\scripts\utils\dump-database.ps1` | Backup SQLite database |
| `.\app\scripts\utils\export-app.ps1` | Export application files |

## Environment Setup

1. Copy the example environment file:
   ```powershell
   Copy-Item app\.env.example app\.env
   ```

2. Edit `app\.env` with your configuration values

3. Install Node.js dependencies:
   ```powershell
   cd app
   npm install
   ```

## Running the Application

Start the development server:
```powershell
cd app
npm run dev
```

Or use the server management script:
```powershell
.\app\scripts\dev-tools\server.ps1 -Action start
```

## Troubleshooting

### PowerShell Execution Policy

If you see "running scripts is disabled on this system":
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### bcrypt Issues

If you encounter bcrypt architecture mismatch errors:
```powershell
.\app\scripts\setup\fix-bcrypt.ps1
```

### Salesforce CLI Download Issues

If the automatic download fails, the setup will try npm installation automatically. If that also fails, install manually:
```powershell
npm install --global @salesforce/cli
```

### Node.js Version Issues

Node.js v20 is required. Check your version:
```powershell
node --version
```

If you have a different version, install v20 via winget:
```powershell
winget install OpenJS.NodeJS.LTS
```

### Node.js/npm Not Found After Installation

If winget installed Node.js but `node` or `npm` commands aren't found, restart PowerShell to refresh the PATH. Alternatively, manually add Node.js to your current session:
```powershell
$env:Path = "$env:Path;$env:ProgramFiles\nodejs"
```

### "Unable to authenticate" when running `make sf-deploy`

If `make status tool=salesforce` shows your org but `make sf-deploy org=myDevOrg` fails
with an authentication error, the most common causes are:

1. **Expired access token** — Re-authenticate from your terminal (not through Make):
   ```powershell
   sf org login web --alias myDevOrg
   ```
   Then retry: `make sf-deploy org=myDevOrg`

2. **MSYS2 HOME path mismatch** — GNU Make on Windows (via Chocolatey) uses MSYS2, which
   sets `HOME` to a Unix-style path (e.g., `/c/Users/foo`). The Salesforce CLI can't find
   credentials stored at `C:\Users\foo\.sf\`. The Makefile normalizes this automatically,
   but if you still see issues, verify with:
   ```powershell
   make -p | findstr "^HOME"
   ```
   `HOME` should show your Windows user profile path (e.g., `C:\Users\YourName`).

## Differences from Mac/Linux

The `wk` CLI is cross-platform, so most Workato commands work identically on Windows and Mac/Linux via Make targets. The main differences are in initial setup:

| Mac/Linux | Windows |
|-----------|---------|
| `make setup` | `.\setup.ps1` (or `make setup`) |
| `make setup tool=workato` | `.\setup.ps1 -Tool workato` (or `make setup tool=workato`) |
| `make sf-deploy org=myOrg` | `.\vendor\salesforce\scripts\deploy.ps1 -TargetOrg myOrg` |
| `brew install workato/tap/wk` | `scoop install wk` |

All `make` targets (start-recipes, stop-recipes, validate, push, pull, etc.) work identically on both platforms.
