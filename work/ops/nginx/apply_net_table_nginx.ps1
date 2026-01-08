param(
  [string]$Domain = "localhost",
  [int]$FrontendPort = 3000,
  [int]$ConfigPort = 8119,
  [int]$SmallApiOffset = 100,
  [string]$NginxExePath = ""
)

$ErrorActionPreference = "Stop"

function Get-RepoRoot {
  $scriptDir = Split-Path -Parent $PSCommandPath
  return (Resolve-Path (Join-Path $scriptDir "..\\..\\..")).Path
}

function Get-HostName {
  return [System.Net.Dns]::GetHostName()
}

function Get-MapJsonPath($repoRoot) {
  $currentPath = Join-Path $repoRoot "Web-Defect-Detection-System\\configs\\current\\map.json"
  if (Test-Path $currentPath) { return $currentPath }
  $templatePath = Join-Path $repoRoot "Web-Defect-Detection-System\\configs\\template\\map.json"
  if (Test-Path $templatePath) { return $templatePath }
  throw "map.json not found in configs/current or configs/template."
}

function Read-MapPayload($mapPath) {
  $payload = Get-Content -Raw -Encoding UTF8 -Path $mapPath | ConvertFrom-Json
  if ($payload -is [System.Collections.IEnumerable] -and -not ($payload -is [pscustomobject])) {
    return @{ Lines = ,$payload; Views = @{} }
  }
  $views = @{}
  if ($payload.PSObject.Properties.Name -contains "views") {
    $views = $payload.views
  }
  if (-not $views) { $views = @{} }
  if ($payload.PSObject.Properties.Name -contains "lines") {
    return @{ Lines = ,$payload.lines; Views = $views }
  }
  if ($payload.PSObject.Properties.Name -contains "items") {
    return @{ Lines = ,$payload.items; Views = $views }
  }
  if ($payload.PSObject.Properties.Name -contains "data") {
    return @{ Lines = ,$payload.data; Views = $views }
  }
  return @{ Lines = @(); Views = $views }
}

function Resolve-ViewOffset($viewKey, $viewConfig, $index, $smallOffset) {
  if ($viewConfig -and $viewConfig.port_offset -ne $null) {
    return [int]$viewConfig.port_offset
  }
  if ($viewKey -eq "2D" -or $viewKey -eq "default") { return 0 }
  if ($viewKey -eq "small") { return $smallOffset }
  return $smallOffset * ($index + 1)
}

function Resolve-ViewSuffix($viewKey) {
  if ($viewKey -eq "2D" -or $viewKey -eq "default") { return "api" }
  if ($viewKey -eq "small") { return "small--api" }
  return "$viewKey--api"
}

function Build-NginxConfig($lines, $views) {
  $locations = @()
  $firstPort = $null
  $viewEntries = @()
  if ($views -and $views.PSObject.Properties.Count -gt 0) {
    foreach ($prop in $views.PSObject.Properties) {
      $viewEntries += @{ Key = $prop.Name; Config = $prop.Value }
    }
  } else {
    $viewEntries += @{ Key = "2D"; Config = @{} }
  }
  foreach ($line in $lines) {
    $name = [string]$line.name
    $key = [string]$line.key
    if ([string]::IsNullOrWhiteSpace($key)) { $key = $name }
    if ([string]::IsNullOrWhiteSpace($key)) { continue }
    $port = [int]$line.port
    if (-not $firstPort) { $firstPort = $port }
    $escaped = [uri]::EscapeDataString($key)
    for ($i = 0; $i -lt $viewEntries.Count; $i++) {
      $viewKey = $viewEntries[$i].Key
      $viewConfig = $viewEntries[$i].Config
      $suffix = Resolve-ViewSuffix -viewKey $viewKey
      $offset = Resolve-ViewOffset -viewKey $viewKey -viewConfig $viewConfig -index $i -smallOffset $SmallApiOffset
      $viewPort = $port + $offset
      $locations += @"
  location /$suffix/__LINE__/ {
    rewrite ^/$suffix/__LINE__/(.*)$ /api/`$1 break;
    proxy_pass http://127.0.0.1:__PORT__;
    proxy_set_header Host `$host;
    proxy_set_header X-Real-IP `$remote_addr;
    proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto `$scheme;
  }
"@ -replace "__LINE__", $escaped -replace "__PORT__", $viewPort
    }
  }

  if (-not $firstPort) { $firstPort = 8120 }

$serverBlock = @'
server {
  listen 80;
  server_name __DOMAIN__;

  location /config/ {
    if ($request_method = OPTIONS) {
      add_header Access-Control-Allow-Origin "https://tauri.localhost" always;
      add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
      add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;
      add_header Access-Control-Max-Age 86400 always;
      return 204;
    }
    add_header Access-Control-Allow-Origin "https://tauri.localhost" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;
    add_header Access-Control-Max-Age 86400 always;
    proxy_pass http://127.0.0.1:__CONFIG_PORT__;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location = /api/health {
    proxy_pass http://127.0.0.1:__HEALTH_PORT__;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

__LOCATIONS__

  location / {
    proxy_pass http://127.0.0.1:__FRONTEND_PORT__;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
'@
  $serverBlock = $serverBlock -replace "__DOMAIN__", $Domain `
    -replace "__CONFIG_PORT__", $ConfigPort `
    -replace "__HEALTH_PORT__", $firstPort `
    -replace "__FRONTEND_PORT__", $FrontendPort `
    -replace "__LOCATIONS__", ($locations -join "`n")

  $fullConfig = @'
worker_processes  1;

events {
  worker_connections  1024;
}

http {
  include       mime.types;
  default_type  application/octet-stream;

  sendfile        on;
  keepalive_timeout  65;

__SERVER__
}
'@
  return $fullConfig -replace "__SERVER__", $serverBlock
}

function Find-NginxRoot {
  if ($NginxExePath) {
    if (Test-Path $NginxExePath) {
      return Split-Path -Parent $NginxExePath
    }
    throw "nginx.exe not found at $NginxExePath"
  }
  $cmd = Get-Command nginx -ErrorAction SilentlyContinue
  if (-not $cmd) { return $null }
  $binDir = Split-Path -Parent $cmd.Source
  return Split-Path -Parent $binDir
}

function Write-TextNoBom($path, $content) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
}

$repoRoot = Get-RepoRoot
$mapPath = Get-MapJsonPath -repoRoot $repoRoot
$currentPayload = Read-MapPayload -mapPath $mapPath
$currentLines = $currentPayload.Lines
$currentViews = $currentPayload.Views
$currentConfig = Build-NginxConfig -lines $currentLines -views $currentViews

$currentDir = Split-Path -Parent $mapPath
$outputPath = Join-Path $currentDir "nginx.conf"
Write-TextNoBom -path $outputPath -content $currentConfig
Write-Host "Generated nginx config: $outputPath"

$nginxRoot = Find-NginxRoot
if (-not $nginxRoot) {
  Write-Host "nginx not found in PATH. Please install or set PATH, then copy config manually."
  exit 0
}

$targetConf = Join-Path $repoRoot "plugins\\platforms\\windows\\nginx\\conf\\nginx.conf"
Write-TextNoBom -path $targetConf -content $currentConfig
Write-Host "Copied nginx config to: $targetConf"

$nginxConf = Join-Path $nginxRoot "conf\\nginx.conf"
$backup = "$nginxConf.bak"
Copy-Item -Path $nginxConf -Destination $backup -Force
Write-TextNoBom -path $nginxConf -content $currentConfig
Write-Host "Applied nginx config to: $nginxConf (backup: $backup)"

$nginxBin = $NginxExePath
if (-not $nginxBin) {
  $nginxBin = "nginx"
}

$logsDir = Join-Path $nginxRoot "logs"
if (-not (Test-Path $logsDir)) {
  New-Item -ItemType Directory -Path $logsDir | Out-Null
}

& $nginxBin -p $nginxRoot -c conf\\nginx.conf -t
& $nginxBin -p $nginxRoot -c conf\\nginx.conf -s reload
if ($LASTEXITCODE -ne 0) {
  & $nginxBin -p $nginxRoot -c conf\\nginx.conf
}
