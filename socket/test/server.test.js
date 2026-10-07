'use strict';

/**
 * Integration tests: the real server on ephemeral ports, a fake API authorize endpoint and
 * real socketcluster-client connections.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { startServer, signJwt, userClaims, nowSeconds, trySubscribe, withTimeout, delay, AUTH_KEY } = require('./helpers');
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

    // The signed internal publish endpoint stays closed until the switch is on.
    const publish = await env.internalRequest('/publish', { body: { channels: ['order.anything'], data: {} } });
    assert.equal(publish.status, 503);
    await publish.text();
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
