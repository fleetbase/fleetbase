'use strict';

/**
 * Fleetbase socket server entry point.
 *
 * Public listener (SOCKETCLUSTER_PORT, default 8000):   GET /health-check, WebSocket at /socketcluster/
 * Internal listener (SOCKETCLUSTER_INTERNAL_PORT, 8001): signed POST /publish, signed GET /stats
 *
 * See README.md for every environment variable and the auth modes.
 */

const { loadConfig, ConfigError } = require('./lib/config');
const { createSocketServer } = require('./lib/app');
const { createLogger, describeError } = require('./lib/logger');

function redactUrl(value) {
    try {
        const url = new URL(value);
        url.username = '';
        url.password = '';
        url.search = '';
        return url.toString();
    } catch (error) {
        return null;
    }
}

async function main() {
    let config;
    try {
        config = loadConfig(process.env);
    } catch (error) {
        const logger = createLogger({ level: 1 });
        logger.error({ event: 'socket_config_error', error: describeError(error) });
        process.exit(error instanceof ConfigError ? 78 : 1);
        return;
    }

    const logger = createLogger({ level: config.logLevel });
    for (const warning of config.warnings) {
        logger.warn({ event: 'socket_config_warning', message: warning });
    }

    const server = createSocketServer(config, { logger });
    const ports = await server.start();

    logger.info({
        event: 'socket_server_started',
        pid: process.pid,
        port: ports.port,
        internal_port: ports.internalPort,
        mode: config.mode,
        auth_enabled: config.authEnabled,
        client_publish: config.mode !== 'enforce',
        authorize_url: config.authEnabled ? redactUrl(config.authorizeUrl) : null,
        scc: Boolean(config.scc.stateServerHost),
    });

    let stopping = false;
    const shutdown = (signal) => {
        if (stopping) {
            return;
        }
        stopping = true;
        logger.info({ event: 'socket_server_stopping', signal });
        const force = setTimeout(() => process.exit(0), 10000);
        force.unref();
        server
            .stop()
            .catch((error) => logger.error({ event: 'socket_server_stop_error', error: describeError(error) }))
            .finally(() => process.exit(0));
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
    createLogger({ level: 1 }).error({ event: 'socket_server_fatal', error: describeError(error) });
    process.exit(1);
});
