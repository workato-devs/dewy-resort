# Stop all Workato recipes in descending order by recipe ID
# Uses the Workato Developer API
#
# Usage:
#   .\stop_workato_recipes.ps1              # Stop on first failure
#   .\stop_workato_recipes.ps1 -SkipFailed  # Continue on failures

param(
    [switch]$SkipFailed
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Blue
Write-Host "Stopping Workato Recipes" -ForegroundColor Blue
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
    Write-Host "Error: .env file not found at $EnvFile" -ForegroundColor Red
    Write-Host "Please create app\.env with WORKATO_API_TOKEN"
    exit 1
}

# Check for required environment variables
if (-not $env:WORKATO_API_TOKEN) {
    Write-Host "Error: WORKATO_API_TOKEN not set" -ForegroundColor Red
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
    Write-Host "Error: Failed to fetch recipes from Workato API" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

# Sort descending (reverse order from start)
$recipes = $recipesResponse.items | Sort-Object id -Descending

if (-not $recipes -or $recipes.Count -eq 0) {
    Write-Host "No recipes found" -ForegroundColor Yellow
    exit 0
}

$totalRecipes = $recipes.Count
Write-Host "Found $totalRecipes recipes" -ForegroundColor Green
Write-Host ""

# Counters
$stopped = 0
$failed = 0
$alreadyStopped = 0

# Stop each recipe
foreach ($recipe in $recipes) {
    $recipeId = $recipe.id
    $recipeName = $recipe.name
    $recipeRunning = $recipe.running
    
    Write-Host "Recipe ID: $recipeId - $recipeName" -ForegroundColor Blue
    
    # Check if recipe is already stopped
    if ($recipeRunning -eq $false) {
        Write-Host "  ⚠️  Already stopped, skipping..." -ForegroundColor Yellow
        $alreadyStopped++
        Write-Host ""
        continue
    }
    
    # Stop the recipe
    try {
        $stopResponse = Invoke-RestMethod -Uri "https://app.trial.workato.com/api/recipes/$recipeId/stop" -Headers $headers -Method Put
        
        if ($stopResponse.success -eq $true -or $null -eq $stopResponse.success) {
            Write-Host "  ✓ Stopped successfully" -ForegroundColor Green
            $stopped++
        } elseif ($stopResponse.success -eq $false) {
            $errorMsg = if ($stopResponse.message) { $stopResponse.message } else { "Unknown error" }
            Write-Host "  ✗ Failed to stop: $errorMsg" -ForegroundColor Red
            $failed++
            
            if (-not $SkipFailed) {
                Write-Host ""
                Write-Host "========================================" -ForegroundColor Red
                Write-Host "Stopping due to recipe error" -ForegroundColor Red
                Write-Host "========================================" -ForegroundColor Red
                exit 1
            }
        } else {
            Write-Host "  ✓ Stopped successfully" -ForegroundColor Green
            $stopped++
        }
    } catch {
        $errorMsg = $_.Exception.Message
        Write-Host "  ✗ Failed to stop: $errorMsg" -ForegroundColor Red
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
Write-Host "Stopped: $stopped" -ForegroundColor Green
Write-Host "Already stopped: $alreadyStopped" -ForegroundColor Yellow
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host ""

if ($failed -gt 0) {
    Write-Host "⚠️  Some recipes failed to stop" -ForegroundColor Yellow
    Write-Host "Common reasons:" -ForegroundColor Yellow
    Write-Host "  - Recipe has pending jobs that need to complete" -ForegroundColor Yellow
    Write-Host "  - API rate limiting or temporary errors" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Blue
    Write-Host "  1. Log in to Workato: https://app.trial.workato.com"
    Write-Host "  2. Navigate to each recipe that failed"
    Write-Host "  3. Check for pending jobs"
    Write-Host "  4. Stop the recipe manually from the Workato UI"
    Write-Host ""
}

if ($stopped -gt 0) {
    Write-Host "✓ Successfully stopped $stopped recipe(s)" -ForegroundColor Green
}

if ($failed -gt 0) {
    exit 1
} else {
    exit 0
}
