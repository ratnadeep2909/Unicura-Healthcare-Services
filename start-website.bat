@echo off
setlocal

cd /d "%~dp0"

set "PORT_TO_USE=5000"

powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:5000/api/health' -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
if %errorlevel%==0 (
  echo UniCura is already running on port 5000.
  start "" "http://localhost:5000"
  echo.
  echo Opened existing UniCura server at http://localhost:5000
  echo.
  pause
  exit /b
)

netstat -ano | findstr ":5000" >nul
if %errorlevel%==0 (
  set "PORT_TO_USE=5001"
)

echo Starting UniCura on port %PORT_TO_USE%...
start "UniCura Server" cmd /k "cd /d "%~dp0" && set PORT=%PORT_TO_USE% && node server.js"

timeout /t 4 /nobreak >nul
start "" "http://localhost:%PORT_TO_USE%"

echo.
echo UniCura is opening at http://localhost:%PORT_TO_USE%
echo Keep the "UniCura Server" window open while using the website.
echo.
pause
