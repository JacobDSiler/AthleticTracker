@echo off
REM Fueld - local build check: runs the unit tests and builds the native web bundle (native\www). Nothing is pushed.
setlocal
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed. Get it from https://nodejs.org & pause & exit /b 1)
echo === Engine tests ===
node --test test/engine.test.mjs || (echo. & echo TESTS FAILED & pause & exit /b 1)
echo.
echo === Native web bundle ===
pushd native
if not exist node_modules (call npm install) 
call npm run build:www || (popd & echo BUILD FAILED & pause & exit /b 1)
popd
echo.
echo BUILD OK. Run deploy.cmd to publish.
if not defined FD_NO_PAUSE pause
endlocal
