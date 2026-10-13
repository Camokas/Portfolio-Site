@echo off
setlocal

rem Always run commands from the folder containing this file.
cd /d "%~dp0"

if /i "%~1"=="start" goto start
if /i "%~1"=="stop" goto stop
if /i "%~1"=="status" goto status
if /i "%~1"=="logs" goto logs

:menu
cls
echo ========================================
echo        Portfolio Site local server
echo ========================================
echo.
echo [1] Start server
echo [2] Stop server
echo [3] Show server status
echo [4] Show server logs
echo [0] Exit
echo.
set "FROM_MENU=1"
set /p "CHOICE=Select an action: "

if "%CHOICE%"=="1" goto start
if "%CHOICE%"=="2" goto stop
if "%CHOICE%"=="3" goto status
if "%CHOICE%"=="4" goto logs
if "%CHOICE%"=="0" exit /b 0

echo.
echo Unknown option.
pause
goto menu

:start
echo.
echo Starting the local server...
call npm run astro -- dev --background
goto finish

:stop
echo.
echo Stopping the local server...
call npm run astro -- dev stop
goto finish

:status
echo.
echo Checking the local server...
call npm run astro -- dev status
goto finish

:logs
echo.
echo Reading the local server logs...
call npm run astro -- dev logs
goto finish

:finish
set "RESULT=%ERRORLEVEL%"

if defined FROM_MENU (
	echo.
	pause
	goto menu
)

exit /b %RESULT%
