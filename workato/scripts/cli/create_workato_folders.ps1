# Create Workato folders and push recipes

$ErrorActionPreference = "Stop"

# Ensure HOME points to the real Windows user profile.
# MSYS2/MinGW Make may set HOME to a Unix-style path (/c/Users/foo),
# which prevents the Workato CLI from finding its profile/keychain config.
if ($env:HOME -and $env:HOME -match '^/') {
    $env:HOME = $env:USERPROFILE
}

# Get the project root directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Get-Item "$ScriptDir\..\..\..").FullName
$ProjectsDir = "$ProjectRoot\projects"

# Create projects directory if it doesn't exist
New-Item -ItemType Directory -Force -Path $ProjectsDir | Out-Null
Push-Location $ProjectsDir

try {
    # Load environment variables from app\.env
    $EnvFile = "$ProjectRoot\app\.env"
    if (Test-Path $EnvFile) {
        Get-Content $EnvFile | ForEach-Object {
            if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
                [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
            }
        }
    } else {
        Write-Host "[WARN] .env file not found at $EnvFile" -ForegroundColor Yellow
        Write-Host "Please create app\.env with WORKATO_API_TOKEN and WORKATO_HOST"
        exit 1
    }

    # Validate required environment variables
    if (-not $env:WORKATO_HOST) {
        Write-Host "[ERROR] WORKATO_HOST is not set in app\.env" -ForegroundColor Red
        exit 1
    }

    if (-not $env:WORKATO_API_TOKEN) {
        Write-Host "[ERROR] WORKATO_API_TOKEN is not set in app\.env" -ForegroundColor Red
        exit 1
    }

    $folders = @(
        "Workspace Connections",
        "atomic-salesforce-recipes",
        "atomic-stripe-recipes",
        "orchestrator-recipes",
        "sf-api-collection"
    )

    $headers = @{
        "Authorization" = "Bearer $env:WORKATO_API_TOKEN"
        "Content-Type" = "application/json"
    }

    # Native CLI commands (workato) may write warnings/info to stderr.
    # With ErrorActionPreference=Stop, PowerShell treats any stderr output as a
    # terminating error. Switch to Continue and check $LASTEXITCODE instead.
    $ErrorActionPreference = "Continue"

    foreach ($folder in $folders) {
        # Initialize workato project. The first call creates the .workato profile;
        # subsequent calls (and re-runs) fail with "file already exists" — expected.
        # Suppress all output (*>$null) and catch any PS-level exceptions.
        try { & workato init --profile default --region custom --non-interactive --project-name $folder --api-url $env:WORKATO_HOST *>$null } catch { }

        $recipesPath = "$ProjectRoot\workato\recipes\$folder"
        if (Test-Path $recipesPath) {
            Copy-Item -Path "$recipesPath\*" -Destination $folder -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "Copied recipes to $folder"

            Push-Location $folder
            try {
                & workato push
                if ($LASTEXITCODE -ne 0) {
                    Write-Host "[WARN] workato push failed for $folder" -ForegroundColor Yellow
                }
            } finally {
                Pop-Location
            }
        } else {
            Write-Host "[WARN] No recipes found at $recipesPath" -ForegroundColor Yellow
        }
        
        # Create folder via API
        $body = @{ name = $folder } | ConvertTo-Json
        try {
            Invoke-RestMethod -Uri "$env:WORKATO_HOST/api/folders" -Headers $headers -Method Post -Body $body | Out-Null
            Write-Host "[OK] Created $folder" -ForegroundColor Green
        } catch {
            Write-Host "[INFO] Folder $folder may already exist" -ForegroundColor Yellow
        }
    }
} finally {
    Pop-Location
}
