param(
  [string]$NginxExePath = "plugins\\platforms\\windows\\nginx\\nginx.exe"
)

$ErrorActionPreference = "Stop"

function Get-RepoRoot {
  return (Resolve-Path $PSScriptRoot).Path
}

function Get-MapJsonPath($repoRoot) {
  $currentPath = Join-Path $repoRoot "Web-Defect-Detection-System\\configs\\current\\nginx.conf"
  if (Test-Path $currentPath) { return $currentPath }
  throw "nginx.conf not found in configs/current. Run update_nginx.cmd first."
}

function Write-TextNoBom($path, $content) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
}

$repoRoot = Get-RepoRoot
$generated = Get-MapJsonPath -repoRoot $repoRoot

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
