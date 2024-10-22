# Exit on error
$ErrorActionPreference = "Stop"

# Display commands as they are executed
$VerbosePreference = "Continue"

# Build and run the Docker containers in detached mode
docker-compose up -d --build

# Optional: Wait for the container to be fully up (can adjust the sleep time as needed)
Start-Sleep -Seconds 5

# Run the deployment script inside the container
docker exec -ti fleetbase-application-1 sh -c "/fleetbase/api/deploy.sh"

# Print success message
Write-Host "Deployment script executed successfully, and the application is running."
