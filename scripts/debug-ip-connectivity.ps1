$ErrorActionPreference = "Continue"
$logPath = Join-Path (Split-Path $PSScriptRoot -Parent) "debug-b0a561.log"
$sessionId = "b0a561"
$runId = "initial"

function Write-AgentLog {
  param(
    [string]$HypothesisId,
    [string]$Location,
    [string]$Message,
    [hashtable]$Data
  )

  @{
    sessionId = $sessionId
    runId = $runId
    hypothesisId = $HypothesisId
    location = $Location
    message = $Message
    data = $Data
    timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  } | ConvertTo-Json -Compress -Depth 5 | Add-Content -Path $logPath -Encoding UTF8
}

$proxyEnvPresent = [bool](
  $env:HTTP_PROXY -or $env:HTTPS_PROXY -or $env:ALL_PROXY
)
$systemProxyEnabled = $false
try {
  $internetSettings = Get-ItemProperty `
    "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings"
  $systemProxyEnabled = $internetSettings.ProxyEnable -eq 1
} catch {}
$benchmarkRoutes = @(
  Get-NetRoute -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.DestinationPrefix -like "198.18.*" } |
    Select-Object -ExpandProperty DestinationPrefix
)

#region agent log
Write-AgentLog "H1" "scripts/debug-ip-connectivity.ps1:36" `
  "Captured local proxy and virtual-route indicators" @{
    proxyEnvironmentPresent = $proxyEnvPresent
    systemProxyEnabled = $systemProxyEnabled
    benchmarkRouteCount = $benchmarkRoutes.Count
    benchmarkRoutes = $benchmarkRoutes
  }
#endregion

$dnsResults = @()
foreach ($server in @("223.5.5.5", "8.8.8.8")) {
  try {
    $answers = @(
      Resolve-DnsName "czzczzzez.cloud" -Type A -Server $server `
        -DnsOnly -ErrorAction Stop |
        Where-Object { $_.Type -eq "A" } |
        Select-Object -ExpandProperty IPAddress
    )
    $dnsResults += @{ server = $server; answers = $answers; error = $null }
  } catch {
    $dnsResults += @{
      server = $server
      answers = @()
      error = $_.Exception.Message
    }
  }
}

#region agent log
Write-AgentLog "H4" "scripts/debug-ip-connectivity.ps1:59" `
  "Queried public DNS resolvers for the production domain" @{
    results = $dnsResults
  }
#endregion

$portResults = @()
foreach ($port in @(80, 443, 22)) {
  $result = Test-NetConnection "47.109.110.141" -Port $port `
    -InformationLevel Detailed -WarningAction SilentlyContinue
  $portResults += @{
    port = $port
    succeeded = [bool]$result.TcpTestSucceeded
    sourceAddress = [string]$result.SourceAddress
    interfaceAlias = [string]$result.InterfaceAlias
  }
}

#region agent log
Write-AgentLog "H2" "scripts/debug-ip-connectivity.ps1:76" `
  "Tested TCP reachability to production ports" @{
    results = $portResults
  }
#endregion

$httpResults = @()
foreach ($target in @(
  "http://47.109.110.141/api/health/live",
  "http://czzczzzez.cloud/api/health/live"
)) {
  $output = & curl.exe --noproxy "*" --max-time 12 -sS `
    -o NUL -w "status=%{http_code};remote=%{remote_ip}" $target 2>&1
  $httpResults += @{
    target = $target
    exitCode = $LASTEXITCODE
    result = [string]$output
  }
}

#region agent log
Write-AgentLog "H1,H2,H3,H4" "scripts/debug-ip-connectivity.ps1:95" `
  "Requested application health endpoint with curl proxy bypass" @{
    results = $httpResults
  }
#endregion

$controlResults = @()
foreach ($target in @(
  @{ host = "www.aliyun.com"; port = 80 },
  @{ host = "www.aliyun.com"; port = 443 }
)) {
  $result = Test-NetConnection $target.host -Port $target.port `
    -InformationLevel Detailed -WarningAction SilentlyContinue
  $controlResults += @{
    host = $target.host
    port = $target.port
    succeeded = [bool]$result.TcpTestSucceeded
    interfaceAlias = [string]$result.InterfaceAlias
  }
}

#region agent log
Write-AgentLog "H5" "scripts/debug-ip-connectivity.ps1:113" `
  "Tested control HTTP and HTTPS destinations from the same client" @{
    results = $controlResults
  }
#endregion

$targetRoute = Find-NetRoute -RemoteIPAddress "47.109.110.141" `
  -ErrorAction SilentlyContinue

#region agent log
Write-AgentLog "H6" "scripts/debug-ip-connectivity.ps1:123" `
  "Captured the selected route to the production server" @{
    interfaceAlias = [string]$targetRoute.InterfaceAlias
    nextHop = [string]$targetRoute.NextHop
    localAddressFamily = [string]$targetRoute.LocalIPAddress.AddressFamily
  }
#endregion

Write-Output "诊断完成：$logPath"
