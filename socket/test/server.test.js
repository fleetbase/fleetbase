'use strict';

/**
 * Integration tests: the real server on ephemeral ports, a fake API authorize endpoint and
 * real socketcluster-client connections.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { startServer, signJwt, userClaims, nowSeconds, trySubscribe, withTimeout, delay, waitFor, handshakeStatus, AUTH_KEY } = require('./helpers');
const { ENFORCE_RECONNECT_CODE } = require('../lib/app');
const { deriveKey, PURPOSE_AUTHORIZE } = require('../lib/signing');

const allowOrders = (body) =>
    body.channel.startsWith('order.allowed') ? { allow: true, ttl: 300, reason: 'company_match' } : { allow: false, ttl: 30, reason: 'not_found' };

function denyLogs(logs) {
    return logs.filter((record) => record.event === 'socket_auth_deny');
}

test('health check and unknown paths on the public port', async (t) => {
    const env = await startServer();
    t.after(() => env.close());

    const health = await fetch(`http://127.0.0.1:${env.port}/health-check`);
    assert.equal(health.status, 200);
    assert.equal(await health.text(), 'OK');

    const missing = await fetch(`http://127.0.0.1:${env.port}/nope`);
    assert.equal(missing.status, 404);
    await missing.text();
});

test('enforce: a valid token authenticates; own channels are allowed locally, others ask the API', async (t) => {
    const env = await startServer({ decide: allowOrders });
    t.after(() => env.close());

    const token = signJwt(userClaims());
    const { socket, status } = await env.connect({ token });
    assert.equal(status.isAuthenticated, true);

    const own = await trySubscribe(socket, 'user.user-uuid-1');
    assert.equal(own.ok, true);
    const company = await trySubscribe(socket, 'company.company_abc123');
    assert.equal(company.ok, true);
    assert.equal(env.fake.calls.length, 0, 'self rules never call the API');

    const allowed = await trySubscribe(socket, 'order.allowed_1');
    assert.equal(allowed.ok, true);
    assert.equal(env.fake.calls.length, 1);
    assert.equal(env.fake.calls[0].signatureOk, true);
    assert.deepEqual(env.fake.calls[0].body, { token, channel: 'order.allowed_1' });

    const denied = await trySubscribe(socket, 'order.someone_else');
    assert.equal(denied.ok, false);
    assert.equal(denied.error.name, 'AuthError');
    assert.equal(denied.error.reason, 'not_found');

    const lines = denyLogs(env.logs);
    assert.equal(lines.length, 1);
    assert.deepEqual(
        { kind: lines[0].kind, sub: lines[0].sub, cid: lines[0].cid, channel: lines[0].channel, reason: lines[0].reason, client: lines[0].client, mode: lines[0].mode },
        { kind: 'user', sub: 'user-uuid-1', cid: 'company-uuid-1', channel: 'order.someone_else', reason: 'not_found', client: 'test/1.0', mode: 'enforce' }
    );
    assert.equal(JSON.stringify(env.logs).includes(token), false, 'the token never reaches the logs');
});

test('enforce: decisions are cached per token and channel across sockets', async (t) => {
    const env = await startServer({ decide: allowOrders });
    t.after(() => env.close());

    const token = signJwt(userClaims());
    const first = await env.connect({ token });
    const second = await env.connect({ token });
    assert.equal((await trySubscribe(first.socket, 'order.allowed_9')).ok, true);
    assert.equal((await trySubscribe(second.socket, 'order.allowed_9')).ok, true);
    assert.equal((await trySubscribe(first.socket, 'order.denied_9')).ok, false);
    assert.equal((await trySubscribe(second.socket, 'order.denied_9')).ok, false);
    assert.equal(env.fake.calls.length, 2);
});

test('enforce: a token with a bad signature leaves the socket anonymous', async (t) => {
    const env = await startServer({ decide: allowOrders });
    t.after(() => env.close());

    const token = signJwt(userClaims(), 'a-completely-different-key-0123456789abcdef');
    const { socket, status } = await env.connect({ token });
    assert.equal(status.isAuthenticated, false);
    assert.ok(status.authError, 'the client is told why');

    const result = await trySubscribe(socket, 'user.user-uuid-1');
    assert.equal(result.ok, false);
    assert.equal(result.error.reason, 'no_token');
    assert.equal(env.fake.calls.length, 0);
});

test('enforce: an expired token leaves the socket anonymous', async (t) => {
    const env = await startServer({ decide: allowOrders });
    t.after(() => env.close());

    const now = nowSeconds();
    const { socket, status } = await env.connect({ token: signJwt(userClaims({ iat: now - 1000, nbf: now - 1000, exp: now - 100 })) });
    assert.equal(status.isAuthenticated, false);
    assert.equal(status.authError.name, 'AuthTokenExpiredError');
    assert.equal((await trySubscribe(socket, 'user.user-uuid-1')).ok, false);
});

test('enforce: a correctly signed token with bad claims is rejected', async (t) => {
    const env = await startServer({ decide: allowOrders });
    t.after(() => env.close());

    const cases = [
        [{ iss: 'someone-else' }, 'bad_iss'],
        [{ aud: 'other' }, 'bad_aud'],
        [{ kind: 'superuser' }, 'bad_kind'],
        [{ cid: undefined }, 'missing_cid'],
        [{ exp: nowSeconds() + 7200 }, 'lifetime_too_long'],
    ];
    for (const [overrides, reason] of cases) {
        const { status } = await env.connect({ token: signJwt(userClaims(overrides)) });
        assert.equal(status.isAuthenticated, false, reason);
        const line = denyLogs(env.logs).find((record) => record.reason === reason);
        assert.ok(line, `logged ${reason}`);
        assert.equal(line.channel, null);
        assert.equal(line.action, 'authenticate');
    }
});

test('enforce: a token signed with another algorithm is rejected', async (t) => {
    const env = await startServer();
    t.after(() => env.close());

    const crypto = require('crypto');
    const head = Buffer.from(JSON.stringify({ alg: 'HS512', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(userClaims())).toString('base64url');
    const sig = crypto.createHmac('sha512', AUTH_KEY).update(`${head}.${body}`).digest('base64url');
    const { status } = await env.connect({ token: `${head}.${body}.${sig}` });
    assert.equal(status.isAuthenticated, false);
});

test('enforce: anonymous sockets may only ask for fleetbase.install', async (t) => {
    const env = await startServer({ decide: (body) => (body.channel === 'fleetbase.install' ? { allow: true, ttl: 30, reason: 'no_users' } : { allow: false }) });
    t.after(() => env.close());

    const { socket, status } = await env.connect();
    assert.equal(status.isAuthenticated, false);
    assert.equal((await trySubscribe(socket, 'fleetbase.install')).ok, true);
    assert.deepEqual(env.fake.calls[0].body, { token: null, channel: 'fleetbase.install' });
    assert.equal((await trySubscribe(socket, 'company.company-uuid-1')).ok, false);
    assert.equal(env.fake.calls.length, 1);
});

test('enforce: clients cannot publish, transmit or invoke', async (t) => {
    const env = await startServer();
    t.after(() => env.close());

    const { socket } = await env.connect({ token: signJwt(userClaims()) });
    await assert.rejects(socket.invokePublish('user.user-uuid-1', { hi: 1 }), /Client publish feature is disabled/);
    await assert.rejects(socket.invoke('custom-procedure', { x: 1 }), (error) => error.name === 'AuthError' && error.reason === 'client_invoke_disabled');
});

test('log mode: would-denies are logged but allowed', async (t) => {
    const env = await startServer({ env: { SOCKETCLUSTER_AUTH_MODE: 'log' } });
    t.after(() => env.close());

    const { socket } = await env.connect({ query: { client: 'navigator/2.1.0' } });
    assert.equal((await trySubscribe(socket, 'order.anything')).ok, true);
    const [line] = denyLogs(env.logs);
    assert.equal(line.reason, 'no_token');
    assert.equal(line.mode, 'log');
    assert.equal(line.client, 'navigator/2.1.0');
    assert.equal(line.channel, 'order.anything');

    // Client publish is still possible in log mode, and logged.
    await socket.invokePublish('order.anything', { x: 1 });
    assert.ok(denyLogs(env.logs).some((record) => record.reason === 'client_publish_disabled'));
});

test('off mode (no key): everything is allowed and the API is never asked', async (t) => {
    const env = await startServer({ env: { SOCKETCLUSTER_AUTH_KEY: '' } });
    t.after(() => env.close());

    assert.equal(env.config.mode, 'off');
    const { socket, status } = await env.connect({ token: signJwt(userClaims()) });
    assert.equal(status.isAuthenticated, false, 'without a key no token can verify');
    assert.equal((await trySubscribe(socket, 'order.anything')).ok, true);
    await socket.invokePublish('order.anything', { x: 1 });
    assert.equal(env.fake.calls.length, 0);
    assert.equal(denyLogs(env.logs).length, 0);

    const publish = await env.internalRequest('/publish', { body: { channels: ['order.anything'], data: {} } });
    assert.equal(publish.status, 503);
    await publish.text();
});

test('switched off with a key and enforce requested: everything is allowed, as before socket auth', async (t) => {
    const env = await startServer({ env: { SOCKETCLUSTER_AUTH_ENABLED: 'false', SOCKETCLUSTER_AUTH_MODE: 'enforce' } });
    t.after(() => env.close());

    assert.equal(env.config.mode, 'off');
    assert.equal(env.config.authEnabled, false);

    // Existing clients connect without a token, subscribe anywhere and publish over the
    // websocket (the API's own publisher does exactly this while the switch is off).
    const { socket, status } = await env.connect();
    assert.equal(status.isAuthenticated, false);
    assert.equal((await trySubscribe(socket, 'order.anything')).ok, true);
    await socket.invokePublish('order.anything', { x: 1 });
    assert.equal(env.fake.calls.length, 0);
    assert.equal(denyLogs(env.logs).length, 0);

    // With a key the signed internal publish endpoint is open even while the switch is off,
    // so the API can publish through it as soon as its own switch flips, before this
    // server's next config poll. Unsigned requests are still refused.
    const publish = await env.internalRequest('/publish', { body: { channels: ['order.anything'], data: {} } });
    assert.equal(publish.status, 202);
    await publish.text();
    const unsigned = await env.internalRequest('/publish', { body: { channels: ['order.anything'], data: {} }, key: null });
    assert.equal(unsigned.status, 401);
    await unsigned.text();
});

test('switched off with a key: tokens are verified, so auth can be switched on at runtime', async (t) => {
    const env = await startServer({ env: { SOCKETCLUSTER_AUTH_ENABLED: 'false' } });
    t.after(() => env.close());

    const { socket, status } = await env.connect({ token: signJwt(userClaims()) });
    assert.equal(status.isAuthenticated, true, 'the key reaches SocketCluster whenever one is configured');
    assert.equal((await trySubscribe(socket, 'order.not_mine')).ok, true);
    assert.equal(env.fake.calls.length, 0);
    assert.equal(env.server.poller, null, 'polling is off in this test');
});

test('off mode with a key: tokens are verified but nothing is denied', async (t) => {
    const env = await startServer({ env: { SOCKETCLUSTER_AUTH_MODE: 'off' } });
    t.after(() => env.close());

    const { socket, status } = await env.connect({ token: signJwt(userClaims()) });
    assert.equal(status.isAuthenticated, true);
    assert.equal((await trySubscribe(socket, 'order.not_mine')).ok, true);
    assert.equal(env.fake.calls.length, 0);
});

test('a slow authorize endpoint fails closed after two seconds', async (t) => {
    const env = await startServer({
        decide: async () => {
            await delay(4000);
            return { allow: true, ttl: 300, reason: 'too_late' };
        },
    });
    t.after(() => env.close());

    const { socket } = await env.connect({ token: signJwt(userClaims()) });
    const started = Date.now();
    const result = await trySubscribe(socket, 'order.slow', 6000);
    const elapsed = Date.now() - started;
    assert.equal(result.ok, false);
    assert.equal(result.error.reason, 'authorize_timeout');
    assert.ok(elapsed >= 1900 && elapsed < 3900, `timed out after ${elapsed}ms`);
});

test('an unreachable authorize endpoint fails closed', async (t) => {
    const env = await startServer({ env: { SOCKETCLUSTER_AUTHORIZE_URL: 'http://127.0.0.1:1/int/v1/socket/authorize' } });
    t.after(() => env.close());

    const { socket } = await env.connect({ token: signJwt(userClaims()) });
    const result = await trySubscribe(socket, 'order.x');
    assert.equal(result.ok, false);
    assert.equal(result.error.reason, 'authorize_unreachable');
});

test('sockets are kicked out of every channel when their token expires', async (t) => {
    const env = await startServer({ env: { SOCKETCLUSTER_OPTIONS: JSON.stringify({ pingInterval: 200, pingTimeout: 5000 }) } });
    t.after(() => env.close());

    const now = nowSeconds();
    const { socket, status } = await env.connect({ token: signJwt(userClaims({ iat: now, nbf: now, exp: now + 2 })) });
    assert.equal(status.isAuthenticated, true);
    assert.equal((await trySubscribe(socket, 'user.user-uuid-1')).ok, true);
    assert.equal((await trySubscribe(socket, 'company.company-uuid-1')).ok, true);

    const kicked = [];
    (async () => {
        for await (const event of socket.listener('kickOut')) {
            kicked.push(event);
        }
    })();

    await withTimeout(
        (async () => {
            while (kicked.length < 2) {
                await delay(50);
            }
        })(),
        8000,
        'kickOut after expiry'
    );
    assert.deepEqual(kicked.map((event) => event.channel).sort(), ['company.company-uuid-1', 'user.user-uuid-1']);
    assert.ok(kicked.every((event) => event.message === 'token_expired'));
    assert.deepEqual(socket.subscriptions(true), []);

    // The server now treats it as anonymous.
    assert.equal((await trySubscribe(socket, 'user.user-uuid-1')).ok, false);
});

test('re-authenticating as someone else kicks the socket out; refreshing the same identity does not', async (t) => {
    const env = await startServer();
    t.after(() => env.close());

    const { socket } = await env.connect({ token: signJwt(userClaims()) });
    assert.equal((await trySubscribe(socket, 'user.user-uuid-1')).ok, true);

    const kicked = [];
    (async () => {
        for await (const event of socket.listener('kickOut')) {
            kicked.push(event);
        }
    })();

    // Token refresh for the same principal keeps subscriptions.
    await socket.authenticate(signJwt(userClaims()));
    await delay(200);
    assert.equal(kicked.length, 0);
    assert.ok(socket.isSubscribed('user.user-uuid-1'));

    // A different principal on the same socket loses them.
    await socket.authenticate(signJwt(userClaims({ sub: 'user-uuid-2', ids: ['user-uuid-2'] })));
    await withTimeout(
        (async () => {
            while (kicked.length < 1) {
                await delay(25);
            }
        })(),
        3000,
        'kickOut on identity change'
    );
    assert.equal(kicked[0].channel, 'user.user-uuid-1');
    assert.equal(kicked[0].message, 'identity_changed');
});

test('a client that drops its token is kicked out of its channels', async (t) => {
    const env = await startServer();
    t.after(() => env.close());

    const { socket } = await env.connect({ token: signJwt(userClaims()) });
    assert.equal((await trySubscribe(socket, 'user.user-uuid-1')).ok, true);
    const kickOut = socket.listener('kickOut').once();
    await socket.deauthenticate();
    const event = await withTimeout(kickOut, 3000, 'kickOut on deauthenticate');
    assert.equal(event.message, 'deauthenticated');
});

test('POST /publish: signature checks', async (t) => {
    const env = await startServer();
    t.after(() => env.close());

    const body = { channels: ['order.a'], data: { x: 1 } };
    const unsigned = await env.internalRequest('/publish', { body, key: null });
    assert.equal(unsigned.status, 401);
    assert.deepEqual(await unsigned.json(), { error: 'invalid_signature' });

    const wrongKey = await env.internalRequest('/publish', { body, key: deriveKey(AUTH_KEY, PURPOSE_AUTHORIZE) });
    assert.equal(wrongKey.status, 401);
    await wrongKey.text();

    const stale = await env.internalRequest('/publish', { body, timestamp: nowSeconds() - 61 });
    assert.equal(stale.status, 401);
    await stale.text();

    const future = await env.internalRequest('/publish', { body, timestamp: nowSeconds() + 61 });
    assert.equal(future.status, 401);
    await future.text();

    const ok = await env.internalRequest('/publish', { body });
    assert.equal(ok.status, 202);
    assert.deepEqual(await ok.json(), { published: 1 });
});

test('POST /publish: body validation', async (t) => {
    const env = await startServer();
    t.after(() => env.close());

    for (const body of ['{not json', '[]', { channels: [] }, { channels: ['bad channel'] }, { channels: [''] }, { data: {} }]) {
        const response = await env.internalRequest('/publish', { body });
        assert.equal(response.status, 400, JSON.stringify(body));
        await response.text();
    }
});

test('POST /publish: bodies over 2 MB are refused with 413', async (t) => {
    const env = await startServer();
    t.after(() => env.close());

    const status = await new Promise((resolve, reject) => {
        const req = http.request({
            host: '127.0.0.1',
            port: env.internalPort,
            path: '/publish',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': 2 * 1024 * 1024 + 1 },
        });
        req.on('response', (res) => {
            res.resume();
            resolve(res.statusCode);
            req.destroy();
        });
        req.on('error', reject);
        req.flushHeaders();
    });
    assert.equal(status, 413);

    // Just under the limit is accepted (after signature checks).
    const padding = 'x'.repeat(2 * 1024 * 1024 - 100);
    const big = await env.internalRequest('/publish', { body: { channels: ['order.a'], data: { padding } } });
    assert.equal(big.status, 202);
    await big.text();
});

test('POST /publish fans out to subscribed clients on every channel', async (t) => {
    const env = await startServer({ decide: allowOrders });
    t.after(() => env.close());

    const { socket } = await env.connect({ token: signJwt(userClaims()) });
    const order = await trySubscribe(socket, 'order.allowed_7');
    const company = await trySubscribe(socket, 'company.company-uuid-1');
    assert.equal(order.ok && company.ok, true);

    const received = Promise.all([withTimeout(order.channel.once(), 3000, 'order data'), withTimeout(company.channel.once(), 3000, 'company data')]);
    const response = await env.internalRequest('/publish', {
        body: { channels: ['order.allowed_7', 'company.company-uuid-1', 'order.allowed_7'], data: { event: 'order.updated', id: 'order_7' } },
    });
    assert.equal(response.status, 202);
    assert.deepEqual(await response.json(), { published: 2 });
    assert.deepEqual(await received, [
        { event: 'order.updated', id: 'order_7' },
        { event: 'order.updated', id: 'order_7' },
    ]);

    // The single-channel form works too.
    const single = withTimeout(order.channel.once(), 3000, 'single-channel data');
    const legacy = await env.internalRequest('/publish', { body: { channel: 'order.allowed_7', data: { n: 2 } } });
    assert.equal(legacy.status, 202);
    assert.deepEqual(await single, { n: 2 });
});

test('GET /stats is signed and reports counters', async (t) => {
    const env = await startServer();
    t.after(() => env.close());

    await env.connect();
    const publish = await env.internalRequest('/publish', { body: { channels: ['a.b'], data: 1 } });
    await publish.text();

    const unsigned = await env.internalRequest('/stats', { method: 'GET', key: null });
    assert.equal(unsigned.status, 401);
    await unsigned.text();

    const response = await env.internalRequest('/stats', { method: 'GET' });
    assert.equal(response.status, 200);
    const stats = await response.json();
    assert.equal(stats.mode, 'enforce');
    assert.equal(stats.auth_enabled, true);
    assert.equal(stats.clients, 1);
    assert.equal(stats.counters.publish_requests, 1);
    assert.equal(stats.counters.internal_unauthorized, 1);
    assert.equal(typeof stats.uptime_seconds, 'number');
    assert.deepEqual(stats.config, { enabled: true, mode: 'enforce', origins: '*:*', source: 'env', last_sync_at: null, last_sync_error: null });
    assert.deepEqual(stats.denials, []);

    const wrongMethod = await env.internalRequest('/stats', { method: 'POST' });
    assert.equal(wrongMethod.status, 405);
    await wrongMethod.text();
    const unknown = await env.internalRequest('/other', { method: 'GET' });
    assert.equal(unknown.status, 404);
    await unknown.text();
});

test('the internal endpoints are not served on the public port', async (t) => {
    const env = await startServer();
    t.after(() => env.close());

    const response = await fetch(`http://127.0.0.1:${env.port}/publish`, { method: 'POST', body: '{}' });
    assert.equal(response.status, 404);
    await response.text();
});

/*
 * Runtime config: the server polls the fake API's GET .../config every 50 ms.
 */

/** A mutable remote config the fake API serves; `set()` changes what the next poll sees. */
function remote(initial) {
    let current = initial;
    const fn = () => current;
    fn.set = (next) => {
        current = next;
    };
    return fn;
}

async function syncedAfter(env, count) {
    await waitFor(() => env.fake.configCalls.length > count && env.server.poller.current === null, 3000, 'a config poll');
}

test('config poll: changes from the API are applied without a restart', async (t) => {
    const config = remote({ enabled: true, mode: 'log', origins: null, updated_at: '2026-10-15T00:00:00Z' });
    const env = await startServer({ env: { SOCKETCLUSTER_AUTH_ENABLED: 'false' }, remoteConfig: config, decide: allowOrders });
    t.after(() => env.close());

    await waitFor(() => env.server.runtime.mode === 'log', 3000, 'log mode from the API');
    assert.ok(env.fake.configCalls.every((call) => call.method === 'GET' && call.signatureOk), 'polls are signed with the authorize key');

    let stats = await env.stats();
    assert.equal(stats.mode, 'log');
    assert.equal(stats.auth_enabled, true);
    assert.equal(stats.config.source, 'api');
    assert.equal(stats.config.enabled, true);
    assert.equal(stats.config.mode, 'log');
    assert.equal(stats.config.last_sync_error, null);
    assert.ok(Date.parse(stats.config.last_sync_at) > 0);
    assert.ok(env.logs.some((record) => record.event === 'socket_config_applied' && record.mode === 'log' && record.previous_mode === 'off'));

    // Switched off again from the console: everything is allowed and nothing is logged.
    config.set({ enabled: false, mode: 'enforce', origins: null, updated_at: null });
    await waitFor(() => env.server.runtime.mode === 'off', 3000, 'off from the API');
    stats = await env.stats();
    assert.equal(stats.auth_enabled, false);
    const { socket } = await env.connect();
    assert.equal((await trySubscribe(socket, 'order.anything')).ok, true);
    assert.equal(denyLogs(env.logs).length, 0);
});

test('config poll: an API mode of null falls back to SOCKETCLUSTER_AUTH_MODE', async (t) => {
    const env = await startServer({
        env: { SOCKETCLUSTER_AUTH_ENABLED: 'false', SOCKETCLUSTER_AUTH_MODE: 'log' },
        remoteConfig: remote({ enabled: true, mode: null, origins: null, updated_at: null }),
    });
    t.after(() => env.close());

    await waitFor(() => env.server.runtime.enabled, 3000, 'enabled from the API');
    assert.equal(env.server.runtime.mode, 'log');
});

test('config poll: an unreachable API keeps the last good config', async (t) => {
    const config = remote({ enabled: true, mode: 'log', origins: null, updated_at: null });
    const env = await startServer({ env: { SOCKETCLUSTER_AUTH_ENABLED: 'false' }, remoteConfig: config });
    t.after(() => env.close());

    await waitFor(() => env.server.runtime.mode === 'log', 3000, 'log mode from the API');

    config.set({ status: 503, body: { error: 'down' } });
    await waitFor(() => env.server.runtime.lastSyncError === 'http_503', 3000, 'a failed poll');
    let stats = await env.stats();
    assert.equal(stats.config.mode, 'log');
    assert.equal(stats.config.enabled, true);
    assert.equal(stats.config.source, 'api');
    assert.equal(stats.config.last_sync_error, 'http_503');

    config.set('hangup');
    await waitFor(() => env.server.runtime.lastSyncError === 'unreachable', 3000, 'an unreachable API');
    config.set({ enabled: 'yes', mode: 'sideways' });
    await waitFor(() => env.server.runtime.lastSyncError === 'bad_response', 3000, 'a malformed answer');
    assert.equal(env.server.runtime.mode, 'log', 'a malformed answer changes nothing');
    assert.equal(env.logs.filter((record) => record.event === 'socket_config_sync_failed').length, 3, 'one warning per distinct failure');

    // Recovery clears the error.
    config.set({ enabled: true, mode: 'log', origins: null, updated_at: null });
    await waitFor(() => env.server.runtime.lastSyncError === null, 3000, 'recovery');
    stats = await env.stats();
    assert.equal(stats.config.last_sync_error, null);
    assert.ok(stats.counters.config_poll_errors >= 3);
});

test('config poll: an API that never answered leaves the environment config in force', async (t) => {
    const env = await startServer({ env: { SOCKETCLUSTER_AUTH_MODE: 'log' }, remoteConfig: remote('hangup') });
    t.after(() => env.close());

    await waitFor(() => env.server.runtime.lastSyncError === 'unreachable', 3000, 'a failed poll');
    const stats = await env.stats();
    assert.deepEqual(
        { enabled: stats.config.enabled, mode: stats.config.mode, source: stats.config.source, last_sync_at: stats.config.last_sync_at },
        { enabled: true, mode: 'log', source: 'env', last_sync_at: null }
    );
});

test('config poll: without a key there is no polling, as before', async (t) => {
    const env = await startServer({ env: { SOCKETCLUSTER_AUTH_KEY: '' }, remoteConfig: remote({ enabled: true, mode: 'enforce', origins: null }) });
    t.after(() => env.close());

    assert.equal(env.server.poller, null);
    await delay(300);
    assert.equal(env.fake.configCalls.length, 0);
    assert.equal(env.server.runtime.mode, 'off');
    const stats = await env.internalRequest('/stats', { method: 'GET' });
    assert.equal(stats.status, 503);
    await stats.text();
});

test('config poll: enabling at runtime starts verifying and authorizing subscriptions', async (t) => {
    const config = remote({ enabled: false, mode: null, origins: null, updated_at: null });
    const env = await startServer({ env: { SOCKETCLUSTER_AUTH_ENABLED: 'false' }, remoteConfig: config, decide: allowOrders });
    t.after(() => env.close());

    await syncedAfter(env, 0);
    const token = signJwt(userClaims());
    const before = await env.connect({ token });
    assert.equal((await trySubscribe(before.socket, 'order.someone_else')).ok, true, 'off: allowed without asking');
    assert.equal(env.fake.calls.length, 0);

    // Switch on (mode null -> enforce). Sockets are disconnected once so their old
    // subscriptions are authorized again on reconnect.
    const closed = before.socket.listener('close').once();
    config.set({ enabled: true, mode: null, origins: null, updated_at: null });
    await waitFor(() => env.server.runtime.mode === 'enforce', 3000, 'enforce from the API');
    const { code } = await withTimeout(closed, 3000, 'disconnect on entering enforce');
    assert.equal(code, ENFORCE_RECONNECT_CODE);
    assert.ok(env.logs.some((record) => record.event === 'socket_reconnect_all' && record.reason === 'auth_enforced'));

    const after = await env.connect({ token });
    assert.equal(after.status.isAuthenticated, true);
    const denied = await trySubscribe(after.socket, 'order.someone_else');
    assert.equal(denied.ok, false);
    assert.equal(denied.error.reason, 'not_found');
    assert.equal((await trySubscribe(after.socket, 'order.allowed_1')).ok, true);
    assert.equal(env.fake.calls.length, 2, 'the API is asked once enabled');
    assert.ok(env.fake.calls.every((call) => call.signatureOk));

    const anonymous = await env.connect();
    assert.equal((await trySubscribe(anonymous.socket, 'company.company-uuid-1')).ok, false);

    const stats = await env.stats();
    assert.equal(stats.counters.runtime_reconnects, 1);
});

test('config poll: switching to enforce blocks client publish', async (t) => {
    const config = remote({ enabled: true, mode: 'log', origins: null, updated_at: null });
    const env = await startServer({ env: { SOCKETCLUSTER_AUTH_MODE: 'log' }, remoteConfig: config });
    t.after(() => env.close());

    await syncedAfter(env, 0);
    const first = await env.connect({ token: signJwt(userClaims()) });
    await first.socket.invokePublish('user.user-uuid-1', { x: 1 });
    assert.equal(env.server.agServer.allowClientPublish, true);

    config.set({ enabled: true, mode: 'enforce', origins: null, updated_at: null });
    await waitFor(() => env.server.runtime.mode === 'enforce', 3000, 'enforce from the API');
    assert.equal(env.server.agServer.allowClientPublish, false);

    const second = await env.connect({ token: signJwt(userClaims()) });
    await assert.rejects(second.socket.invokePublish('user.user-uuid-1', { x: 1 }), /Client publish feature is disabled/);

    // And back to log: client publish works again.
    config.set({ enabled: true, mode: 'log', origins: null, updated_at: null });
    await waitFor(() => env.server.runtime.mode === 'log', 3000, 'log from the API');
    assert.equal(env.server.agServer.allowClientPublish, true);
    await second.socket.invokePublish('user.user-uuid-1', { x: 2 });
});

test('config poll: an origins change applies to new handshakes, and null restores the environment value', async (t) => {
    const config = remote({ enabled: false, mode: null, origins: null, updated_at: null });
    const env = await startServer({
        env: { SOCKETCLUSTER_AUTH_ENABLED: 'false', SOCKETCLUSTER_OPTIONS: JSON.stringify({ origins: 'env.example.com:*' }) },
        remoteConfig: config,
    });
    t.after(() => env.close());

    await syncedAfter(env, 0);
    assert.equal(await handshakeStatus(env.port, 'https://env.example.com'), 101);
    assert.equal(await handshakeStatus(env.port, 'https://console.example.com'), 403);

    config.set({ enabled: false, mode: null, origins: 'console.example.com:*', updated_at: null });
    await waitFor(() => env.server.runtime.origins === 'console.example.com:*', 3000, 'origins from the API');
    assert.equal(await handshakeStatus(env.port, 'https://console.example.com'), 101);
    assert.equal(await handshakeStatus(env.port, 'https://env.example.com'), 403);
    assert.equal((await env.stats()).config.origins, 'console.example.com:*');

    config.set({ enabled: false, mode: null, origins: '*:*', updated_at: null });
    await waitFor(() => env.server.runtime.origins === '*:*', 3000, 'all origins from the API');
    assert.equal(await handshakeStatus(env.port, 'https://anything.example.org'), 101);

    config.set({ enabled: false, mode: null, origins: null, updated_at: null });
    await waitFor(() => env.server.runtime.origins === 'env.example.com:*', 3000, 'env origins restored');
    assert.equal(await handshakeStatus(env.port, 'https://anything.example.org'), 403);
});

test('GET /stats aggregates denials without tokens, subjects or channel ids', async (t) => {
    const env = await startServer({ env: { SOCKETCLUSTER_AUTH_MODE: 'log' }, decide: allowOrders });
    t.after(() => env.close());

    const token = signJwt(userClaims());
    const anonymous = await env.connect({ query: { client: 'navigator/2.1.0' } });
    await trySubscribe(anonymous.socket, 'order.order_secret_1');
    await trySubscribe(anonymous.socket, 'order.order_secret_2');
    await trySubscribe(anonymous.socket, 'nodotchannelid123');
    const user = await env.connect({ token });
    await trySubscribe(user.socket, 'order.someone_else_42');
    await user.socket.invokePublish('company.company-uuid-1', { x: 1 });
    await env.connect({ token: signJwt(userClaims({ iss: 'someone-else' })) });

    const stats = await env.stats();
    const rows = Object.fromEntries(stats.denials.map((row) => [`${row.client}|${row.prefix}|${row.reason}`, row]));
    assert.equal(rows['navigator/2.1.0|order|no_token'].count, 2);
    assert.equal(rows['navigator/2.1.0|other|no_token'].count, 1);
    assert.equal(rows['test/1.0|order|not_found'].count, 1);
    assert.equal(rows['test/1.0|company|client_publish_disabled'].count, 1);
    assert.equal(rows['test/1.0|null|bad_iss'].count, 1);
    assert.deepEqual(Object.keys(stats.denials[0]).sort(), ['client', 'count', 'last_at', 'prefix', 'reason']);
    assert.equal(stats.denials[0].count, 2, 'sorted by count');

    const raw = JSON.stringify(stats);
    for (const secret of [token, 'order_secret_1', 'someone_else_42', 'nodotchannelid123', 'user-uuid-1', 'company-uuid-1', 'company_abc123', AUTH_KEY]) {
        assert.equal(raw.includes(secret), false, `/stats leaks ${secret}`);
    }
});
