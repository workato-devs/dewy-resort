# Create Workato folders and push recipes

$ErrorActionPreference = "Stop"

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

    foreach ($folder in $folders) {
        # Initialize workato project
        try {
            & workato init --profile default --region custom --non-interactive --project-name $folder --api-url $env:WORKATO_HOST 2>$null
        } catch { }
        
        $recipesPath = "$ProjectRoot\workato\recipes\$folder"
        if (Test-Path $recipesPath) {
            Copy-Item -Path "$recipesPath\*" -Destination $folder -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "Copied recipes to $folder"

            if ($folder -eq "sf-api-collection") {
                # API endpoints depend on recipes and the api_group existing first.
                # workato push sends the whole folder at once and the server may
                # attempt to save endpoints before their dependencies are created.
                # Solve this by pushing in two phases:
                #   Phase 1: api_group + recipes (no cross-deps within this set)
                #   Phase 2: everything (endpoints can now resolve their deps)

                Write-Host "  Phase 1: pushing api_group and recipes..."
                $stagingDir = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
                New-Item -ItemType Directory -Force -Path $stagingDir | Out-Null
                Get-ChildItem -Path $folder -Filter "*.api_endpoint.json" -ErrorAction SilentlyContinue | Move-Item -Destination $stagingDir

                Push-Location $folder
                try { & workato push } finally { Pop-Location }

                Write-Host "  Phase 2: pushing api_endpoints (with all dependencies)..."
                Get-ChildItem -Path $stagingDir -Filter "*.api_endpoint.json" -ErrorAction SilentlyContinue | Move-Item -Destination $folder
                Remove-Item -Path $stagingDir -Recurse -Force

                Push-Location $folder
                try { & workato push } finally { Pop-Location }
            } else {
                Push-Location $folder
                try { & workato push } finally { Pop-Location }
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
