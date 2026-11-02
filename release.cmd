@echo off
REM Fueld - cut a store release: bumps the patch version, commits, tags vX.Y.Z and pushes the tag.
REM The tag makes GitHub Actions build signed Android (AAB/APK) + iOS (IPA) and, when the repo variables
REM PLAY_AUTO_UPLOAD / IOS_AUTO_UPLOAD are "true", upload them to Play (internal) and TestFlight.
REM Usage: release.cmd            (patch bump)   |   release.cmd minor   |   release.cmd major
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\fd-release.ps1" %*
endlocal
