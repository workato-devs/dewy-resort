# Start all Workato recipes in ascending order by recipe ID
# Uses the Workato Developer API
#
# Usage:
#   .\start_workato_recipes.ps1              # Stop on first failure
#   .\start_workato_recipes.ps1 -SkipFailed  # Continue on failures

param(
    [switch]$SkipFailed
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Blue
Write-Host "Starting Workato Recipes" -ForegroundColor Blue
if ($SkipFailed) {
    Write-Host "Mode: Skip failed recipes" -ForegroundColor Yellow
} else {
    Write-Host "Mode: Stop on first failure" -ForegroundColor Yellow
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

# Check for required environment variables
if (-not $env:WORKATO_API_TOKEN) {
    Write-Host "[ERROR] WORKATO_API_TOKEN not set" -ForegroundColor Red
    Write-Host "Please set WORKATO_API_TOKEN in your app\.env file"
    exit 1
}

# Fetch all recipes using the Workato API
Write-Host "Fetching all recipes..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $env:WORKATO_API_TOKEN"
    "Content-Type" = "application/json"
}

try {
    $recipesResponse = Invoke-RestMethod -Uri "https://app.trial.workato.com/api/recipes?per_page=100" -Headers $headers -Method Get
} catch {
    Write-Host "[ERROR] Failed to fetch recipes from Workato API" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

$recipes = $recipesResponse.items | Sort-Object id

if (-not $recipes -or $recipes.Count -eq 0) {
    Write-Host "No recipes found" -ForegroundColor Yellow
    exit 0
}

$totalRecipes = $recipes.Count
Write-Host "[OK] Found $totalRecipes recipes" -ForegroundColor Green
Write-Host ""

# Counters
$started = 0
$failed = 0
$alreadyRunning = 0

# Start each recipe
foreach ($recipe in $recipes) {
    $recipeId = $recipe.id
    $recipeName = $recipe.name
    $recipeRunning = $recipe.running
    
    Write-Host "Recipe ID: $recipeId - $recipeName" -ForegroundColor Blue
    
    # Check if recipe is already running
    if ($recipeRunning -eq $true) {
        Write-Host "  [WARN] Already running, skipping..." -ForegroundColor Yellow
        $alreadyRunning++
        Write-Host ""
        continue
    }
    
    # Start the recipe
    try {
        $startResponse = Invoke-RestMethod -Uri "https://app.trial.workato.com/api/recipes/$recipeId/start" -Headers $headers -Method Put
        
        if ($startResponse.success -eq $true) {
            Write-Host "  [OK] Started successfully" -ForegroundColor Green
            $started++
        } elseif ($startResponse.success -eq $false) {
            if ($startResponse.config_errors -and $startResponse.config_errors.Count -gt 0) {
                Write-Host "  [ERROR] Cannot start: Connection not configured" -ForegroundColor Red
                Write-Host "     Configure connections in Workato UI: https://app.trial.workato.com" -ForegroundColor Red
            } elseif ($startResponse.code_errors -and $startResponse.code_errors.Count -gt 0) {
                Write-Host "  [ERROR] Failed to start: Code errors detected" -ForegroundColor Red
            } else {
                Write-Host "  [ERROR] Failed to start: Unknown configuration issue" -ForegroundColor Red
            }
            $failed++
            
            if (-not $SkipFailed) {
                Write-Host ""
                Write-Host "========================================" -ForegroundColor Red
                Write-Host "Stopping due to recipe error" -ForegroundColor Red
                Write-Host "========================================" -ForegroundColor Red
                exit 1
            }
        } else {
            # No success field - assume it started
            Write-Host "  [OK] Started successfully" -ForegroundColor Green
            $started++
        }
    } catch {
        $errorMsg = $_.Exception.Message
        Write-Host "  [ERROR] Failed to start: $errorMsg" -ForegroundColor Red
        $failed++
        
        if (-not $SkipFailed) {
            Write-Host ""
            Write-Host "========================================" -ForegroundColor Red
            Write-Host "Stopping due to API error" -ForegroundColor Red
            Write-Host "========================================" -ForegroundColor Red
            exit 1
        }
    }
    
    Write-Host ""
    
    # Small delay to avoid rate limiting
    Start-Sleep -Milliseconds 500
}

# Summary
Write-Host "========================================" -ForegroundColor Blue
Write-Host "Summary" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host "Total recipes: $totalRecipes"
Write-Host "Started: $started" -ForegroundColor Green
Write-Host "Already running: $alreadyRunning" -ForegroundColor Yellow
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host ""

if ($failed -gt 0) {
    Write-Host "[WARN] Some recipes failed to start" -ForegroundColor Yellow
    Write-Host "Common reasons:" -ForegroundColor Yellow
    Write-Host "  - Connections not configured in Workato UI" -ForegroundColor Yellow
    Write-Host "  - Missing required fields or configuration" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Blue
    Write-Host "  1. Log in to Workato: https://app.trial.workato.com"
    Write-Host "  2. Navigate to each recipe that failed"
    Write-Host "  3. Configure the required connections (Salesforce, Stripe, etc.)"
    Write-Host "  4. Test the recipe manually"
    Write-Host "  5. Start the recipe from the Workato UI"
    Write-Host ""
}

if ($started -gt 0) {
    Write-Host "[OK] Successfully started $started recipe(s)" -ForegroundColor Green
}

if ($failed -gt 0) {
    exit 1
} else {
    exit 0
}
