@echo off
setlocal

cd /d "%~dp0"

echo.
echo [EIC FC] Starting local development environment...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-dev.ps1" %*

if errorlevel 1 (
  echo.
  echo Startup failed. See the error message above.
  echo.
  pause
  exit /b 1
)

endlocal
