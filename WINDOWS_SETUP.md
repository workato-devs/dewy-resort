# Dewy Resort Workshop - Windows Setup Guide

This guide covers setting up the Dewy Resort workshop environment on Windows.

## Prerequisites

The setup script will automatically install missing prerequisites via **winget**:

- Windows 10 version 1803 or later
- PowerShell 5.0 or later (included with Windows 10)
- **Git** (auto-installed if missing)
- **make** (auto-installed if missing) - for workshop Makefile commands
- **Node.js v20 LTS** (auto-installed if missing)
- **Python 3.11+** (auto-installed if missing) - for Workato CLI

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

### Workato Scripts

| Script | Description |
|--------|-------------|
| `.\workato\scripts\cli\workato-setup.ps1` | Install Workato CLI |
| `.\workato\scripts\cli\workato-cleanup.ps1` | Uninstall Workato CLI |
| `.\workato\scripts\cli\start_workato_recipes.ps1` | Start all recipes |
| `.\workato\scripts\cli\stop_workato_recipes.ps1` | Stop all recipes |
| `.\workato\scripts\cli\enable_api_endpoints.ps1` | Enable API endpoints |
| `.\workato\scripts\cli\create_api_collection_client.ps1` | Create API client |
| `.\workato\scripts\cli\create_workato_folders.ps1` | Initialize Workato folders |

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

### Python Not Found

Ensure Python is in your PATH. You can verify with:
```powershell
python --version
```

If not found, reinstall Python and check "Add Python to PATH" during installation.

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

## Differences from Mac/Linux

| Mac/Linux | Windows |
|-----------|---------|
| `make setup` | `.\setup.ps1` |
| `make setup tool=workato` | `.\setup.ps1 -Tool workato` |
| `make start-recipes` | `.\workato\scripts\cli\start_workato_recipes.ps1` |
| `make stop-recipes` | `.\workato\scripts\cli\stop_workato_recipes.ps1` |
| `make sf-deploy org=myOrg` | `.\vendor\salesforce\scripts\deploy.ps1 -TargetOrg myOrg` |
| `bin/workato` | `.\bin\workato.ps1` or `bin\workato` (cmd) |
| `bin/sf` | `sf` (global command via npm) |

## Using from Command Prompt (cmd.exe)

The setup creates `.cmd` wrapper files for use from Command Prompt:
```cmd
bin\workato --version
bin\sf --version
```
