# Dev Server Management Script
# Usage: .\server.ps1 -Action {start|stop|restart|status} [-Environment <env>]
# Default environment: dev

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("start", "stop", "restart", "status")]
    [string]$Action,
    
    [ValidateSet("dev", "prod")]
    [string]$Environment = "dev"
)

$ErrorActionPreference = "Stop"

# Configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Get-Item "$ScriptDir\..\..").FullName
$VarDir = "$ProjectRoot\var"
$PidDir = "$VarDir\run"
$LogDir = "$VarDir\logs\node"

$PidFile = "$PidDir\server-$Environment.pid"
$LogFile = "$LogDir\$Environment.log"

# Ensure directories exist
New-Item -ItemType Directory -Force -Path $PidDir | Out-Null
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Test-ServerRunning {
    if (Test-Path $PidFile) {
        $pid = Get-Content $PidFile
        try {
            $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($process) { return $true }
        } catch { }
        # PID file exists but process is not running
        Remove-Item $PidFile -Force
    }
    return $false
}

function Test-PortInUse {
    $port = 3001
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    return $null -ne $connections
}

function Get-NpmCommand {
    switch ($Environment) {
        "dev" { return "npm run dev" }
        "prod" { return "npm run start" }
        default { return "npm run dev" }
    }
}

function Stop-Port3001 {
    $port = 3001
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    
    if ($connections) {
        Write-Host "Killing process(es) on port $port..." -ForegroundColor Yellow
        foreach ($conn in $connections) {
            $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "  Killing PID: $($proc.Id) ($($proc.ProcessName))"
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            }
        }
        Start-Sleep -Seconds 1
        
        $stillInUse = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        if ($stillInUse) {
            Write-Host "[WARN] Port $port still has listening process" -ForegroundColor Red
        } else {
            Write-Host "[OK] Port $port cleared" -ForegroundColor Green
        }
    }
}

function Start-Server {
    # Always kill anything on port 3001 first
    Stop-Port3001
    
    # Check if server is already running via PID file
    if (Test-ServerRunning) {
        Write-Host "Server is already running (PID: $(Get-Content $PidFile))" -ForegroundColor Yellow
        Write-Host "Restarting..." -ForegroundColor Yellow
        Stop-Server
        Start-Sleep -Seconds 2
    }
    
    Write-Host "Starting $Environment server..." -ForegroundColor Green
    Write-Host "Log file: $LogFile"
    
    Push-Location $ProjectRoot
    try {
        # Check for .env file
        if (-not (Test-Path "$ProjectRoot\.env")) {
            Write-Host "[ERROR] .env file not found at $ProjectRoot\.env" -ForegroundColor Red
            exit 1
        }
        
        # Load environment variables from .env
        $envVars = @{}
        Get-Content "$ProjectRoot\.env" | ForEach-Object {
            if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
                $envVars[$matches[1].Trim()] = $matches[2].Trim()
            }
        }
        
        # Get npm command
        $npmCmd = Get-NpmCommand
        
        # Start the process
        $processInfo = New-Object System.Diagnostics.ProcessStartInfo
        $processInfo.FileName = "cmd.exe"
        $processInfo.Arguments = "/c $npmCmd"
        $processInfo.WorkingDirectory = $ProjectRoot
        $processInfo.UseShellExecute = $false
        $processInfo.RedirectStandardOutput = $true
        $processInfo.RedirectStandardError = $true
        $processInfo.CreateNoWindow = $true
        
        # Set environment variables
        foreach ($key in $envVars.Keys) {
            $processInfo.EnvironmentVariables[$key] = $envVars[$key]
        }
        
        $process = [System.Diagnostics.Process]::Start($processInfo)
        
        # Save PID
        $process.Id | Out-File -FilePath $PidFile -Encoding ASCII
        
        # Start async output reading to log file
        $outputJob = Start-Job -ScriptBlock {
            param($proc, $logFile)
            while (-not $proc.HasExited) {
                $line = $proc.StandardOutput.ReadLine()
                if ($line) {
                    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                    "[$timestamp] $line" | Out-File -FilePath $logFile -Append -Encoding UTF8
                }
            }
        } -ArgumentList $process, $LogFile
        
        # Wait a moment and check if it's still running
        Start-Sleep -Seconds 2
        if (Test-ServerRunning) {
            Write-Host "[OK] Server started successfully (PID: $(Get-Content $PidFile))" -ForegroundColor Green
            Write-Host "->  Local:   http://localhost:3001" -ForegroundColor Green
            Write-Host "Tail logs with: Get-Content $LogFile -Wait -Tail 20"
        } else {
            Write-Host "[ERROR] Server failed to start. Check logs: $LogFile" -ForegroundColor Red
            exit 1
        }
    } finally {
        Pop-Location
    }
}

function Stop-Server {
    $stopped = $false
    
    # Stop process from PID file if it exists
    if (Test-Path $PidFile) {
        $pid = Get-Content $PidFile
        try {
            $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "Stopping server (PID: $pid)..." -ForegroundColor Yellow
                
                # Kill child processes
                Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq $pid } | ForEach-Object {
                    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
                }
                
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                $stopped = $true
            }
        } catch { }
        Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    }
    
    # Also kill any orphaned node processes running next
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -match "next" -and $_.CommandLine -match [regex]::Escape($ProjectRoot)
    }
    
    if ($nodeProcesses) {
        Write-Host "Cleaning up orphaned Next.js processes..." -ForegroundColor Yellow
        $nodeProcesses | ForEach-Object {
            Write-Host "  Killing Node PID: $($_.Id)"
            Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        }
        $stopped = $true
    }
    
    if ($stopped) {
        Write-Host "[OK] Server stopped" -ForegroundColor Green
    } else {
        Write-Host "Server is not running" -ForegroundColor Yellow
    }
}

function Show-Status {
    if (Test-ServerRunning) {
        $pid = Get-Content $PidFile
        Write-Host "[OK] Server is running" -ForegroundColor Green
        Write-Host "PID: $pid"
        Write-Host "Environment: $Environment"
        Write-Host "->  Local:   http://localhost:3001" -ForegroundColor Green
        Write-Host "Log file: $LogFile"
        Write-Host ""
        Write-Host "Recent logs:"
        if (Test-Path $LogFile) {
            Get-Content $LogFile -Tail 10
        } else {
            Write-Host "No logs available"
        }
    } else {
        Write-Host "Server is not running" -ForegroundColor Red
    }
}

# Main script logic
switch ($Action) {
    "start" { Start-Server }
    "stop" { Stop-Server }
    "restart" {
        Stop-Server
        Start-Sleep -Seconds 1
        Start-Server
    }
    "status" { Show-Status }
}
