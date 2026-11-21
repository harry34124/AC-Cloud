@echo off
if not exist "%~dp0dist\AC Cloud\AC Cloud.exe" (
 echo Build and install AC Cloud first: npm run build, then npm run install:local
 pause
 exit /b 1
)
start "" "%~dp0dist\AC Cloud\AC Cloud.exe"
