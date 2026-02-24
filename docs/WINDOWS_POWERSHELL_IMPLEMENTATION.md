# Windows PowerShell Support Implementation

## Overview

This document describes the implementation of Windows PowerShell support for the Dewy Resort workshop, enabling Windows users to set up and run the workshop without requiring WSL, Git Bash, or other Unix emulation layers.

## Background

The original workshop setup relied on:
- **Makefile** for task orchestration
- **Bash scripts** (`.sh` files) for setup, utilities, and automation
- **Unix-style paths** and commands

This created friction for Windows users who would need to:
1. Install WSL (Windows Subsystem for Linux), or
2. Use Git Bash/MSYS2/Cygwin with path translation issues, or
3. Manually translate commands

## Design Decision: Native PowerShell

After evaluating several options, we chose **native PowerShell scripts** as the solution:

| Option | Pros | Cons |
|--------|------|------|
| **WSL Requirement** | Reuse existing scripts | Extra setup complexity, resource overhead |
| **Node.js Scripts** | Cross-platform, already a dependency | Node not installed during bootstrap (chicken-egg) |
| **Python Scripts** | Often pre-installed | Not always available, another dependency |
| **PowerShell Scripts** | Native to Windows 10/11, no install needed | Maintain two script sets |
| **Cross-platform binary (Go/Rust)** | Single codebase | High initial investment, distribution complexity |

PowerShell was selected because:
- Built into Windows 10/11 (no installation required)
- No path translation issues (native Windows paths)
- Workshop attendees get a native experience
- Scripts are maintainable alongside bash equivalents

## Implementation

### Scripts Created

#### Bootstrap & Setup
| Script | Purpose |
|--------|---------|
| `bootstrap.ps1` | Standalone script to set up everything from scratch |
| `setup.ps1` | Main entry point for Windows users (after cloning) |
| `app/scripts/setup/setup-cli.ps1` | Generic CLI setup orchestrator |
| `app/scripts/setup/fix-bcrypt.ps1` | Fix bcrypt architecture mismatch |
| `app/scripts/setup/create-cognito-staff-users.ps1` | Create Cognito test users |

#### Workato CLI
| Script | Purpose |
|--------|---------|
| `workato/scripts/cli/workato-setup.ps1` | Install Workato CLI via pip |
| `workato/scripts/cli/workato-cleanup.ps1` | Uninstall Workato CLI |
| `workato/scripts/cli/start_workato_recipes.ps1` | Start all Workato recipes |
| `workato/scripts/cli/stop_workato_recipes.ps1` | Stop all Workato recipes |
| `workato/scripts/cli/enable_api_endpoints.ps1` | Enable API endpoints |
| `workato/scripts/cli/create_api_collection_client.ps1` | Create API client |
| `workato/scripts/cli/create_workato_folders.ps1` | Initialize Workato folders |

#### Salesforce CLI
| Script | Purpose |
|--------|---------|
| `vendor/salesforce/scripts/salesforce-setup.ps1` | Install Salesforce CLI |
| `vendor/salesforce/scripts/deploy.ps1` | Deploy to Salesforce org |

#### Dev Tools & Utilities
| Script | Purpose |
|--------|---------|
| `app/scripts/dev-tools/server.ps1` | Dev server management (start/stop/restart/status) |
| `app/scripts/utils/dump-database.ps1` | Backup SQLite database |
| `app/scripts/utils/export-app.ps1` | Export application files |

#### Integration Tests
| Script | Purpose |
|--------|---------|
| `app/scripts/tests/integration/quick-check.ps1` | Quick diagnostic |
| `app/scripts/tests/integration/test-env-isolation.ps1` | Test environment isolation |
| `app/scripts/tests/integration/test-mock-mode.ps1` | Test mock mode |

### Documentation
- `WINDOWS_SETUP.md` - Comprehensive setup guide for Windows users
- `docs/WINDOWS_POWERSHELL_IMPLEMENTATION.md` - This document

## Issues Encountered & Solutions

### 1. Unicode Characters Causing Parse Errors

**Problem:** Unicode emoji characters (✓, ❌, ⚠️) in scripts caused encoding issues on Windows PowerShell 5.1, resulting in parse errors like "The string is missing the terminator".

**Solution:** Replaced all Unicode characters with ASCII equivalents:
- `✓` → `[OK]`
- `❌` → `[ERROR]`
- `⚠️` → `[WARN]`
- `ℹ️` → `[INFO]`

### 2. Python Version Requirement

**Problem:** Original scripts required Python 3.8+, but the Workato CLI and dependencies need Python 3.11+.

**Solution:** Updated all Python version checks to require 3.11 or higher.

### 3. Double Backslash Path Issues

**Problem:** String concatenation with backslashes (`"$ProjectRoot\bin\workato.ps1"`) sometimes produced double backslashes or incorrect paths.

**Solution:** Used `Join-Path` and `Resolve-Path` cmdlets for reliable path construction:
```powershell
# Instead of:
$path = "$ProjectRoot\bin\workato.ps1"

# Use:
$path = Join-Path $ProjectRoot "bin\workato.ps1"
```

### 4. Tar Extraction Failures

**Problem:** Windows `tar` command failed with paths containing backslashes.

**Solution:** Convert paths to forward slashes before passing to tar:
```powershell
$tarFile = $absoluteDownloadFile -replace '\\', '/'
& tar -xf $tarFile --strip-components=1
```

### 5. pip Warnings Treated as Errors

**Problem:** PowerShell's `$ErrorActionPreference = "Stop"` caused pip's PATH warnings (written to stderr) to terminate the script, even though the installation succeeded.

**Solution:** 
1. Temporarily set `$ErrorActionPreference = "Continue"` during pip install
2. Capture output as string with `2>&1 | Out-String`
3. Check for success patterns in output rather than relying on exit code alone:
```powershell
$ErrorActionPreference = "Continue"
$pipOutput = & $pythonCmd -m pip install --user workato-platform-cli 2>&1 | Out-String
$ErrorActionPreference = "Stop"

if ($pipOutput -match "Successfully installed.*workato-platform-cli") {
    $installSuccess = $true
}
```

### 6. Python Scripts Directory Not in PATH

**Problem:** After installing Python and pip packages, the Scripts directory (where executables like `workato.exe` are installed) was not in the system PATH.

**Solution:** Implemented automatic PATH detection and configuration:
1. Check common Python Scripts locations (both `AppData\Local` and `AppData\Roaming`)
2. Try adding to user PATH first (no admin required)
3. Offer to elevate to admin for system PATH if needed
4. Refresh current session PATH after modification

```powershell
function Add-ToUserPath {
    param([string]$Directory)
    $currentUserPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $newPath = "$currentUserPath;$Directory"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    $env:Path = "$env:Path;$Directory"  # Update current session
}
```

### 7. pip --user Installs to Roaming Directory

**Problem:** On some Windows configurations, `pip install --user` installs to `AppData\Roaming\Python\PythonXXX\Scripts` instead of `AppData\Local\Programs\Python\PythonXXX\Scripts`.

**Solution:** Added both Roaming and Local paths to the detection logic:
```powershell
$possiblePaths = @(
    "$env:APPDATA\Python\Python311\Scripts",           # Roaming
    "$env:LOCALAPPDATA\Programs\Python\Python311\Scripts",  # Local
    # ... etc for Python 3.12, 3.13
)
```

### 8. Bootstrap Script Branch Issue

**Problem:** The bootstrap script cloned from `main` branch, which didn't have the PowerShell scripts yet.

**Solution:** 
1. Temporarily defaulted to `feature/windows-powershell-scripts` branch
2. Added TODO comment for easy revert after merge:
```powershell
# TODO: Change back to "main" after merging feature/windows-powershell-scripts
# [string]$Branch = "main",
[string]$Branch = "feature/windows-powershell-scripts",
```

### 9. Exit Code Handling

**Problem:** Need to stop execution if a previous step fails.

**Solution:** Used `$LASTEXITCODE` for external commands and proper exit statements:
```powershell
& git clone --branch $BranchName $Url $Target
if ($LASTEXITCODE -ne 0) {
    throw "git clone failed with exit code $LASTEXITCODE"
}
```

### 10. Salesforce CLI Installation Hanging / Symlink Errors

**Problem:** The Salesforce CLI installation via tar extraction would hang indefinitely on Windows, or fail with symlink errors (`Can't create '\\?\C:\...\sfdx': Invalid argument`). The `.tar.xz` archive contains symlinks which Windows tar cannot create without admin privileges.

**Solution:** Removed tar extraction entirely. Salesforce CLI is now installed exclusively via npm:
```powershell
npm install --global @salesforce/cli
```
This is more reliable on Windows and Node.js v20 is now a prerequisite anyway.

### 11. PATH Not Refreshing After winget Install

**Problem:** After winget installs Node.js (or other tools), the PATH environment variable is updated in the registry but the current PowerShell session doesn't see the change. Commands like `node` and `npm` fail even though installation succeeded.

**Solution:** After winget install, explicitly:
1. Refresh PATH from registry: `$env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")`
2. Add default install locations directly to current session PATH
3. If still not found, return `$false` and prompt user to restart PowerShell

```powershell
# Node.js installs to Program Files by default - add explicitly
$nodePaths = @(
    "$env:ProgramFiles\nodejs",
    "${env:ProgramFiles(x86)}\nodejs"
)
foreach ($nodePath in $nodePaths) {
    if ((Test-Path $nodePath) -and ($env:Path -notlike "*$nodePath*")) {
        $env:Path = "$env:Path;$nodePath"
    }
}
```

### 12. Global npm Install vs Local Wrapper Scripts

**Problem:** When Salesforce CLI is installed globally via npm, no local wrapper script (`bin\sf.ps1`) is created. The setup-cli.ps1 verification step failed because it only checked for local wrappers.

**Solution:** Updated setup-cli.ps1 to check for both:
1. Local wrapper scripts (`bin\sf.ps1`)
2. Global commands available in PATH (`sf`)

If either exists, installation is considered successful.

## Prerequisite Auto-Installation

The setup scripts automatically install missing prerequisites via **winget**:

1. **winget** - Windows Package Manager (attempts to install if missing)
2. **Git** - `winget install Git.Git`
3. **Python 3.11** - `winget install Python.Python.3.11`
4. **Node.js v20 LTS** - `winget install OpenJS.NodeJS.LTS` (required for Salesforce CLI and app)

## Usage

### One-Liner Bootstrap (from scratch)
```powershell
iwr -useb "https://raw.githubusercontent.com/workato-devs/dewy-resort/feature/windows-powershell-scripts/bootstrap.ps1" | iex
```

### After Cloning
```powershell
.\setup.ps1                    # Install all CLIs
.\setup.ps1 -Tool workato      # Install only Workato CLI
.\setup.ps1 -Tool salesforce   # Install only Salesforce CLI
.\setup.ps1 -SkipPrerequisites # Skip prerequisite checks
```

### Command Mapping (Mac/Linux → Windows)

| Mac/Linux (Makefile) | Windows (PowerShell) |
|---------------------|---------------------|
| `make setup` | `.\setup.ps1` |
| `make setup tool=workato` | `.\setup.ps1 -Tool workato` |
| `make start-recipes` | `.\workato\scripts\cli\start_workato_recipes.ps1` |
| `make stop-recipes` | `.\workato\scripts\cli\stop_workato_recipes.ps1` |
| `make sf-deploy org=myOrg` | `.\vendor\salesforce\scripts\deploy.ps1 -TargetOrg myOrg` |
| `bin/workato` | `.\bin\workato.ps1` |
| `bin/sf` | `sf` (global command via npm) |

## Future Considerations

1. **Merge to main** - After testing, merge the feature branch and revert bootstrap default to `main`
2. **CI/CD Testing** - Add Windows runners to CI pipeline to test PowerShell scripts
3. **Parity Maintenance** - When updating bash scripts, update PowerShell equivalents
4. **PowerShell Core** - Scripts are compatible with both Windows PowerShell 5.1 and PowerShell Core 7+

## Files Changed

All changes are in the `feature/windows-powershell-scripts` branch:
- 20 new PowerShell scripts (`.ps1` files)
- 2 new documentation files
- Wrapper scripts in `bin/` directory (`.ps1` and `.cmd` for cmd.exe compatibility)
