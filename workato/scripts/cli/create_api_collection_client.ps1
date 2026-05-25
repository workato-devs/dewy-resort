# Create an API Platform client for an API collection and generate an API key.
# Uses wk CLI for auth and collection lookup; Invoke-RestMethod for v2 API client
# operations (wk doesn't have api client commands yet).
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

# Verify wk CLI is available
if (-not (Get-Command wk -ErrorAction SilentlyContinue)) {
    Write-Host "Error: wk CLI not found. Install it:" -ForegroundColor Red
    Write-Host "  Windows: scoop install wk"
    Write-Host "  macOS/Linux: brew install workato/tap/wk"
    exit 1
}

# Get auth details from wk CLI
try {
    $ApiToken = & wk auth token 2>$null
} catch {
    Write-Host "Error: Not authenticated. Run: wk auth login" -ForegroundColor Red
    exit 1
}
if (-not $ApiToken) {
    Write-Host "Error: Not authenticated. Run: wk auth login" -ForegroundColor Red
    exit 1
}

$AuthStatus = & wk auth status --json 2>$null | ConvertFrom-Json
$BaseUrl = $AuthStatus.base_url
if (-not $BaseUrl) {
    Write-Host "Error: Could not determine Workato base URL from wk auth status" -ForegroundColor Red
    exit 1
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Get-Item "$ScriptDir\..\..\..").FullName
$EnvFile = "$ProjectRoot\app\.env"

$headers = @{
    "Authorization" = "Bearer $ApiToken"
    "Content-Type" = "application/json"
}

Write-Host "========================================" -ForegroundColor Blue
Write-Host "Creating API Platform Client" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host "Collection: $CollectionName" -ForegroundColor Yellow
Write-Host "Client Name: $ClientName" -ForegroundColor Yellow
if ($ClientDescription) { Write-Host "Description: $ClientDescription" -ForegroundColor Yellow }
Write-Host "Workspace:  $BaseUrl" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# Step 1: Find the API collection using wk CLI
Write-Host "Step 1: Finding API collection..." -ForegroundColor Yellow

$collectionLines = & wk api collections list 2>$null
$collectionId = $null
foreach ($line in $collectionLines) {
    $fields = $line -split '\s+'
    if ($fields.Count -ge 2 -and $fields[1] -eq $CollectionName) {
        $collectionId = $fields[0]
        break
    }
}

if (-not $collectionId) {
    Write-Host "Error: Collection '$CollectionName' not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Available collections:" -ForegroundColor Yellow
    & wk api collections list 2>$null
    exit 1
}

# Get collection URL from REST API (wk table output doesn't include it)
$collectionUrl = $null
try {
    $collectionsResponse = Invoke-RestMethod -Uri "$BaseUrl/api/api_collections?per_page=100" -Headers $headers -Method Get
    $collection = $collectionsResponse | Where-Object { $_.name -eq $CollectionName }
    if ($collection) { $collectionUrl = $collection.url }
} catch { }

Write-Host "Found collection (ID: $collectionId)" -ForegroundColor Green
Write-Host ""

# Step 2: Check for existing API Platform client
Write-Host "Step 2: Checking for existing API Platform client..." -ForegroundColor Yellow

$clientId = $null
$apiKeyToken = $null

try {
    $clientsResponse = Invoke-RestMethod -Uri "$BaseUrl/api/v2/api_clients?per_page=100" -Headers $headers -Method Get

    $existingClient = $clientsResponse.data | Where-Object { $_.name -eq $ClientName }

    if ($existingClient) {
        Write-Host "API Platform client '$ClientName' already exists (ID: $($existingClient.id))" -ForegroundColor Yellow
        Write-Host "Using existing client..." -ForegroundColor Yellow
        $clientId = $existingClient.id

        try {
            $keysResponse = Invoke-RestMethod -Uri "$BaseUrl/api/v2/api_clients/$clientId/api_keys?per_page=100" -Headers $headers -Method Get

            if ($keysResponse.data -and $keysResponse.data.Count -gt 0) {
                $existingKeyId = $keysResponse.data[0].id
                Write-Host "Found existing API key (ID: $existingKeyId), refreshing..." -ForegroundColor Yellow

                $refreshResponse = Invoke-RestMethod -Uri "$BaseUrl/api/v2/api_clients/$clientId/api_keys/$existingKeyId/refresh_secret" -Headers $headers -Method Put
                $apiKeyToken = $refreshResponse.data.auth_token
                if (-not $apiKeyToken) { $apiKeyToken = $refreshResponse.data.token }
                if (-not $apiKeyToken) { $apiKeyToken = $refreshResponse.data.secret }
                Write-Host "Refreshed API key" -ForegroundColor Green
            }
        } catch { }
    }
} catch {
    if ($_.Exception.Response.StatusCode -eq 403) {
        Write-Host "Error: Make sure your auth profile has API Platform scopes enabled" -ForegroundColor Red
        exit 1
    }
}

# Step 3: Create client if it doesn't exist
if (-not $clientId) {
    Write-Host "Creating new API Platform client..." -ForegroundColor Yellow

    $requestBody = @{
        name = $ClientName
        api_collection_ids = @($collectionId.ToString())
        auth_type = "token"
    }
    if ($ClientDescription) { $requestBody.description = $ClientDescription }

    try {
        $createResponse = Invoke-RestMethod -Uri "$BaseUrl/api/v2/api_clients" -Headers $headers -Method Post -Body ($requestBody | ConvertTo-Json)
        $clientId = $createResponse.data.id
        Write-Host "Created API Platform client (ID: $clientId)" -ForegroundColor Green
    } catch {
        Write-Host "Error: Failed to create API Platform client" -ForegroundColor Red
        Write-Host $_.Exception.Message
        exit 1
    }
}

Write-Host ""

# Step 4: Create API key if we don't have one yet
if (-not $apiKeyToken) {
    Write-Host "Step 3: Creating API key..." -ForegroundColor Yellow

    $keyBody = @{ name = "Default Key"; active = $true }

    try {
        $keyResponse = Invoke-RestMethod -Uri "$BaseUrl/api/v2/api_clients/$clientId/api_keys" -Headers $headers -Method Post -Body ($keyBody | ConvertTo-Json)
        $apiKeyToken = $keyResponse.data.auth_token
        if (-not $apiKeyToken) { $apiKeyToken = $keyResponse.data.token }
        if (-not $apiKeyToken) { $apiKeyToken = $keyResponse.data.secret }
        Write-Host "Created API key" -ForegroundColor Green
    } catch {
        Write-Host "Error: Failed to create API key" -ForegroundColor Red
        Write-Host $_.Exception.Message
        exit 1
    }
}

Write-Host ""

# Step 5: Display results
Write-Host "========================================" -ForegroundColor Blue
Write-Host "API Platform Client Created Successfully" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""
Write-Host "Client Details:" -ForegroundColor Cyan
Write-Host "  Name: $ClientName"
Write-Host "  ID: $clientId"
Write-Host "  Collection: $CollectionName (ID: $collectionId)"
Write-Host ""
Write-Host "API Token: $apiKeyToken" -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANT: This token will only be shown once!" -ForegroundColor Red
Write-Host "   Save it now in a secure location." -ForegroundColor Red
Write-Host ""

if ($collectionUrl) {
    Write-Host "API Base URL: $collectionUrl" -ForegroundColor Cyan
    Write-Host ""
}

# Step 6: Update app\.env file
Write-Host "Step 4: Updating app\.env file..." -ForegroundColor Yellow

if (Test-Path $EnvFile) {
    $envContent = Get-Content $EnvFile -Raw

    if ($collectionUrl) {
        if ($envContent -match "SALESFORCE_API_COLLECTION_URL=") {
            $envContent = $envContent -replace "SALESFORCE_API_COLLECTION_URL=.*", "SALESFORCE_API_COLLECTION_URL=$collectionUrl"
            Write-Host "Updated SALESFORCE_API_COLLECTION_URL" -ForegroundColor Green
        } else {
            $envContent += "`nSALESFORCE_API_COLLECTION_URL=$collectionUrl`n"
            Write-Host "Added SALESFORCE_API_COLLECTION_URL" -ForegroundColor Green
        }
    }

    if ($apiKeyToken) {
        if ($envContent -match "SALESFORCE_API_AUTH_TOKEN=") {
            $envContent = $envContent -replace "SALESFORCE_API_AUTH_TOKEN=.*", "SALESFORCE_API_AUTH_TOKEN=$apiKeyToken"
            Write-Host "Updated SALESFORCE_API_AUTH_TOKEN" -ForegroundColor Green
        } else {
            $envContent += "SALESFORCE_API_AUTH_TOKEN=$apiKeyToken`n"
            Write-Host "Added SALESFORCE_API_AUTH_TOKEN" -ForegroundColor Green
        }
    }

    $envContent | Out-File -FilePath $EnvFile -Encoding UTF8 -NoNewline
    Write-Host "app\.env file updated successfully" -ForegroundColor Green
} else {
    Write-Host "app\.env file not found, skipping update" -ForegroundColor Yellow
}

Write-Host ""
exit 0
