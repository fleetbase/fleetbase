#!/bin/bash

cd packages/core-api
git add .
git commit -m 'latest'
git push origin dev-main
cd ../dev-engine
git add .
git commit -m 'latest'
git push origin dev-main
cd ../ember-core
git add .
git commit -m 'latest'
git push origin dev-main
cd ../ember-ui
git add .
git commit -m 'latest'
git push origin dev-main
cd ../fleetops-api
git add .
git commit -m 'latest'
git push origin dev-main
cd ../fleetops-data
git add .
git commit -m 'latest'
git push origin dev-main
cd ../fleetops-engine
git add .
git commit -m 'latest'
git push origin dev-main
cd ../storefront-api
git add .
git commit -m 'latest'
git push origin dev-main
cd ../storefront-engine
git add .
git commit -m 'latest'
git push origin dev-main
cd ../iam-engine
git add .
git commit -m 'latest'
git push origin dev-main
cd ../fleetbase-extensions-indexer
git add .
git commit -m 'latest'
git push origin main