@echo off
setlocal
set "ROOT=%~dp0.."
set "LOCAL_PYTHON=%ROOT%\.runtime\Python312\python.exe"
set "PYTHON_EXE="
set "PYTHON_CMD="

if exist "%LOCAL_PYTHON%" (
  set "PYTHON_EXE=%LOCAL_PYTHON%"
) else (
  py -3.12 --version >nul 2>nul
  if not errorlevel 1 (
    set "PYTHON_CMD=py -3.12"
  ) else (
    set "PYTHON_CMD=python"
  )
)

pushd "%ROOT%\Web-Defect-Detection-System" || exit /b 1
if defined PYTHON_EXE (
  "%PYTHON_EXE%" server.py %*
) else (
  %PYTHON_CMD% server.py %*
)
set "EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %EXIT_CODE%
