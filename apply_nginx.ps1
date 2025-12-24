param(
  [string]$NginxExePath = "plugins\\platforms\\windows\\nginx\\nginx.exe"
)

$ErrorActionPreference = "Stop"

function Get-RepoRoot {
  return (Resolve-Path $PSScriptRoot).Path
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
  throw "map.json not found in DATA/$hostName or DEFAULT."
}

function Write-TextNoBom($path, $content) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
}

$repoRoot = Get-RepoRoot
$mapPath = Get-MapJsonPath -repoRoot $repoRoot
$mapDir = Split-Path -Parent $mapPath
$generated = Join-Path $mapDir "nginx.generated.conf"
if (-not (Test-Path $generated)) {
  throw "nginx.generated.conf not found at $generated"
}

$nginxRoot = Split-Path -Parent $NginxExePath
if (-not (Test-Path $nginxRoot)) {
  throw "nginx root not found at $nginxRoot"
}

$nginxConf = Join-Path $nginxRoot "conf\\nginx.conf"
$backup = "$nginxConf.bak"
$content = Get-Content -Raw -Path $generated

Copy-Item -Path $nginxConf -Destination $backup -Force
Write-TextNoBom -path $nginxConf -content $content
Write-Host "Applied nginx config to: $nginxConf (backup: $backup)"

$logsDir = Join-Path $nginxRoot "logs"
if (-not (Test-Path $logsDir)) {
  New-Item -ItemType Directory -Path $logsDir | Out-Null
}

& $NginxExePath -p $nginxRoot -c conf\\nginx.conf -t
& $NginxExePath -p $nginxRoot -c conf\\nginx.conf -s reload
if ($LASTEXITCODE -ne 0) {
  & $NginxExePath -p $nginxRoot -c conf\\nginx.conf
}
