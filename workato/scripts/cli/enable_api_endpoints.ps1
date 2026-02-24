# Enable all API endpoints in specified API collections
# Uses the Workato Developer API
#
# Usage:
#   .\enable_api_endpoints.ps1                                    # Enable all endpoints in all collections
#   .\enable_api_endpoints.ps1 -CollectionName "sf-api-collection"  # Enable specific collection

param(
    [string]$CollectionName
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Blue
Write-Host "Enabling Workato API Endpoints" -ForegroundColor Blue
if ($CollectionName) {
    Write-Host "Collection: $CollectionName" -ForegroundColor Yellow
} else {
    Write-Host "All collections" -ForegroundColor Yellow
}
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# Get the project root directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Get-Item "$ScriptDir\..\..\..").FullName

# Load environment variables from app\.env
$EnvFile = "$ProjectRoot\app\.env"
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
        }
    }
} else {
    Write-Host "[ERROR] .env file not found at $EnvFile" -ForegroundColor Red
    Write-Host "Please create app\.env with WORKATO_API_TOKEN"
    exit 1
}

if (-not $env:WORKATO_API_TOKEN) {
    Write-Host "[ERROR] WORKATO_API_TOKEN not set" -ForegroundColor Red
    Write-Host "Please set WORKATO_API_TOKEN in your app\.env file"
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $env:WORKATO_API_TOKEN"
    "Content-Type" = "application/json"
}

# Fetch all API collections
Write-Host "Fetching API collections..." -ForegroundColor Yellow

try {
    $collectionsResponse = Invoke-RestMethod -Uri "https://app.trial.workato.com/api/api_collections?per_page=100" -Headers $headers -Method Get
} catch {
    Write-Host "[ERROR] Failed to fetch API collections from Workato API" -ForegroundColor Red
    exit 1
}

# Filter collections if name specified
if ($CollectionName) {
    $collections = $collectionsResponse | Where-Object { $_.name -eq $CollectionName }
    if (-not $collections -or $collections.Count -eq 0) {
        Write-Host "[ERROR] Collection '$CollectionName' not found" -ForegroundColor Red
        Write-Host ""
        Write-Host "Available collections:" -ForegroundColor Yellow
        $collectionsResponse | ForEach-Object { Write-Host "  - $($_.name) (ID: $($_.id))" }
        exit 1
    }
} else {
    $collections = $collectionsResponse
}

if (-not $collections -or $collections.Count -eq 0) {
    Write-Host "No API collections found" -ForegroundColor Yellow
    exit 0
}

$totalCollections = @($collections).Count
Write-Host "[OK] Found $totalCollections collection(s)" -ForegroundColor Green
Write-Host ""

# Counters
$enabled = 0
$failed = 0
$alreadyEnabled = 0
$recipeNotStarted = 0

# Process each collection
foreach ($collection in $collections) {
    $collectionId = $collection.id
    $collectionNameDisplay = $collection.name
    
    Write-Host "Collection: $collectionNameDisplay (ID: $collectionId)" -ForegroundColor Blue
    
    # Fetch endpoints for this collection
    try {
        $endpointsResponse = Invoke-RestMethod -Uri "https://app.trial.workato.com/api/api_endpoints?api_collection_id=$collectionId&per_page=100" -Headers $headers -Method Get
    } catch {
        Write-Host "  [ERROR] fetching endpoints" -ForegroundColor Red
        continue
    }
    
    if (-not $endpointsResponse -or $endpointsResponse.Count -eq 0) {
        Write-Host "  No endpoints found in this collection" -ForegroundColor Yellow
        Write-Host ""
        continue
    }
    
    $endpointCount = @($endpointsResponse).Count
    Write-Host "  Found $endpointCount endpoint(s)" -ForegroundColor Yellow
    
    # Enable each endpoint
    foreach ($endpoint in $endpointsResponse) {
        $endpointId = $endpoint.id
        $endpointName = $endpoint.name
        $endpointActive = $endpoint.active
        $recipeId = $endpoint.flow_id
        
        Write-Host "  Endpoint: $endpointName (ID: $endpointId)" -ForegroundColor Blue
        
        # Check if already enabled
        if ($endpointActive -eq $true) {
            Write-Host "    [WARN] Already enabled" -ForegroundColor Yellow
            $alreadyEnabled++
            continue
        }
        
        # Check if recipe is started
        if ($recipeId) {
            try {
                $recipeInfo = Invoke-RestMethod -Uri "https://app.trial.workato.com/api/recipes/$recipeId" -Headers $headers -Method Get
                if ($recipeInfo.running -ne $true) {
                    Write-Host "    [ERROR] Cannot enable: Recipe not started (ID: $recipeId)" -ForegroundColor Red
                    Write-Host "      Run start_workato_recipes.ps1 first" -ForegroundColor Yellow
                    $recipeNotStarted++
                    continue
                }
            } catch { }
        }
        
        # Enable the endpoint
        try {
            Invoke-RestMethod -Uri "https://app.trial.workato.com/api/api_endpoints/$endpointId/enable" -Headers $headers -Method Put | Out-Null
            Write-Host "    [OK] Enabled successfully" -ForegroundColor Green
            $enabled++
        } catch {
            $errorMsg = $_.Exception.Message
            Write-Host "    [ERROR] Failed to enable: $errorMsg" -ForegroundColor Red
            $failed++
        }
        
        # Small delay to avoid rate limiting
        Start-Sleep -Milliseconds 300
    }
    
    Write-Host ""
}

# Summary
Write-Host "========================================" -ForegroundColor Blue
Write-Host "Summary" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host "Enabled: $enabled" -ForegroundColor Green
Write-Host "Already enabled: $alreadyEnabled" -ForegroundColor Yellow
Write-Host "Recipe not started: $recipeNotStarted" -ForegroundColor Yellow
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host ""

if ($recipeNotStarted -gt 0) {
    Write-Host "[WARN] Some endpoints could not be enabled because their recipes are not started" -ForegroundColor Yellow
    Write-Host "Next steps:" -ForegroundColor Blue
    Write-Host "  1. Run: .\start_workato_recipes.ps1"
    Write-Host "  2. Run: .\enable_api_endpoints.ps1"
    Write-Host ""
}

if ($enabled -gt 0) {
    Write-Host "[OK] Successfully enabled $enabled endpoint(s)" -ForegroundColor Green
}

if ($failed -gt 0) {
    exit 1
} else {
    exit 0
}
