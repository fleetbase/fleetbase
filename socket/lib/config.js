'use strict';

/**
 * Environment -> runtime configuration for the Fleetbase socket server.
 *
 * Everything the server reads from the environment is resolved here, once, so the rest of
 * the code works from a plain object and tests can build configurations without touching
 * process.env. Invalid values throw a ConfigError: the server refuses to start rather than
 * run with a security setting it did not understand.
 */

const MODES = Object.freeze(['off', 'log', 'enforce']);
const MIN_AUTH_KEY_LENGTH = 32;
const DEFAULT_PORT = 8000;
const DEFAULT_INTERNAL_PORT = 8001;
const DEFAULT_AUTHORIZE_URL = 'http://application:8000/int/v1/socket/authorize';
const DEFAULT_SOCKET_CHANNEL_LIMIT = 1000;
const DEFAULT_LOG_LEVEL = 2;

/**
 * Server options that this process controls itself. They are stripped from
 * SOCKETCLUSTER_OPTIONS (with a warning) so a stray JSON blob cannot turn token
 * verification or the client-publish lock off.
 */
const RESERVED_OPTIONS = Object.freeze([
    'authKey',
    'authPrivateKey',
    'authPublicKey',
    'authAlgorithm',
    'authVerifyAlgorithms',
    'authEngine',
    'allowClientPublish',
    'httpServer',
    'brokerEngine',
]);

class ConfigError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ConfigError';
    }
}

function isBlank(value) {
    return value === undefined || value === null || String(value).trim() === '';
}

function parsePort(name, raw, fallback) {
    if (isBlank(raw)) {
        return fallback;
    }
    const text = String(raw).trim();
    if (!/^\d+$/.test(text)) {
        throw new ConfigError(`${name} must be a port number (got "${raw}")`);
    }
    const port = Number(text);
    if (port > 65535) {
        throw new ConfigError(`${name} must be between 0 and 65535 (got ${port})`);
    }
    return port;
}

function parsePositiveInt(name, raw, fallback) {
    if (isBlank(raw)) {
        return fallback;
    }
    const text = String(raw).trim();
    if (!/^\d+$/.test(text)) {
        throw new ConfigError(`${name} must be a non-negative integer (got "${raw}")`);
    }
    return Number(text);
}

/**
 * Whether SOCKETCLUSTER_AUTH_ENABLED switches socket auth on: true, 1, yes or on.
 */
function parseSwitch(raw) {
    return !isBlank(raw) && ['true', '1', 'yes', 'on'].includes(String(raw).trim().toLowerCase());
}

/**
 * Resolves the effective auth mode.
 *
 * - Switch off (SOCKETCLUSTER_AUTH_ENABLED not true): always `off`, whatever the key and
 *   mode. The key can be provisioned ahead of time while existing socket clients, which
 *   connect without tokens, keep working.
 * - No key: always `off`. A requested `log`/`enforce` is reported as a warning, because
 *   without a key there is nothing to verify tokens with.
 * - Switch on and key set: SOCKETCLUSTER_AUTH_MODE, defaulting to `enforce`.
 *
 * @returns {{ mode: string, warnings: string[] }}
 */
function resolveMode(authKeySet, rawMode, switchedOn = true) {
    const warnings = [];
    const requested = isBlank(rawMode) ? null : String(rawMode).trim().toLowerCase();

    if (requested !== null && !MODES.includes(requested)) {
        throw new ConfigError(`SOCKETCLUSTER_AUTH_MODE must be one of ${MODES.join(', ')} (got "${rawMode}")`);
    }

    if (!switchedOn) {
        warnings.push(
            requested && requested !== 'off'
                ? `SOCKETCLUSTER_AUTH_MODE=${requested} was requested but SOCKETCLUSTER_AUTH_ENABLED is not true; socket auth is OFF and every subscription is allowed.`
                : 'SOCKETCLUSTER_AUTH_ENABLED is not true; socket auth is OFF and every subscription is allowed. Set it to true on the API and the socket server once every client fetches socket tokens.'
        );
        return { mode: 'off', warnings };
    }

    if (!authKeySet) {
        warnings.push(
            requested && requested !== 'off'
                ? `SOCKETCLUSTER_AUTH_MODE=${requested} was requested but SOCKETCLUSTER_AUTH_KEY is not set; socket auth is OFF and every subscription is allowed.`
                : 'SOCKETCLUSTER_AUTH_KEY is not set; socket auth is OFF and every subscription is allowed. Set a shared key on the API and the socket server to enable it.'
        );
        return { mode: 'off', warnings };
    }

    return { mode: requested || 'enforce', warnings };
}

function parseOptions(raw) {
    const warnings = [];
    if (isBlank(raw)) {
        return { options: {}, warnings };
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch (error) {
        throw new ConfigError(`SOCKETCLUSTER_OPTIONS is not valid JSON: ${error.message}`);
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new ConfigError('SOCKETCLUSTER_OPTIONS must be a JSON object');
    }
    const options = { ...parsed };
    for (const key of RESERVED_OPTIONS) {
        if (Object.prototype.hasOwnProperty.call(options, key)) {
            delete options[key];
            warnings.push(`SOCKETCLUSTER_OPTIONS.${key} is managed by the socket server and was ignored.`);
        }
    }
    return { options, warnings };
}

function parseAuthorizeUrl(raw) {
    const value = isBlank(raw) ? DEFAULT_AUTHORIZE_URL : String(raw).trim();
    let url;
    try {
        url = new URL(value);
    } catch (error) {
        throw new ConfigError(`SOCKETCLUSTER_AUTHORIZE_URL is not a valid URL (got "${value}")`);
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new ConfigError(`SOCKETCLUSTER_AUTHORIZE_URL must be http(s) (got "${value}")`);
    }
    return url.toString();
}

function nullableString(raw) {
    return isBlank(raw) ? null : String(raw).trim();
}

function nullableNumber(raw) {
    if (isBlank(raw)) {
        return null;
    }
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
}

/**
 * @param {Record<string, string|undefined>} env
 */
function loadConfig(env = process.env) {
    const rawKey = env.SOCKETCLUSTER_AUTH_KEY;
    const authKey = isBlank(rawKey) ? null : String(rawKey);

    if (authKey !== null && authKey.length < MIN_AUTH_KEY_LENGTH) {
        throw new ConfigError(`SOCKETCLUSTER_AUTH_KEY must be at least ${MIN_AUTH_KEY_LENGTH} characters long`);
    }

    const switchedOn = parseSwitch(env.SOCKETCLUSTER_AUTH_ENABLED);
    const { mode, warnings: modeWarnings } = resolveMode(authKey !== null, env.SOCKETCLUSTER_AUTH_MODE, switchedOn);
    const { options, warnings: optionWarnings } = parseOptions(env.SOCKETCLUSTER_OPTIONS);

    const port = parsePort('SOCKETCLUSTER_PORT', env.SOCKETCLUSTER_PORT, DEFAULT_PORT);
    const internalPort = parsePort('SOCKETCLUSTER_INTERNAL_PORT', env.SOCKETCLUSTER_INTERNAL_PORT, DEFAULT_INTERNAL_PORT);
    if (port !== 0 && port === internalPort) {
        throw new ConfigError('SOCKETCLUSTER_PORT and SOCKETCLUSTER_INTERNAL_PORT must differ');
    }

    return Object.freeze({
        port,
        internalPort,
        authKey,
        authEnabled: switchedOn && authKey !== null,
        mode,
        authorizeUrl: parseAuthorizeUrl(env.SOCKETCLUSTER_AUTHORIZE_URL),
        options,
        socketChannelLimit: parsePositiveInt('SOCKETCLUSTER_SOCKET_CHANNEL_LIMIT', env.SOCKETCLUSTER_SOCKET_CHANNEL_LIMIT, DEFAULT_SOCKET_CHANNEL_LIMIT),
        logLevel: parsePositiveInt('SOCKETCLUSTER_LOG_LEVEL', env.SOCKETCLUSTER_LOG_LEVEL, DEFAULT_LOG_LEVEL),
        scc: Object.freeze({
            stateServerHost: nullableString(env.SCC_STATE_SERVER_HOST),
            stateServerPort: nullableNumber(env.SCC_STATE_SERVER_PORT),
            mappingEngine: nullableString(env.SCC_MAPPING_ENGINE),
            clientPoolSize: nullableNumber(env.SCC_CLIENT_POOL_SIZE),
            authKey: nullableString(env.SCC_AUTH_KEY),
            instanceIp: nullableString(env.SCC_INSTANCE_IP),
            instanceIpFamily: nullableString(env.SCC_INSTANCE_IP_FAMILY),
            stateServerConnectTimeout: nullableNumber(env.SCC_STATE_SERVER_CONNECT_TIMEOUT),
            stateServerAckTimeout: nullableNumber(env.SCC_STATE_SERVER_ACK_TIMEOUT),
            stateServerReconnectRandomness: nullableNumber(env.SCC_STATE_SERVER_RECONNECT_RANDOMNESS),
            pubSubBatchDuration: nullableNumber(env.SCC_PUB_SUB_BATCH_DURATION),
            brokerRetryDelay: nullableNumber(env.SCC_BROKER_RETRY_DELAY),
        }),
        warnings: Object.freeze([...modeWarnings, ...optionWarnings]),
    });
}

/**
 * Builds the options passed to socketcluster-server's attach(). The auth settings are
 * applied last so SOCKETCLUSTER_OPTIONS can never override them.
 */
function buildServerOptions(config) {
    const options = {
        socketChannelLimit: config.socketChannelLimit,
        // Denials are logged as structured JSON lines by our middleware; SocketCluster's own
        // per-denial warning (with a stack) would only duplicate them.
        middlewareEmitFailures: false,
        ...config.options,
        authVerifyAlgorithms: ['HS256'],
        allowClientPublish: config.mode !== 'enforce',
    };
    if (config.authEnabled) {
        options.authKey = config.authKey;
    }
    return options;
}

module.exports = {
    ConfigError,
    parseSwitch,
    MODES,
    MIN_AUTH_KEY_LENGTH,
    DEFAULT_AUTHORIZE_URL,
    loadConfig,
    resolveMode,
    buildServerOptions,
};
