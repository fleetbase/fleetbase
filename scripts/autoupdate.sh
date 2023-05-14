#!/bin/bash

git submodule update --init --recursive
git submodule update --recursive --remote
cd console
git checkout dev-main
git pull
cd ../packages/ember-core
git checkout dev-main
pnpm install
cd ../ember-ui
git checkout dev-main
pnpm install
cd ../fleetops-engine
git checkout dev-main
pnpm install
cd ../dev-engine
git checkout dev-main
pnpm install
cd ../storefront-engine
git checkout dev-main
pnpm install
cd ../../console
git checkout dev-main
pnpm install