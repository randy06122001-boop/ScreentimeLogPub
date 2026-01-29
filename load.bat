@echo off
REM ScreenTimeLog App Loader for Windows

cd /d "%~dp0"

IF NOT EXIST "node_modules" (
    echo Installing dependencies...
    call npm install
)

echo Starting ScreenTimeLog...
call npm start
