#!/bin/bash

cp ./scripts/pre-commit-hook.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
echo "✅ Git hook installed."