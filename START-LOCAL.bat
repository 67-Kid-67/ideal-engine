@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required to run the local web server.
  echo Install Node.js, then double-click START-LOCAL.bat again.
  pause
  exit /b 1
)
node serve-local.mjs 4175
pause
