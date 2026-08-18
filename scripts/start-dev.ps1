#Requires -Version 5.1
<#
.SYNOPSIS
  Starts the local EIC FC development environment.

.DESCRIPTION
  Checks Node and pnpm, starts Docker dependencies, applies migrations,
  starts Next.js, and opens the browser when the app is ready.

.EXAMPLE
  .\scripts\start-dev.ps1
  pnpm dev:local
  .\start-dev.cmd
#>
param(
  [switch]$SkipDocker,
  [switch]$SkipMigrate,
  [switch]$SkipBrowser,
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

function Write-Step([string]$Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Test-Command([string]$Name) {
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Test-TcpPort([int]$TargetPort) {
  return [bool](Get-NetTCPConnection -LocalPort $TargetPort -State Listen -ErrorAction SilentlyContinue)
}

function Get-PortOwner([int]$TargetPort) {
  $conn = Get-NetTCPConnection -LocalPort $TargetPort -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if (-not $conn) {
    return $null
  }
  $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
  return [PSCustomObject]@{
    Pid = $conn.OwningProcess
    Name = if ($process) { $process.ProcessName } else { "unknown" }
  }
}

function Remove-StaleNextDevProcesses([string]$ProjectRoot) {
  $normalizedRoot = $ProjectRoot.ToLowerInvariant()
  $processes = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
    Where-Object {
      $commandLine = if ($_.CommandLine) { $_.CommandLine.ToLowerInvariant() } else { "" }
      $commandLine.Contains($normalizedRoot) -and
      $commandLine.Contains("next") -and
      $commandLine.Contains("start-server")
    }

  foreach ($process in $processes) {
    Write-Host "Stopping stale Next.js process PID $($process.ProcessId)..." -ForegroundColor Yellow
    Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
  }

  if ($processes) {
    Start-Sleep -Seconds 1
  }
}

function Test-AppHealthy([string]$BaseUrl) {
  try {
    $resp = Invoke-RestMethod -Uri "$BaseUrl/api/health/live" -TimeoutSec 3
    return $resp.data.status -eq "ok"
  } catch {
    return $false
  }
}

function Open-Browser([string]$Url) {
  if ($SkipBrowser) {
    return
  }
  Start-Process $Url | Out-Null
}

function Wait-DockerReady([int]$TimeoutSec = 120) {
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    docker info *> $null
    if ($LASTEXITCODE -eq 0) {
      return
    }
    Start-Sleep -Seconds 2
  }
  throw "Docker did not become ready within ${TimeoutSec}s. Open Docker Desktop and retry."
}

function Wait-ComposeServices([int]$TimeoutSec = 120) {
  $services = @("postgres", "minio")
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    $allHealthy = $true
    foreach ($svc in $services) {
      $health = docker compose -f compose.dev.yml ps $svc --format "{{.Health}}" 2>$null
      if ($health -ne "healthy") {
        $allHealthy = $false
        break
      }
    }
    if ($allHealthy) {
      return
    }
    Start-Sleep -Seconds 2
  }
  throw "PostgreSQL and MinIO did not become healthy within ${TimeoutSec}s."
}

function Start-BrowserWhenReady([string]$BaseUrl, [int]$TimeoutSec = 120) {
  return Start-Job -ScriptBlock {
    param($Url, $Timeout, $Skip)
    if ($Skip) {
      return
    }
    $deadline = (Get-Date).AddSeconds($Timeout)
    while ((Get-Date) -lt $deadline) {
      try {
        $resp = Invoke-RestMethod -Uri "$Url/api/health/live" -TimeoutSec 2
        if ($resp.data.status -eq "ok") {
          Start-Process $Url | Out-Null
          return
        }
      } catch {
        # Wait for Next.js.
      }
      Start-Sleep -Seconds 2
    }
  } -ArgumentList $BaseUrl, $TimeoutSec, [bool]$SkipBrowser
}

# Prefer pi-node when available. Override with PI_NODE_HOME.
$PiNode = if ($env:PI_NODE_HOME) { $env:PI_NODE_HOME } else { Join-Path $env:LOCALAPPDATA "pi-node\current" }
if (Test-Path $PiNode) {
  $env:PATH = "$PiNode;$env:PATH"
}

# Add the local Docker CLI path when available. Override with DOCKER_BIN.
$DockerBin = if ($env:DOCKER_BIN) { $env:DOCKER_BIN } else { "E:\DockerProgram\resources\bin" }
if (Test-Path $DockerBin) {
  $env:PATH = "$DockerBin;$env:PATH"
}

$BaseUrl = "http://localhost:$Port"

Write-Step "Checking local environment"
if (-not (Test-Command "node")) {
  throw "Node was not found. Install Node 22+ or set PI_NODE_HOME."
}
$nodeVersion = node -p "process.versions.node"
$nodeMajor = [int]($nodeVersion.Split(".")[0])
Write-Host "Node $nodeVersion"
if ($nodeMajor -lt 22) {
  throw "Node 22+ is required. Current version: $nodeVersion."
}
if (-not (Test-Command "pnpm")) {
  throw "pnpm was not found. Install it with: npm install -g pnpm"
}
if (-not (Test-Path (Join-Path $RepoRoot ".env.local")) -and -not (Test-Path (Join-Path $RepoRoot ".env"))) {
  Write-Host "Warning: .env.local and .env were not found." -ForegroundColor Yellow
}

Write-Step "Checking development server"
if (Test-AppHealthy $BaseUrl) {
  Write-Host "The development server is already running: $BaseUrl" -ForegroundColor Green
  if ($SkipBrowser) {
    Write-Host "The app is ready." -ForegroundColor DarkGray
  } else {
    Open-Browser $BaseUrl
    Write-Host "Opened the app in your browser." -ForegroundColor DarkGray
  }
  exit 0
}

if (Test-TcpPort $Port) {
  $owner = Get-PortOwner $Port
  $ownerText = if ($owner) { "PID $($owner.Pid), process $($owner.Name)" } else { "an unknown process" }
  throw "Port $Port is occupied by $ownerText, but the EIC FC health endpoint is unavailable."
}

Remove-StaleNextDevProcesses $RepoRoot

if (-not $SkipDocker) {
  Write-Step "Starting Docker dependencies (PostgreSQL and MinIO)"
  if (-not (Test-Command "docker")) {
    $dockerDesktop = if ($env:DOCKER_DESKTOP) {
      $env:DOCKER_DESKTOP
    } else {
      "E:\DockerProgram\Docker Desktop.exe"
    }
    if (Test-Path $dockerDesktop) {
      Write-Host "Starting Docker Desktop..."
      Start-Process -FilePath $dockerDesktop | Out-Null
    } else {
      throw "Docker CLI and Docker Desktop were not found: $dockerDesktop"
    }
  } else {
    docker info *> $null
    if ($LASTEXITCODE -ne 0) {
      $dockerDesktop = if ($env:DOCKER_DESKTOP) {
        $env:DOCKER_DESKTOP
      } else {
        "E:\DockerProgram\Docker Desktop.exe"
      }
      if (Test-Path $dockerDesktop) {
        Write-Host "Starting Docker Desktop..."
        Start-Process -FilePath $dockerDesktop | Out-Null
      }
    }
  }
  Wait-DockerReady
  pnpm docker:dev:up
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to start Docker dependencies."
  }
  Write-Host "Waiting for PostgreSQL and MinIO..."
  Wait-ComposeServices
}

if (-not $SkipMigrate) {
  Write-Step "Applying database migrations"
  pnpm db:deploy
  if ($LASTEXITCODE -ne 0) {
    throw "Database migration failed."
  }
}

Write-Step "Starting Next.js development server"
Write-Host "URL: $BaseUrl" -ForegroundColor Green
Write-Host "Test accounts: captain / TestCaptain123!  |  testmember01 / TestMember123!" -ForegroundColor DarkGray
Write-Host "Press Ctrl+C to stop." -ForegroundColor DarkGray

$browserJob = Start-BrowserWhenReady -BaseUrl $BaseUrl

try {
  $env:PORT = "$Port"
  pnpm dev
  $devExitCode = $LASTEXITCODE
} finally {
  if ($browserJob) {
    Stop-Job $browserJob -ErrorAction SilentlyContinue
    Remove-Job $browserJob -Force -ErrorAction SilentlyContinue
  }
}

if ($devExitCode -ne 0) {
  exit $devExitCode
}
