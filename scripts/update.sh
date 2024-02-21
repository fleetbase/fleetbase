#!/bin/bash

# Exit the script as soon as a command fails
set -e

echo "Switching to the main branch..."
# git checkout main

echo "Updating submodules..."
git submodule update --init --recursive

echo "Updating console..."
cd console
git checkout main
git pull
cd ..

echo "Building Docker images..."
docker-compose build console
docker-compose build application

echo "Update completed. Run \`docker-compose up -d\` to launch!"
