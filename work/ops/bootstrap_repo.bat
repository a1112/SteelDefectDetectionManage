@echo off
setlocal

REM Usage: call work\ops\bootstrap_repo.bat
REM Optional: set PROJECT_ROOT=/opt/project
REM Optional: set REPO_URL=https://github.com/a1112/SteelDefectDetectionManage

if "%SSH_HOST%"=="" set SSH_HOST=111.230.72.96
if "%SSH_USER%"=="" set SSH_USER=root

set PROJECT_ROOT=%PROJECT_ROOT%
if "%PROJECT_ROOT%"=="" set PROJECT_ROOT=/opt/project

set REPO_URL=%REPO_URL%
if "%REPO_URL%"=="" set REPO_URL=https://github.com/a1112/SteelDefectDetectionManage

set REPO_DIR=%PROJECT_ROOT%/SteelDefectDetectionManage

ssh -o ServerAliveInterval=30 -o ServerAliveCountMax=120 %SSH_USER%@%SSH_HOST% "set -e; sudo apt update; sudo apt install -y git; sudo mkdir -p %PROJECT_ROOT%; cd %PROJECT_ROOT%; if [ -d %REPO_DIR%/.git ]; then echo '[info] Repo already exists: %REPO_DIR%'; else git clone --recurse-submodules %REPO_URL% %REPO_DIR%; fi; cd %REPO_DIR%; git submodule update --init --recursive; echo '[ok] Repo ready at: %REPO_DIR%'"

endlocal
