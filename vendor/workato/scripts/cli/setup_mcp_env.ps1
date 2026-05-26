# Retrieve MCP server URLs and tokens using wk CLI and update app\.env.
#
# Usage:
#   .\setup_mcp_env.ps1 [-EnvFile path\to\.env]

param(
    [string]$EnvFile
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command wk -ErrorAction SilentlyContinue)) {
    Write-Host "Error: wk CLI not found. Install it:" -ForegroundColor Red
    Write-Host "  Windows: scoop install wk"
    Write-Host "  macOS/Linux: brew install workato/tap/wk"
    exit 1
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Get-Item "$ScriptDir\..\..\..\..").FullName
if (-not $EnvFile) { $EnvFile = "$ProjectRoot\app\.env" }

function Update-EnvVar {
    param([string]$Key, [string]$Value, [string]$File)
    if (-not (Test-Path $File)) {
        Write-Host "  Warning: $File not found, skipping env update" -ForegroundColor Yellow
        return
    }
    $content = Get-Content $File -Raw
    if ($content -match "^${Key}=") {
        $content = $content -replace "(?m)^${Key}=.*", "${Key}=${Value}"
        Write-Host "  Updated ${Key}" -ForegroundColor Green
    } else {
        $content += "`n${Key}=${Value}"
        Write-Host "  Added ${Key}" -ForegroundColor Green
    }
    $content | Out-File -FilePath $File -Encoding UTF8 -NoNewline
}

Write-Host "========================================" -ForegroundColor Blue
Write-Host "Setting up MCP Server Environment" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

Write-Host "Step 1: Finding MCP servers..." -ForegroundColor Yellow
try {
    $serversJson = & wk mcp servers list --json 2>$null | Out-String
    $servers = $serversJson | ConvertFrom-Json
} catch {
    Write-Host "Error: Failed to list MCP servers. Are you authenticated? Run: wk auth login" -ForegroundColor Red
    exit 1
}

$guestServer = $servers.items | Where-Object { $_.name -eq "dewy-resort-guest" }
$managerServer = $servers.items | Where-Object { $_.name -eq "dewy-resort-manager" }

if (-not $guestServer) {
    Write-Host "Error: MCP server 'dewy-resort-guest' not found." -ForegroundColor Red
    Write-Host "Run 'make create-mcp-servers' first."
    exit 1
}
if (-not $managerServer) {
    Write-Host "Error: MCP server 'dewy-resort-manager' not found." -ForegroundColor Red
    Write-Host "Run 'make create-mcp-servers' first."
    exit 1
}

$guestHandle = $guestServer.id
$managerHandle = $managerServer.id
Write-Host "  Found guest server:   $guestHandle" -ForegroundColor Green
Write-Host "  Found manager server: $managerHandle" -ForegroundColor Green
Write-Host ""

Write-Host "Step 2: Retrieving MCP URLs..." -ForegroundColor Yellow
$guestInfo = & wk mcp servers get $guestHandle --json 2>$null | Out-String | ConvertFrom-Json
$guestMcpUrl = $guestInfo.mcp_url

$managerInfo = & wk mcp servers get $managerHandle --json 2>$null | Out-String | ConvertFrom-Json
$managerMcpUrl = $managerInfo.mcp_url

if (-not $guestMcpUrl -or -not $managerMcpUrl) {
    Write-Host "Error: Could not retrieve MCP URLs." -ForegroundColor Red
    Write-Host "  Guest:   $(if ($guestMcpUrl) { $guestMcpUrl } else { 'MISSING' })"
    Write-Host "  Manager: $(if ($managerMcpUrl) { $managerMcpUrl } else { 'MISSING' })"
    exit 1
}

$guestUrl = ($guestMcpUrl -split '\?')[0]
$guestToken = ($guestMcpUrl -split 'wkt_token=')[1]
$managerUrl = ($managerMcpUrl -split '\?')[0]
$managerToken = ($managerMcpUrl -split 'wkt_token=')[1]

Write-Host "  Guest URL:     $guestUrl" -ForegroundColor Green
Write-Host "  Guest token:   $($guestToken.Substring(0,8))..." -ForegroundColor Green
Write-Host "  Manager URL:   $managerUrl" -ForegroundColor Green
Write-Host "  Manager token: $($managerToken.Substring(0,8))..." -ForegroundColor Green
Write-Host ""

Write-Host "Step 3: Updating $EnvFile..." -ForegroundColor Yellow
Update-EnvVar -Key "MCP_GUEST_URL" -Value $guestUrl -File $EnvFile
Update-EnvVar -Key "MCP_GUEST_TOKEN" -Value $guestToken -File $EnvFile
Update-EnvVar -Key "MCP_GUEST_MCP_URL" -Value $guestMcpUrl -File $EnvFile
Update-EnvVar -Key "MCP_MANAGER_URL" -Value $managerUrl -File $EnvFile
Update-EnvVar -Key "MCP_MANAGER_TOKEN" -Value $managerToken -File $EnvFile
Update-EnvVar -Key "MCP_MANAGER_MCP_URL" -Value $managerMcpUrl -File $EnvFile

Write-Host ""
Write-Host "========================================" -ForegroundColor Blue
Write-Host "MCP Environment Setup Complete" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""
Write-Host "  Guest MCP:   $guestMcpUrl" -ForegroundColor Cyan
Write-Host "  Manager MCP: $managerMcpUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Values saved to $EnvFile" -ForegroundColor Green
Write-Host "  Full MCP URLs can be used directly with Claude, Codex, etc." -ForegroundColor Green
Write-Host ""
exit 0
