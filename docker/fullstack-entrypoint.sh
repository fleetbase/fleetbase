#!/usr/bin/env bash
set -e

echo "🚀 Fleetbase Fullstack Container Starting..."

# Graceful shutdown handler
trap 'echo "🛑 Caught termination signal, shutting down..."; kill $(jobs -p); wait' SIGTERM SIGINT

echo "🔧 Starting MySQL service..."
service mysql start

echo "🗄️ Configuring MySQL database and user..."
mysql --user=root <<-EOSQL
    CREATE DATABASE IF NOT EXISTS fleetbase;
    ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'secret';
    FLUSH PRIVILEGES;
EOSQL

echo "🧠 Waiting for MySQL to become ready..."
until mysqladmin ping --silent; do
    echo "⏳ Waiting for MySQL..."
    sleep 1
done
echo "✅ MySQL is ready."

echo "🔧 Starting Redis service..."
service redis-server start

echo "🧠 Waiting for Redis to become ready..."
until redis-cli ping | grep -q PONG; do
    echo "⏳ Waiting for Redis..."
    sleep 1
done
echo "✅ Redis is ready."

echo "📡 Launching SocketCluster on port 3800..."
node /fleetbase/socketcluster/index.js &

echo "🖥️ Serving Ember frontend on port 4200..."
npx serve -l 4200 /fleetbase/console/dist &

echo "📦 Running Fleetbase deploy script..."
sh /fleetbase/api/deploy.sh

echo "🧬 Starting Laravel API (FrankenPHP Octane) on port 8000..."
cd /fleetbase/api
exec php artisan octane:frankenphp --port=8000 --host=0.0.0.0