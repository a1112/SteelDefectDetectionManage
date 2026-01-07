@echo off
setlocal
set "ROOT=%~dp0.."
pushd "%ROOT%\Figmaaidefectdetectionsystem" || exit /b 1
npm run dev
popd
