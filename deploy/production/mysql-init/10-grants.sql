-- deploy.sh creates a second database, fleetbase_sandbox, so the app user needs more than the
-- one database the image grants. This covers both, and nothing else on the server.
GRANT ALL PRIVILEGES ON `fleetbase%`.* TO 'fleetbase'@'%';
FLUSH PRIVILEGES;
