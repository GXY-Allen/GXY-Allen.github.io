@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies, first run only...
  call npm install
)
echo Starting preview at http://localhost:4321  (close this window to stop)
call npm run dev -- --open
pause
