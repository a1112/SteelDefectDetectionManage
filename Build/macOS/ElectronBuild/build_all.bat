@echo off
setlocal

REM Use China mirrors for Electron downloads
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
set ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/

pushd ..\Figmaaidefectdetectionsystem
call npm install
call npm run build
popd

call npm install
call npm run dist

endlocal
