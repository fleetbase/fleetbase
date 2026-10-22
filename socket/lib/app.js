'use strict';

/**
 * Assembles the socket server: the public HTTP/WebSocket listener (health check plus
 * SocketCluster at /socketcluster/), the auth middleware, the internal publish/stats
 * listener, the config poller (when a key is configured) and, when SCC_STATE_SERVER_HOST
 * is set, the SCC broker client.
 *
 * Runtime config (enabled, mode, origins) is applied without a restart:
 * - the auth policy reads its mode per action;
 * - `agServer.allowClientPublish` is read by SocketCluster on every inbound #publish;
 * - `agServer.origins` / `agServer._allowAllOrigins` are read on every websocket handshake,
 *   so an origins change applies to new connections (open ones are not re-checked).
 * Entering `enforce` at runtime disconnects every socket once, so clients reconnect and
 * every subscription made while auth was looser goes through the authorizer again.
 */

const http = require('http');
const socketClusterServer = require('socketcluster-server');
const { buildServerOptions } = require('./config');
const { deriveKey, PURPOSE_AUTHORIZE, PURPOSE_PUBLISH } = require('./signing');
const { Authorizer } = require('./authorizer');
const { SocketAuthPolicy } = require('./middleware');
const { createInternalHandler } = require('./internal');
const { Stats } = require('./stats');
const { Denials } = require('./denials');
const { RuntimeConfig } = require('./runtime');
const { ConfigPoller } = require('./config-poller');
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
 * Points SocketCluster's handshake origin check at a new origins value. These are plain
 * instance fields in socketcluster-server 17, read by verifyHandshake on every handshake.
 */
function applyOrigins(agServer, origins) {
    agServer.origins = origins;
    agServer._allowAllOrigins = origins.indexOf('*:*') !== -1;
}

/** Close code sent to sockets when the server switches to enforce at runtime. */
const ENFORCE_RECONNECT_CODE = 4100;

/**
 * @param {ReturnType<import('./config').loadConfig>} config
 * @param {object} [deps]
 * @param {object} [deps.logger]
 * @param {typeof fetch} [deps.fetch] used for the authorize and config calls
 * @param {number} [deps.authorizeTimeoutMs]
 * @param {number} [deps.configPollIntervalMs] overrides SOCKETCLUSTER_CONFIG_POLL_SECONDS (tests)
 */
function createSocketServer(config, deps = {}) {
    const logger = deps.logger || createLogger({ level: config.logLevel });
    const stats = new Stats();
    const denials = new Denials();
    const runtime = new RuntimeConfig(config);
    const keyConfigured = config.authKey !== null;

    const httpServer = http.createServer(publicHandler);
    const agServer = socketClusterServer.attach(httpServer, buildServerOptions(config));
    applyOrigins(agServer, runtime.origins);

    // With a key the authorizer always exists; whether it is consulted depends on the
    // runtime mode, so switching auth on from the console needs no restart.
    const authorizer = keyConfigured
        ? new Authorizer({
              url: config.authorizeUrl,
              authorizeKey: deriveKey(config.authKey, PURPOSE_AUTHORIZE),
              timeoutMs: deps.authorizeTimeoutMs,
              fetch: deps.fetch,
              stats,
          })
        : null;

    const policy = new SocketAuthPolicy({ config, authorizer, logger, stats, denials });
    agServer.setMiddleware(agServer.MIDDLEWARE_INBOUND, policy.inboundMiddleware());
    policy.attach(agServer);

    runtime.onChange((next, previous) => {
        policy.update(next);
        agServer.allowClientPublish = next.mode !== 'enforce';
        applyOrigins(agServer, next.origins);
        if (next.mode === 'enforce' && previous.mode !== 'enforce') {
            disconnectAll('auth_enforced');
        }
    });

    function disconnectAll(reason) {
        const sockets = Object.values(agServer.clients);
        stats.increment('runtime_reconnects', sockets.length);
        logger.info({ event: 'socket_reconnect_all', reason, clients: sockets.length });
        for (const socket of sockets) {
            try {
                socket.disconnect(ENFORCE_RECONNECT_CODE, reason);
            } catch (error) {
                logger.debug({ event: 'socket_disconnect_failed', error: describeError(error) });
            }
        }
    }

    const pollIntervalMs = deps.configPollIntervalMs !== undefined ? deps.configPollIntervalMs : config.configPollSeconds * 1000;
    const poller =
        keyConfigured && config.configUrl && pollIntervalMs > 0
            ? new ConfigPoller({
                  url: config.configUrl,
                  authorizeKey: deriveKey(config.authKey, PURPOSE_AUTHORIZE),
                  intervalMs: pollIntervalMs,
                  runtime,
                  logger,
                  fetch: deps.fetch,
                  stats,
              })
            : null;

    const gauges = () => ({
        mode: runtime.mode,
        auth_enabled: runtime.enabled,
        clients: agServer.clientsCount,
        pending_clients: agServer.pendingClientsCount,
        authorize_cache_size: authorizer ? authorizer.cache.size : 0,
        authorize_inflight: authorizer ? authorizer.inflight.size : 0,
        config: runtime.snapshot(),
        denials: denials.top(),
    });

    const internalServer = http.createServer(
        createInternalHandler({
            agServer,
            publishKey: keyConfigured ? deriveKey(config.authKey, PURPOSE_PUBLISH) : null,
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

        if (poller) {
            poller.start();
        }

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
        if (poller) {
            await poller.stop();
        }
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
        runtime,
        poller,
        denials,
        stats,
        logger,
        start,
        stop,
        get ports() {
            return ports;
        },
    };
}

module.exports = { createSocketServer, publicHandler, applyOrigins, ENFORCE_RECONNECT_CODE };
