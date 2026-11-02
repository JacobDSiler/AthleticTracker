@echo off
REM Fueld - double-click to run tests, commit and push everything to GitHub (-> fueld.jacobsiler.com + Android/iOS builds).
setlocal
set "PS1=%~dp0scripts\fd-push.ps1"
if not exist "%PS1%" (
  echo Could not find %PS1%
  pause
  exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
endlocal
