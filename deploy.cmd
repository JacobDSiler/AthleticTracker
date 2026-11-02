@echo off
REM Fueld - build check + push in one go (test gate, commit, push main -> Pages + Android/iOS CI).
REM The tray watcher calls the same push script when you tick deploy-tick.txt.
setlocal
cd /d "%~dp0"
set FD_NO_PAUSE=1
call "%~dp0build.cmd" || exit /b 1
set FD_NO_PAUSE=
call "%~dp0push.cmd"
endlocal
