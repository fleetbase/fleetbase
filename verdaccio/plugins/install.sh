#!/bin/bash

# Save the current working directory
current_dir=$(pwd)

# Navigate to the directory containing the plugins
cd /verdaccio/plugins

# Find all child directories and run npm install if package.json exists
for dir in */; do
    if [[ -f "${dir}package.json" ]]; then
        echo "Running npm install in $dir"
        cd "$dir"
        npm install
        npm run build
        cd "$current_dir" # Go back to the original directory
    else
        echo "No package.json found in $dir, skipping..."
    fi
done

echo "npm install completed for all verdaccio plugins."

# Install verdaccio-* directories globally
for dir in verdaccio-*; do
    if [ -d "$dir" ]; then
        echo "Installing $dir globally..."
        npm install -g "./$dir"
    fi
done

echo "Global installation of verdaccio plugins completed."
