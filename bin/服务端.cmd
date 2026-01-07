@echo off
setlocal
set "ROOT=%~dp0.."
pushd "%ROOT%\Web-Defect-Detection-System" || exit /b 1
set "PYTHON_EXE=%DTS_Python%"
if not defined PYTHON_EXE set "PYTHON_EXE=python"
"%PYTHON_EXE%" server.py %*
popd
