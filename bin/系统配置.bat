@echo off
setlocal
set "ROOT=%~dp0.."
set "LOCAL_PYTHON=%ROOT%\.runtime\Python312\python.exe"

if "%~1"=="" (
  echo Backend Python:
  if exist "%LOCAL_PYTHON%" (
    echo   %LOCAL_PYTHON%
  ) else (
    py -3.12 --version >nul 2>nul
    if not errorlevel 1 (
      echo   py -3.12
    ) else (
      echo   python
    )
  )
  echo.
  echo [1] Start backend
  echo [2] Show backend Python
  echo [3] Code update ^(pull project + submodules^)
  echo [4] Exit
  choice /c 1234 /n /m "Select:"
  if errorlevel 4 exit /b 0
  if errorlevel 3 goto code_update
  if errorlevel 2 goto show_python
  if errorlevel 1 goto start_backend
  exit /b 0
)

if /i "%~1"=="backend" goto start_backend
if /i "%~1"=="python" goto show_python
if /i "%~1"=="update" goto code_update

echo Unknown command: %~1
echo Usage: %~nx0 [backend^|python^|update]
exit /b 1

:start_backend
if exist "%LOCAL_PYTHON%" (
  set "PYTHON_EXE=%LOCAL_PYTHON%"
  set "PYTHON_CMD="
) else (
  set "PYTHON_EXE="
  py -3.12 --version >nul 2>nul
  if not errorlevel 1 (
    set "PYTHON_CMD=py -3.12"
  ) else (
    set "PYTHON_CMD=python"
  )
)
pushd "%ROOT%\Web-Defect-Detection-System" || exit /b 1
if defined PYTHON_EXE (
  "%PYTHON_EXE%" server.py
) else (
  %PYTHON_CMD% server.py
)
set "EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %EXIT_CODE%

:show_python
if exist "%LOCAL_PYTHON%" (
  "%LOCAL_PYTHON%" --version
  echo %LOCAL_PYTHON%
  exit /b 0
)
py -3.12 --version >nul 2>nul
if not errorlevel 1 (
  py -3.12 --version
  echo py -3.12
  exit /b 0
)
python --version
echo python
exit /b 0

:code_update
pushd "%ROOT%" || exit /b 1
git pull
git submodule update --init --recursive
git submodule foreach --recursive "git pull"
popd
exit /b %ERRORLEVEL%
