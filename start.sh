#!/bin/sh

# Exit the script as soon as a command fails
set -e

# Display commands being run (useful for debugging)
set -x

# Build and run the Docker containers in detached mode
docker-compose up -d --build

# Give some time for the container to be up (optional but useful in some cases)
sleep 5

# Run database migrations or any setup script inside the application container
docker exec -ti fleetbase-application-1 sh -c "/fleetbase/api/deploy.sh"

# Print success message
echo "Deployment script executed successfully, and the application is running."
