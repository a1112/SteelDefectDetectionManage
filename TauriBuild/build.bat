@echo off
setlocal

set ROOT=%~dp0
set ROOT=%ROOT:~0,-1%

echo [1/2] Build frontend (Vite)...
pushd "%ROOT%\\..\\Figmaaidefectdetectionsystem"
if not exist node_modules (
  call npm install
  if errorlevel 1 exit /b 1
)
if not exist node_modules\\@tauri-apps\\api (
  call npm install
  if errorlevel 1 exit /b 1
)
call npm run build
if errorlevel 1 exit /b 1
popd

echo [2/2] Build Tauri desktop app...
pushd "%ROOT%"
if not exist node_modules (
  call npm install
  if errorlevel 1 exit /b 1
)
call npm run tauri:build
if errorlevel 1 exit /b 1
popd

echo Done.
