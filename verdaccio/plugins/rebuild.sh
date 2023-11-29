#!/bin/bash

# Save the current working directory
current_dir=$(pwd)

# Navigate to the directory containing the plugins
cd /verdaccio/plugins

# Find all child directories and run npm install if package.json exists
for dir in */; do
    if [[ -f "${dir}package-lock.json" ]]; then
        echo "Running npm build in $dir"
        cd "$dir"
        npm run build
        cd "$current_dir"
    else
        echo "No package-lock.json found in $dir, skipping..."
    fi
done
