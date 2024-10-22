@echo off
REM Exit on error
setlocal
set ERRLEV=0
set /a ERRLEV=0 || goto :error

REM Build and run the Docker containers in detached mode
docker-compose up -d --build
if %errorlevel% neq 0 goto error

REM Optional: Wait for the container to be up (adjust the timeout if needed)
timeout /t 5 /nobreak

REM Run the deployment script inside the container
docker exec -ti fleetbase-application-1 sh -c "/fleetbase/api/deploy.sh"
if %errorlevel% neq 0 goto error

REM Print success message
echo Deployment script executed successfully, and the application is running.
goto end

:error
echo An error occurred during execution. Exiting...
exit /b 1

:end
exit /b 0
