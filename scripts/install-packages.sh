#!/bin/bash

# Find the root directory of your repository
root_dir=$(git rev-parse --show-toplevel)

# Check if the packages directory exists
packages_dir="$root_dir/packages"
if [ ! -d "$packages_dir" ]; then
    echo "Packages directory not found."
    exit 1
fi

# Initialize flags
remove_lock=false
remove_modules=false

for arg in "$@"
do
    case $arg in
        --remove-lock)
            remove_lock=true
            ;;
        --remove-modules)
            remove_modules=true
            ;;
    esac
done

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

        # Remove ./node_modules if the option is set
        if [ "$remove_modules" = true ] && [ -d "${dir}node_modules" ]; then
            echo "Removing /node_modules in $dir"
            rm -rf "${dir}node_modules"
        fi

        cd "$dir"
        pnpm install
        cd "$packages_dir" # Go back to the packages directory
    else
        echo "No package.json found in $dir, skipping..."
    fi
done
