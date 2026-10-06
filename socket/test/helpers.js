'use strict';

/**
 * Shared test helpers (no tests of their own). `node --test` loads every .js file under
 * test/, so this file is also executed as a test file; it only defines functions.
 */

const crypto = require('crypto');
const http = require('http');
const socketClusterClient = require('socketcluster-client');
const { loadConfig } = require('../lib/config');
const { createSocketServer } = require('../lib/app');
const { deriveKey, signRequest, verifyRequest, PURPOSE_AUTHORIZE, PURPOSE_PUBLISH } = require('../lib/signing');

const AUTH_KEY = 'test-only-socket-auth-key-0123456789abcdefghij';

function base64url(value) {
    return Buffer.from(value).toString('base64url');
}

/** Signs an HS256 JWT with the given key. */
function signJwt(claims, key = AUTH_KEY, header = { alg: 'HS256', typ: 'JWT' }) {
    const head = base64url(JSON.stringify(header));
    const body = base64url(JSON.stringify(claims));
    const signature = crypto.createHmac('sha256', key).update(`${head}.${body}`).digest('base64url');
    return `${head}.${body}.${signature}`;
}

function nowSeconds() {
    return Math.floor(Date.now() / 1000);
}

/** Claims shaped like an API-minted user token. */
function userClaims(overrides = {}) {
    const now = nowSeconds();
    return {
        iss: 'fleetbase-api',
        aud: 'fleetbase-socket',
        iat: now,
        nbf: now,
        exp: now + 900,
        jti: crypto.randomUUID(),
        kind: 'user',
        sub: 'user-uuid-1',
        cid: 'company-uuid-1',
        cpid: 'company_abc123',
        env: 'live',
        ids: ['user-uuid-1', 'user_abc123'],
        adm: false,
        ...overrides,
    };
}

function withTimeout(promise, ms, label) {
    let timer;
    const timeout = new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms waiting for ${label}`)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** A logger that records every line instead of writing it. */
function captureLogger() {
    const records = [];
    const push = (level) => (record) => records.push({ level, ...record });
    return {
        records,
        logger: { level: 3, error: push('error'), warn: push('warn'), info: push('info'), debug: push('debug') },
    };
}

/** In-memory token store, the way Fleetbase clients deliver tokens (never localStorage). */
function memoryAuthEngine(initialToken = null) {
    let token = initialToken;
    return {
        saveToken: async (name, value) => {
            token = value;
            return value;
        },
        removeToken: async () => {
            const old = token;
            token = null;
            return old;
        },
        loadToken: async () => token,
    };
}

/**
 * A stand-in for the API authorize endpoint. `decide(body)` returns the JSON response
 * (or { status, body } for a non-200); it may be async to simulate a slow API.
 */
async function startFakeAuthorizer(decide) {
    const calls = [];
    const authorizeKey = deriveKey(AUTH_KEY, PURPOSE_AUTHORIZE);
    const server = http.createServer((req, res) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', async () => {
            const raw = Buffer.concat(chunks);
            const verdict = verifyRequest(authorizeKey, {
                timestamp: req.headers['x-fleetbase-timestamp'],
                signature: req.headers['x-fleetbase-signature'],
                rawBody: raw,
            });
            let body = null;
            try {
                body = JSON.parse(raw.toString('utf8'));
            } catch (error) {
                body = null;
            }
            calls.push({ path: req.url, signatureOk: verdict.ok, body });
            if (!verdict.ok) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end('{"error":"invalid_signature"}');
                return;
            }
            let result;
            try {
                result = await decide(body);
            } catch (error) {
                result = { status: 500, body: { error: 'boom' } };
            }
            if (res.destroyed) {
                return;
            }
            const status = result && result.status ? result.status : 200;
            const payload = result && result.status ? result.body : result;
            res.writeHead(status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(payload));
        });
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    return {
        url: `http://127.0.0.1:${port}/int/v1/socket/authorize`,
        calls,
        close: () =>
            new Promise((resolve) => {
                server.close(() => resolve());
                server.closeAllConnections();
            }),
    };
}

const denyEverything = () => ({ allow: false, ttl: 30, reason: 'not_allowed' });

/**
 * Starts a real socket server on ephemeral ports with a fake authorize endpoint.
 */
async function startServer({ env = {}, decide = denyEverything, authorizeTimeoutMs } = {}) {
    const fake = await startFakeAuthorizer(decide);
    const config = loadConfig({
        SOCKETCLUSTER_PORT: '0',
        SOCKETCLUSTER_INTERNAL_PORT: '0',
        SOCKETCLUSTER_AUTH_KEY: AUTH_KEY,
        SOCKETCLUSTER_AUTHORIZE_URL: fake.url,
        ...env,
    });
    const { records, logger } = captureLogger();
    const server = createSocketServer(config, { logger, authorizeTimeoutMs });
    const { port, internalPort } = await server.start();
    const clients = [];

    async function connect({ token = null, query = {} } = {}) {
        const socket = socketClusterClient.create({
            hostname: '127.0.0.1',
            port,
            path: '/socketcluster/',
            autoReconnect: false,
            ackTimeout: 5000,
            authEngine: memoryAuthEngine(token),
            query: { client: 'test/1.0', ...query },
        });
        clients.push(socket);
        const status = await withTimeout(socket.listener('connect').once(), 5000, 'socket connect');
        return { socket, status };
    }

    function internalRequest(path, { method = 'POST', body, key = deriveKey(AUTH_KEY, PURPOSE_PUBLISH), timestamp, headers = {} } = {}) {
        const raw = body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body);
        const signed = key ? signRequest(key, raw, timestamp) : {};
        return fetch(`http://127.0.0.1:${internalPort}${path}`, {
            method,
            headers: { 'Content-Type': 'application/json', ...signed, ...headers },
            body: method === 'GET' || method === 'HEAD' ? undefined : raw,
        });
    }

    async function close() {
        for (const socket of clients) {
            try {
                socket.disconnect();
                socket.killAllListeners();
                socket.killAllChannels();
            } catch (error) {
                // already closed
            }
        }
        await server.stop();
        await fake.close();
    }

    return { port, internalPort, config, server, logs: records, fake, connect, internalRequest, close };
}

/**
 * Subscribes and resolves with { ok: true } or { ok: false, error } once the server answers.
 */
async function trySubscribe(socket, name, ms = 5000) {
    const channel = socket.subscribe(name);
    const result = await withTimeout(
        Promise.race([
            channel.listener('subscribe').once().then(() => ({ ok: true })),
            channel.listener('subscribeFail').once().then(({ error }) => ({ ok: false, error })),
        ]),
        ms,
        `subscribe ${name}`
    );
    return { channel, ...result };
}

module.exports = {
    AUTH_KEY,
    signJwt,
    userClaims,
    nowSeconds,
    withTimeout,
    delay,
    captureLogger,
    memoryAuthEngine,
    startFakeAuthorizer,
    startServer,
    trySubscribe,
};
