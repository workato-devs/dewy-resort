# Create an API Platform client for an API collection and generate an API key
# Uses the Workato API Platform endpoints
#
# Usage:
#   .\create_api_collection_client.ps1 -CollectionName "sf-api-collection" -ClientName "SF API Client"

param(
    [Parameter(Mandatory=$true)]
    [string]$CollectionName,
    
    [Parameter(Mandatory=$true)]
    [string]$ClientName,
    
    [string]$ClientDescription
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Blue
Write-Host "Creating API Platform Client" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host "Collection: $CollectionName" -ForegroundColor Yellow
Write-Host "Client Name: $ClientName" -ForegroundColor Yellow
if ($ClientDescription) {
    Write-Host "Description: $ClientDescription" -ForegroundColor Yellow
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
    exit 1
}

if (-not $env:WORKATO_API_TOKEN) {
    Write-Host "[ERROR] WORKATO_API_TOKEN not set" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $env:WORKATO_API_TOKEN"
    "Content-Type" = "application/json"
}

# Step 1: Find the API collection
Write-Host "Step 1: Finding API collection..." -ForegroundColor Yellow

try {
    $collectionsResponse = Invoke-RestMethod -Uri "https://app.trial.workato.com/api/api_collections?per_page=100" -Headers $headers -Method Get
} catch {
    Write-Host "[ERROR] Failed to fetch API collections" -ForegroundColor Red
    exit 1
}

$collection = $collectionsResponse | Where-Object { $_.name -eq $CollectionName }

if (-not $collection) {
    Write-Host "[ERROR] Collection '$CollectionName' not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Available collections:" -ForegroundColor Yellow
    $collectionsResponse | ForEach-Object { Write-Host "  - $($_.name) (ID: $($_.id))" }
    exit 1
}

$collectionId = $collection.id
Write-Host "[OK] Found collection (ID: $collectionId)" -ForegroundColor Green
Write-Host ""

# Step 2: Check if API Platform client already exists
Write-Host "Step 2: Checking for existing API Platform client..." -ForegroundColor Yellow

$apiToken = $null
$clientId = $null

try {
    $clientsResponse = Invoke-RestMethod -Uri "https://app.trial.workato.com/api/v2/api_clients?per_page=100" -Headers $headers -Method Get
    
    $existingClient = $clientsResponse.data | Where-Object { $_.name -eq $ClientName }
    
    if ($existingClient) {
        Write-Host "[WARN] API Platform client '$ClientName' already exists (ID: $($existingClient.id))" -ForegroundColor Yellow
        Write-Host "Using existing client..." -ForegroundColor Yellow
        $clientId = $existingClient.id
        
        # Try to get existing keys and refresh
        try {
            $keysResponse = Invoke-RestMethod -Uri "https://app.trial.workato.com/api/v2/api_clients/$clientId/api_keys?per_page=100" -Headers $headers -Method Get
            
            if ($keysResponse.data -and $keysResponse.data.Count -gt 0) {
                $existingKeyId = $keysResponse.data[0].id
                Write-Host "Found existing API key (ID: $existingKeyId)" -ForegroundColor Yellow
                Write-Host "Refreshing the key secret..." -ForegroundColor Yellow
                
                $refreshResponse = Invoke-RestMethod -Uri "https://app.trial.workato.com/api/v2/api_clients/$clientId/api_keys/$existingKeyId/refresh_secret" -Headers $headers -Method Put
                $apiToken = $refreshResponse.data.auth_token
                if (-not $apiToken) { $apiToken = $refreshResponse.data.token }
                if (-not $apiToken) { $apiToken = $refreshResponse.data.secret }
                Write-Host "[OK] Refreshed API key" -ForegroundColor Green
            }
        } catch { }
    }
} catch {
    if ($_.Exception.Message -match "message") {
        Write-Host "[WARN] Make sure your WORKATO_API_TOKEN has API Platform scopes enabled" -ForegroundColor Yellow
    }
}

# Step 3: Create the API Platform client if needed
if (-not $clientId) {
    Write-Host "Creating new API Platform client..." -ForegroundColor Yellow
    
    $requestBody = @{
        name = $ClientName
        api_collection_ids = @($collectionId.ToString())
        auth_type = "token"
    }
    
    if ($ClientDescription) {
        $requestBody.description = $ClientDescription
    }
    
    try {
        $createResponse = Invoke-RestMethod -Uri "https://app.trial.workato.com/api/v2/api_clients" -Headers $headers -Method Post -Body ($requestBody | ConvertTo-Json)
        $clientId = $createResponse.data.id
        Write-Host "[OK] Created API Platform client (ID: $clientId)" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Failed to create API Platform client" -ForegroundColor Red
        Write-Host $_.Exception.Message
        exit 1
    }
}

Write-Host ""

# Step 4: Create or get API key
if (-not $apiToken) {
    Write-Host "Step 3: Creating API key..." -ForegroundColor Yellow
    
    $keyBody = @{
        name = "Default Key"
        active = $true
    }
    
    try {
        $keyResponse = Invoke-RestMethod -Uri "https://app.trial.workato.com/api/v2/api_clients/$clientId/api_keys" -Headers $headers -Method Post -Body ($keyBody | ConvertTo-Json)
        $apiToken = $keyResponse.data.auth_token
        if (-not $apiToken) { $apiToken = $keyResponse.data.token }
        if (-not $apiToken) { $apiToken = $keyResponse.data.secret }
        Write-Host "[OK] Created API key" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Failed to create API key" -ForegroundColor Red
        Write-Host $_.Exception.Message
        exit 1
    }
}

Write-Host ""

# Step 5: Display the results
Write-Host "========================================" -ForegroundColor Blue
Write-Host "API Platform Client Created Successfully" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""
Write-Host "Client Details:" -ForegroundColor Cyan
Write-Host "  Name: $ClientName"
Write-Host "  ID: $clientId"
Write-Host "  Collection: $CollectionName (ID: $collectionId)"
Write-Host ""
Write-Host "API Token:" -ForegroundColor Cyan
Write-Host $apiToken -ForegroundColor Yellow
Write-Host ""
Write-Host "[IMPORTANT] This token will only be shown once!" -ForegroundColor Red
Write-Host "   Save it now in a secure location." -ForegroundColor Red
Write-Host ""

# Get the API collection URL
$apiUrl = $collection.url

if ($apiUrl) {
    Write-Host "API Base URL:" -ForegroundColor Cyan
    Write-Host $apiUrl -ForegroundColor Yellow
    Write-Host ""
}

# Step 6: Update app\.env file
Write-Host "Step 4: Updating app\.env file..." -ForegroundColor Yellow

if (Test-Path $EnvFile) {
    $envContent = Get-Content $EnvFile -Raw
    
    # Update or add SALESFORCE_API_COLLECTION_URL
    if ($envContent -match "SALESFORCE_API_COLLECTION_URL=") {
        $envContent = $envContent -replace "SALESFORCE_API_COLLECTION_URL=.*", "SALESFORCE_API_COLLECTION_URL=$apiUrl"
        Write-Host "[OK] Updated SALESFORCE_API_COLLECTION_URL" -ForegroundColor Green
    } else {
        $envContent += "`n# Workato API Collection Configuration`nSALESFORCE_API_COLLECTION_URL=$apiUrl`n"
        Write-Host "[OK] Added SALESFORCE_API_COLLECTION_URL" -ForegroundColor Green
    }
    
    # Update or add SALESFORCE_API_AUTH_TOKEN
    if ($envContent -match "SALESFORCE_API_AUTH_TOKEN=") {
        $envContent = $envContent -replace "SALESFORCE_API_AUTH_TOKEN=.*", "SALESFORCE_API_AUTH_TOKEN=$apiToken"
        Write-Host "[OK] Updated SALESFORCE_API_AUTH_TOKEN" -ForegroundColor Green
    } else {
        $envContent += "SALESFORCE_API_AUTH_TOKEN=$apiToken`n"
        Write-Host "[OK] Added SALESFORCE_API_AUTH_TOKEN" -ForegroundColor Green
    }
    
    $envContent | Out-File -FilePath $EnvFile -Encoding UTF8 -NoNewline
    Write-Host "[OK] app\.env file updated successfully" -ForegroundColor Green
} else {
    Write-Host "[WARN] app\.env file not found, skipping update" -ForegroundColor Yellow
}

Write-Host ""
exit 0
