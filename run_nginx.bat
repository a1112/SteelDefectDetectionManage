@echo off
set "SCRIPT_DIR=%~dp0"
powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%apply_nginx.ps1" -NginxExePath "%SCRIPT_DIR%plugins\platforms\windows\nginx\nginx.exe"
