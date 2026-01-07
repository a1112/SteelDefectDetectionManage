@echo off
setlocal
set "ROOT=%~dp0.."

if "%~1"=="" (
  if defined DTS_Python (
    echo Current DTS_Python: %DTS_Python%
  ) else (
    echo Current DTS_Python: (not set, using system python)
  )
  echo.
  echo [1] Set DTS_Python
  echo [2] Use system python (clear DTS_Python)
  echo [3] Code update (pull project + submodules)
  echo [4] Exit
  choice /c 1234 /n /m "Select:"
  if errorlevel 4 exit /b 0
  if errorlevel 3 goto code_update
  if errorlevel 2 goto clear_env
  if errorlevel 1 goto set_env
  exit /b 0
)

set "PYTHON_EXE=%~1"
goto apply_env

:set_env
set /p PYTHON_EXE=Enter python.exe full path: 
if "%PYTHON_EXE%"=="" (
  echo No path provided. Exit.
  exit /b 1
)

:apply_env
set "DTS_Python=%PYTHON_EXE%"
setx DTS_Python "%PYTHON_EXE%" >nul
echo DTS_Python set to "%PYTHON_EXE%".
exit /b 0

:clear_env
set "DTS_Python="
setx DTS_Python "" >nul
echo DTS_Python cleared. Using system python.
exit /b 0

:code_update
pushd "%ROOT%" || exit /b 1
git pull
git submodule update --init --recursive
git submodule foreach --recursive "git pull"
popd
