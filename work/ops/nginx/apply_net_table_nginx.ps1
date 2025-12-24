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
  $hostName = Get-HostName
  $dataPath = Join-Path $repoRoot "Web-Defect-Detection-System\\configs\\net_tabel\\DATA\\$hostName\\map.json"
  if (Test-Path $dataPath) { return $dataPath }
  $defaultPath = Join-Path $repoRoot "Web-Defect-Detection-System\\configs\\net_tabel\\DEFAULT\\map.json"
  if (Test-Path $defaultPath) { return $defaultPath }
  throw "map.json not found in DATA/$host or DEFAULT."
}

function Read-Lines($mapPath) {
  $payload = Get-Content -Raw -Path $mapPath | ConvertFrom-Json
  if ($payload -is [System.Collections.IEnumerable] -and -not ($payload -is [pscustomobject])) {
    return ,$payload
  }
  if ($payload.PSObject.Properties.Name -contains "lines") {
    return ,$payload.lines
  }
  if ($payload.PSObject.Properties.Name -contains "items") {
    return ,$payload.items
  }
  if ($payload.PSObject.Properties.Name -contains "data") {
    return ,$payload.data
  }
  return @()
}

function Build-NginxConfig($lines) {
  $locations = @()
  $firstPort = $null
  foreach ($line in $lines) {
    $name = [string]$line.name
    $key = [string]$line.key
    if ([string]::IsNullOrWhiteSpace($key)) { $key = $name }
    if ([string]::IsNullOrWhiteSpace($key)) { continue }
    $port = [int]$line.port
    if (-not $firstPort) { $firstPort = $port }
    $escaped = [uri]::EscapeDataString($key)
    $locations += @'
  location /api/__LINE__/ {
    rewrite ^/api/__LINE__/(.*)$ /api/$1 break;
    proxy_pass http://127.0.0.1:__PORT__;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /small--api/__LINE__/ {
    rewrite ^/small--api/__LINE__/(.*)$ /api/$1 break;
    proxy_pass http://127.0.0.1:__SMALL_PORT__;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
'@ -replace "__LINE__", $escaped -replace "__PORT__", $port -replace "__SMALL_PORT__", ($port + $SmallApiOffset)
  }

  if (-not $firstPort) { $firstPort = 8120 }

  $serverBlock = @'
server {
  listen 80;
  server_name __DOMAIN__;

  location /config/ {
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
$netTableRoot = Join-Path $repoRoot "Web-Defect-Detection-System\\configs\\net_tabel"
$mapPath = Get-MapJsonPath -repoRoot $repoRoot

$allMapPaths = @()
$defaultMap = Join-Path $netTableRoot "DEFAULT\\map.json"
if (Test-Path $defaultMap) { $allMapPaths += $defaultMap }
$dataMaps = Get-ChildItem -Path (Join-Path $netTableRoot "DATA") -Filter "map.json" -Recurse -ErrorAction SilentlyContinue
foreach ($item in $dataMaps) { $allMapPaths += $item.FullName }

foreach ($path in $allMapPaths) {
  $dir = Split-Path -Parent $path
  $lines = Read-Lines -mapPath $path
  $config = Build-NginxConfig -lines $lines
  $outputPath = Join-Path $dir "nginx.generated.conf"
  Write-TextNoBom -path $outputPath -content $config
  Write-Host "Generated nginx config: $outputPath"
}

$currentLines = Read-Lines -mapPath $mapPath
$currentConfig = Build-NginxConfig -lines $currentLines
$netTableCopy = Join-Path $netTableRoot "nginx.generated.conf"
Write-TextNoBom -path $netTableCopy -content $currentConfig
Write-Host "Copied nginx config to: $netTableCopy"

$nginxRoot = Find-NginxRoot
if (-not $nginxRoot) {
  Write-Host "nginx not found in PATH. Please install or set PATH, then copy config manually."
  exit 0
}

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
