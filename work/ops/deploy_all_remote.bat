@echo off
setlocal

REM Usage: call work\ops\deploy_all_remote.bat
REM Optional: set PROJECT_ROOT=/opt/project

if "%SSH_HOST%"=="" set SSH_HOST=111.230.72.96
if "%SSH_USER%"=="" set SSH_USER=root

set PROJECT_ROOT=%PROJECT_ROOT%
if "%PROJECT_ROOT%"=="" set PROJECT_ROOT=/opt/project

set REPO_DIR=%PROJECT_ROOT%/SteelDefectDetectionManage

ssh -o ServerAliveInterval=30 -o ServerAliveCountMax=120 %SSH_USER%@%SSH_HOST% "set -e; cd %REPO_DIR%; chmod +x work/ops/*.sh work/ops/steps/*.sh work/ops/maintenance/*.sh; bash work/ops/deploy_all.sh"

endlocal
