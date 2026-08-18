#Requires -Version 5.1
<#
.SYNOPSIS
  创建并启动 Cloudflare Tunnel，将 localhost:3000 映射到 czzczzzez.cloud

.NOTES
  前置：已安装 cloudflared，且已执行 `cloudflared tunnel login` 完成授权。
  域名 czzczzzez.cloud 必须已添加到同一 Cloudflare 账号。
#>
param(
  [string]$Hostname = "czzczzzez.cloud",
  [string]$WwwHostname = "www.czzczzzez.cloud",
  [string]$TunnelName = "eic-fc",
  [string]$Origin = "http://localhost:3000",
  [switch]$RunOnly
)

$ErrorActionPreference = "Stop"
$exe = Join-Path $env:LOCALAPPDATA "cloudflared\cloudflared.exe"
if (-not (Test-Path $exe)) {
  throw "未找到 cloudflared：$exe。请先安装。"
}

$cfDir = Join-Path $env:USERPROFILE ".cloudflared"
$cert = Join-Path $cfDir "cert.pem"
if (-not (Test-Path $cert)) {
  Write-Host "尚未登录 Cloudflare。正在打开登录页…"
  & $exe tunnel login
  if (-not (Test-Path $cert)) {
    throw "登录未完成：缺少 $cert"
  }
}

$configPath = Join-Path $cfDir "config.yml"

if (-not $RunOnly) {
  $existing = & $exe tunnel list 2>&1 | Out-String
  if ($existing -notmatch [regex]::Escape($TunnelName)) {
    Write-Host "创建 Tunnel: $TunnelName"
    & $exe tunnel create $TunnelName
  } else {
    Write-Host "Tunnel 已存在: $TunnelName"
  }

  $info = & $exe tunnel info $TunnelName 2>&1 | Out-String
  $tunnelId = $null
  if ($info -match "([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})") {
    $tunnelId = $Matches[1]
  }
  if (-not $tunnelId) {
    $list = & $exe tunnel list --output json 2>&1 | Out-String
    try {
      $parsed = $list | ConvertFrom-Json
      $hit = $parsed | Where-Object { $_.name -eq $TunnelName } | Select-Object -First 1
      $tunnelId = $hit.id
    } catch {}
  }
  if (-not $tunnelId) {
    throw "无法解析 Tunnel ID。请手动执行: cloudflared tunnel list"
  }

  $cred = Join-Path $cfDir "$tunnelId.json"
  if (-not (Test-Path $cred)) {
    throw "缺少凭证文件: $cred"
  }

  @"
tunnel: $tunnelId
credentials-file: $cred

ingress:
  - hostname: $Hostname
    service: $Origin
  - hostname: $WwwHostname
    service: $Origin
  - service: http_status:404
"@ | Set-Content -Path $configPath -Encoding UTF8

  Write-Host "已写入 $configPath"
  Write-Host "路由 DNS: $Hostname -> $TunnelName"
  & $exe tunnel route dns $TunnelName $Hostname
  Write-Host "路由 DNS: $WwwHostname -> $TunnelName"
  & $exe tunnel route dns $TunnelName $WwwHostname
}

Write-Host "启动 Tunnel（Origin: $Origin）…"
Write-Host "访问: https://$Hostname"
& $exe tunnel --config $configPath run $TunnelName
