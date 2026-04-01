@echo off
setlocal

echo Stopping UniCura server windows...
taskkill /FI "WINDOWTITLE eq UniCura Server*" /T /F >nul 2>&1

echo.
echo Done.
echo If a browser tab is still open, refresh after starting the website again.
echo.
pause
