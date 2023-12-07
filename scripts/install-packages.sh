#!/bin/bash

# Find the root directory of your repository
root_dir=$(git rev-parse --show-toplevel)

# Check if the packages directory exists
packages_dir="$root_dir/packages"
if [ ! -d "$packages_dir" ]; then
    echo "Packages directory not found."
    exit 1
fi

# Check for the command-line argument to remove pnpm-lock.yaml
remove_lock=false
if [ "$1" == "--remove-lock" ]; then
    remove_lock=true
fi

# Navigate to the packages directory
cd "$packages_dir"

# Find all child directories and run pnpm install if package.json exists
for dir in */; do
    if [[ -f "${dir}package.json" ]]; then
        echo "Running pnpm install in $dir"

        # Remove pnpm-lock.yaml if the option is set
        if [ "$remove_lock" = true ] && [ -f "${dir}pnpm-lock.yaml" ]; then
            echo "Removing pnpm-lock.yaml in $dir"
            rm "${dir}pnpm-lock.yaml"
        fi

        cd "$dir"
        pnpm install
        cd "$packages_dir" # Go back to the packages directory
    else
        echo "No package.json found in $dir, skipping..."
    fi
done
