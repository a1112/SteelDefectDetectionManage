@echo off
setlocal

pushd ..\Figmaaidefectdetectionsystem
call npm install
call npm run build
popd

call npm install
call npm run dist

endlocal
