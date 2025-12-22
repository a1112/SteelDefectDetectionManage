@echo off
setlocal

set "HOST=root@111.230.72.96"
set "LOCAL_DIR=F:\SteelDefectDetectionManage\work\clash"
set "REMOTE_TMP=/tmp"
set "KEY_FILE="

if not "%KEY_FILE%"=="" (
  set "SSH_KEY=-i %KEY_FILE%"
) else (
  set "SSH_KEY="
)

echo Uploading files to %HOST%...
scp %SSH_KEY% "%LOCAL_DIR%\clash-linux-amd64-latest.gz" %HOST%:%REMOTE_TMP%/
if errorlevel 1 goto :error
scp %SSH_KEY% "%LOCAL_DIR%\1755607623989.yml" %HOST%:%REMOTE_TMP%/
if errorlevel 1 goto :error
scp %SSH_KEY% "%LOCAL_DIR%\install_clash.sh" %HOST%:%REMOTE_TMP%/
if errorlevel 1 goto :error

echo Running install script...
ssh %SSH_KEY% %HOST% "sh /tmp/install_clash.sh"
if errorlevel 1 goto :error

echo Done.
pause
exit /b 0

:error
echo Failed. Check network/ssh credentials and try again.
pause
exit /b 1
