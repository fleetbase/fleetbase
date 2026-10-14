'use strict';

/**
 * Assembles the socket server: the public HTTP/WebSocket listener (health check plus
 * SocketCluster at /socketcluster/), the auth middleware, the internal publish/stats
 * listener and, when SCC_STATE_SERVER_HOST is set, the SCC broker client.
 */

const http = require('http');
const socketClusterServer = require('socketcluster-server');
const { buildServerOptions } = require('./config');
const { deriveKey, PURPOSE_AUTHORIZE, PURPOSE_PUBLISH } = require('./signing');
const { Authorizer } = require('./authorizer');
const { SocketAuthPolicy } = require('./middleware');
const { createInternalHandler } = require('./internal');
const { Stats } = require('./stats');
const { createLogger, describeError } = require('./logger');

function publicHandler(req, res) {
    const path = (req.url || '/').split('?')[0];
    if (path === '/health-check' && (req.method === 'GET' || req.method === 'HEAD')) {
        res.writeHead(200, { 'Content-Type': 'text/plain', 'Content-Length': 2, 'Cache-Control': 'no-store' });
        res.end(req.method === 'HEAD' ? undefined : 'OK');
        return;
    }
    req.resume();
    res.writeHead(404, { 'Content-Type': 'text/plain', 'Content-Length': 9 });
    res.end('Not Found');
}

function listen(server, port) {
    return new Promise((resolve, reject) => {
        const onError = (error) => {
            server.off('listening', onListening);
            reject(error);
        };
        const onListening = () => {
            server.off('error', onError);
            resolve(server.address().port);
        };
        server.once('error', onError);
        server.once('listening', onListening);
        server.listen(port);
    });
}

function closeHttpServer(server) {
    return new Promise((resolve) => {
        if (!server.listening) {
            resolve();
            return;
        }
        server.close(() => resolve());
        if (typeof server.closeAllConnections === 'function') {
            server.closeAllConnections();
        }
    });
}

/**
 * @param {ReturnType<import('./config').loadConfig>} config
 * @param {object} [deps]
 * @param {object} [deps.logger]
 * @param {typeof fetch} [deps.fetch] used for the authorize call
 * @param {number} [deps.authorizeTimeoutMs]
 */
function createSocketServer(config, deps = {}) {
    const logger = deps.logger || createLogger({ level: config.logLevel });
    const stats = new Stats();

    const httpServer = http.createServer(publicHandler);
    const agServer = socketClusterServer.attach(httpServer, buildServerOptions(config));

    const authorizer = config.authEnabled
        ? new Authorizer({
              url: config.authorizeUrl,
              authorizeKey: deriveKey(config.authKey, PURPOSE_AUTHORIZE),
              timeoutMs: deps.authorizeTimeoutMs,
              fetch: deps.fetch,
              stats,
          })
        : null;

    const policy = new SocketAuthPolicy({ config, authorizer, logger, stats });
    agServer.setMiddleware(agServer.MIDDLEWARE_INBOUND, policy.inboundMiddleware());
    policy.attach(agServer);

    const gauges = () => ({
        mode: config.mode,
        auth_enabled: config.authEnabled,
        clients: agServer.clientsCount,
        pending_clients: agServer.pendingClientsCount,
        authorize_cache_size: authorizer ? authorizer.cache.size : 0,
        authorize_inflight: authorizer ? authorizer.inflight.size : 0,
    });

    const internalServer = http.createServer(
        createInternalHandler({
            agServer,
            publishKey: config.authEnabled ? deriveKey(config.authKey, PURPOSE_PUBLISH) : null,
            stats,
            logger,
            gauges,
        })
    );

    (async () => {
        for await (const { error } of agServer.listener('error')) {
            logger.error({ event: 'socket_server_error', error: describeError(error) });
        }
    })();

    (async () => {
        for await (const { warning } of agServer.listener('warning')) {
            logger.debug({ event: 'socket_server_warning', warning: describeError(warning) });
        }
    })();

    let sccClient = null;
    let ports = null;

    async function start() {
        const port = await listen(httpServer, config.port);
        const internalPort = await listen(internalServer, config.internalPort);
        ports = { port, internalPort };

        if (config.scc.stateServerHost) {
            // Lazily required: only multi-instance deployments need it.
            const sccBrokerClient = require('scc-broker-client');
            const crypto = require('crypto');
            sccClient = sccBrokerClient.attach(agServer.brokerEngine, {
                instanceId: crypto.randomUUID(),
                instancePort: port,
                instanceIp: config.scc.instanceIp,
                instanceIpFamily: config.scc.instanceIpFamily,
                pubSubBatchDuration: config.scc.pubSubBatchDuration,
                stateServerHost: config.scc.stateServerHost,
                stateServerPort: config.scc.stateServerPort,
                mappingEngine: config.scc.mappingEngine,
                clientPoolSize: config.scc.clientPoolSize,
                authKey: config.scc.authKey,
                stateServerConnectTimeout: config.scc.stateServerConnectTimeout,
                stateServerAckTimeout: config.scc.stateServerAckTimeout,
                stateServerReconnectRandomness: config.scc.stateServerReconnectRandomness,
                brokerRetryDelay: config.scc.brokerRetryDelay,
            });
            (async () => {
                for await (const { error } of sccClient.listener('error')) {
                    logger.error({ event: 'scc_error', error: describeError(error) });
                }
            })();
        }

        return ports;
    }

    async function stop() {
        try {
            await agServer.close();
        } catch (error) {
            logger.debug({ event: 'socket_server_close_error', error: describeError(error) });
        }
        await Promise.all([closeHttpServer(httpServer), closeHttpServer(internalServer)]);
        agServer.closeAllListeners();
        if (sccClient && typeof sccClient.closeAllListeners === 'function') {
            sccClient.closeAllListeners();
        }
    }

    return {
        agServer,
        httpServer,
        internalServer,
        authorizer,
        policy,
        stats,
        logger,
        start,
        stop,
        get ports() {
            return ports;
        },
    };
}

module.exports = { createSocketServer, publicHandler };
