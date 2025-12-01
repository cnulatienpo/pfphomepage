@echo off
echo ==========================================
echo Building Kill Line Theme Builder installer...
echo ==========================================

echo.
REM Install dependencies
call npm install

echo.
REM Build Windows installer
call npm run build:win

IF %ERRORLEVEL% NEQ 0 (
  echo.
  echo Build failed. Check the errors above.
  pause
  exit /b %ERRORLEVEL%
)

echo.
echo Build finished.
echo Your installer should be in the dist folder.
pause
