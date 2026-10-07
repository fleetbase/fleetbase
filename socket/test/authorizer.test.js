'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Authorizer, ALLOW_TTL_SECONDS, DENY_TTL_SECONDS } = require('../lib/authorizer');
const { deriveKey, verifyRequest, PURPOSE_AUTHORIZE } = require('../lib/signing');
const { Stats } = require('../lib/stats');

const AUTH_KEY = 'authorizer-test-key-0123456789abcdefghijklmn';
const AUTHORIZE_KEY = deriveKey(AUTH_KEY, PURPOSE_AUTHORIZE);
const URL = 'http://api.test/int/v1/socket/authorize';
const START_MS = 1700000000 * 1000;

function clock() {
    const state = { now: START_MS };
    return { now: () => state.now, advance: (seconds) => (state.now += seconds * 1000) };
}

function claims(overrides = {}) {
    const now = START_MS / 1000;
    return { iss: 'fleetbase-api', aud: 'fleetbase-socket', iat: now, exp: now + 900, jti: 'jti-1', kind: 'user', sub: 'u1', cid: 'c1', ids: ['u1'], ...overrides };
}

function jsonResponse(payload, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => payload,
        text: async () => JSON.stringify(payload),
    };
}

/** A fetch stub that records calls and answers with `respond(call)`. */
function stubFetch(respond) {
    const calls = [];
    const fetch = async (url, init) => {
        const call = { url, init, body: JSON.parse(init.body) };
        calls.push(call);
        return respond(call);
    };
    return { fetch, calls };
}

function makeAuthorizer(fetch, extra = {}) {
    const c = extra.clock || clock();
    const stats = new Stats();
    const authorizer = new Authorizer({ url: URL, authorizeKey: AUTHORIZE_KEY, fetch, now: c.now, stats, ...extra.options });
    return { authorizer, clock: c, stats };
}

test('requires a url and a key', () => {
    assert.throws(() => new Authorizer({ authorizeKey: 'x' }), TypeError);
    assert.throws(() => new Authorizer({ url: URL }), TypeError);
});

test('local rules answer without calling the API', async () => {
    const { fetch, calls } = stubFetch(() => jsonResponse({ allow: false }));
    const { authorizer } = makeAuthorizer(fetch);
    assert.deepEqual(await authorizer.authorize({ claims: claims(), signedToken: 't', channel: 'user.u1' }), { allow: true, reason: 'own_channel', source: 'local' });
    assert.deepEqual(await authorizer.authorize({ claims: null, signedToken: null, channel: 'order.x' }), { allow: false, reason: 'no_token', source: 'local' });
    assert.equal(calls.length, 0);
});

test('asks the API with a signed {token, channel} body', async () => {
    const { fetch, calls } = stubFetch(() => jsonResponse({ allow: true, ttl: 300, reason: 'company_match' }));
    const { authorizer } = makeAuthorizer(fetch);
    const decision = await authorizer.authorize({ claims: claims(), signedToken: 'signed.jwt.token', channel: 'order.order_1' });

    assert.deepEqual(decision, { allow: true, reason: 'company_match', source: 'remote' });
    assert.equal(calls.length, 1);
    const [call] = calls;
    assert.equal(call.url, URL);
    assert.equal(call.init.method, 'POST');
    assert.deepEqual(call.body, { token: 'signed.jwt.token', channel: 'order.order_1' });
    const verdict = verifyRequest(AUTHORIZE_KEY, {
        timestamp: call.init.headers['X-Fleetbase-Timestamp'],
        signature: call.init.headers['X-Fleetbase-Signature'],
        rawBody: call.init.body,
    });
    assert.equal(verdict.ok, true);
});

test('anonymous fleetbase.install is asked with a null token', async () => {
    const { fetch, calls } = stubFetch(() => jsonResponse({ allow: true, ttl: 30, reason: 'installer_open' }));
    const { authorizer } = makeAuthorizer(fetch);
    const decision = await authorizer.authorize({ claims: null, signedToken: 'ignored', channel: 'fleetbase.install' });
    assert.equal(decision.allow, true);
    assert.deepEqual(calls[0].body, { token: null, channel: 'fleetbase.install' });
});

test('allow decisions are cached per jti+channel for at most 300 seconds', async () => {
    const { fetch, calls } = stubFetch(() => jsonResponse({ allow: true, ttl: 99999, reason: 'ok' }));
    const { authorizer, clock: c, stats } = makeAuthorizer(fetch);
    const input = { claims: claims({ exp: START_MS / 1000 + 3000, iat: START_MS / 1000 + 2000 }), signedToken: 't', channel: 'order.1' };

    await authorizer.authorize(input);
    const second = await authorizer.authorize(input);
    assert.equal(second.source, 'cache');
    assert.equal(calls.length, 1);
    assert.equal(stats.get('authorize_cache_hits'), 1);

    // A different channel or a different token is a different entry.
    await authorizer.authorize({ ...input, channel: 'order.2' });
    await authorizer.authorize({ ...input, claims: { ...input.claims, jti: 'jti-2' } });
    assert.equal(calls.length, 3);

    c.advance(ALLOW_TTL_SECONDS - 1);
    await authorizer.authorize(input);
    assert.equal(calls.length, 3);
    c.advance(1);
    await authorizer.authorize(input);
    assert.equal(calls.length, 4);
});

test('deny decisions are cached for at most 30 seconds', async () => {
    const { fetch, calls } = stubFetch(() => jsonResponse({ allow: false, ttl: 600, reason: 'not_member' }));
    const { authorizer, clock: c } = makeAuthorizer(fetch);
    const input = { claims: claims(), signedToken: 't', channel: 'order.1' };

    assert.deepEqual(await authorizer.authorize(input), { allow: false, reason: 'not_member', source: 'remote' });
    assert.equal((await authorizer.authorize(input)).source, 'cache');
    c.advance(DENY_TTL_SECONDS);
    await authorizer.authorize(input);
    assert.equal(calls.length, 2);
});

test('normalizeDecision caps allow ttl at the token expiry and defaults a missing ttl', () => {
    const { authorizer } = makeAuthorizer(async () => jsonResponse({}));
    const now = START_MS / 1000;
    assert.equal(authorizer.normalizeDecision({ allow: true, ttl: 300 }, claims({ exp: now + 42 })).ttlSeconds, 42);
    assert.equal(authorizer.normalizeDecision({ allow: true }, claims()).ttlSeconds, 300);
    assert.equal(authorizer.normalizeDecision({ allow: true, ttl: 10 }, claims()).ttlSeconds, 10);
    assert.equal(authorizer.normalizeDecision({ allow: false }, claims()).ttlSeconds, 30);
    assert.equal(authorizer.normalizeDecision({ allow: false, ttl: -5 }, claims()).ttlSeconds, 30);
    assert.equal(authorizer.normalizeDecision({ allow: true, ttl: 'x' }, null).ttlSeconds, 300);
    assert.equal(authorizer.normalizeDecision({ allow: true, ttl: 0 }, claims()).ttlSeconds, 0);
});

test('reasons from the API are sanitised', () => {
    const { authorizer } = makeAuthorizer(async () => jsonResponse({}));
    assert.equal(authorizer.normalizeDecision({ allow: false, reason: 'Not <b>ok</b>' }, null).reason, 'denied');
    assert.equal(authorizer.normalizeDecision({ allow: true, reason: 42 }, null).reason, 'allowed');
    assert.equal(authorizer.normalizeDecision({ allow: false, reason: 'unknown_prefix' }, null).reason, 'unknown_prefix');
});

test('a zero ttl is not cached', async () => {
    const { fetch, calls } = stubFetch(() => jsonResponse({ allow: true, ttl: 0, reason: 'ok' }));
    const { authorizer } = makeAuthorizer(fetch);
    const input = { claims: claims(), signedToken: 't', channel: 'order.1' };
    await authorizer.authorize(input);
    await authorizer.authorize(input);
    assert.equal(calls.length, 2);
});

test('tokens without a jti are keyed by a hash of the signed token', async () => {
    const { fetch, calls } = stubFetch(() => jsonResponse({ allow: true, ttl: 300, reason: 'ok' }));
    const { authorizer } = makeAuthorizer(fetch);
    const base = claims({ jti: undefined });
    await authorizer.authorize({ claims: base, signedToken: 'token-a', channel: 'order.1' });
    await authorizer.authorize({ claims: base, signedToken: 'token-a', channel: 'order.1' });
    await authorizer.authorize({ claims: base, signedToken: 'token-b', channel: 'order.1' });
    assert.equal(calls.length, 2);
    assert.notEqual(authorizer.cacheKey(base, 'token-a', 'c'), authorizer.cacheKey(base, 'token-b', 'c'));
    assert.equal(authorizer.cacheKey(null, null, 'c'), 'anon|c');
});

test('concurrent identical requests share one API call', async () => {
    let release;
    const gate = new Promise((resolve) => (release = resolve));
    const { fetch, calls } = stubFetch(async () => {
        await gate;
        return jsonResponse({ allow: true, ttl: 300, reason: 'ok' });
    });
    const { authorizer, stats } = makeAuthorizer(fetch);
    const input = { claims: claims(), signedToken: 't', channel: 'order.1' };

    const first = authorizer.authorize(input);
    const second = authorizer.authorize(input);
    const other = authorizer.authorize({ ...input, channel: 'order.2' });
    assert.equal(authorizer.inflight.size, 2);
    release();
    const results = await Promise.all([first, second, other]);

    assert.equal(calls.length, 2);
    assert.equal(stats.get('authorize_inflight_joins'), 1);
    assert.deepEqual(results[0], results[1]);
    assert.equal(authorizer.inflight.size, 0);
});

test('a slow API fails closed with authorize_timeout and is not cached', async () => {
    let attempts = 0;
    const fetch = (url, init) =>
        new Promise((resolve, reject) => {
            attempts++;
            init.signal.addEventListener('abort', () => {
                const error = new Error('aborted');
                error.name = 'AbortError';
                reject(error);
            });
        });
    const { authorizer, stats } = makeAuthorizer(fetch, { options: { timeoutMs: 30 } });
    const input = { claims: claims(), signedToken: 't', channel: 'order.1' };

    const started = Date.now();
    assert.deepEqual(await authorizer.authorize(input), { allow: false, reason: 'authorize_timeout', source: 'remote' });
    assert.ok(Date.now() - started < 1000);
    await authorizer.authorize(input);
    assert.equal(attempts, 2);
    assert.equal(stats.get('authorize_timeouts'), 2);
});

test('the default timeout is two seconds', () => {
    const authorizer = new Authorizer({ url: URL, authorizeKey: AUTHORIZE_KEY, fetch: async () => jsonResponse({}) });
    assert.equal(authorizer.timeoutMs, 2000);
});

test('HTTP errors, bad payloads and network failures all deny without caching', async () => {
    const cases = [
        [() => jsonResponse({ error: 'x' }, 500), 'authorize_http_500'],
        [() => jsonResponse({ error: 'x' }, 401), 'authorize_http_401'],
        [() => jsonResponse({ allow: 'yes' }), 'authorize_bad_response'],
        [() => jsonResponse(null), 'authorize_bad_response'],
        [() => ({ ok: true, status: 200, json: async () => JSON.parse('{nope'), text: async () => '{nope' }), 'authorize_bad_response'],
        [
            () => {
                throw new TypeError('fetch failed');
            },
            'authorize_unreachable',
        ],
    ];
    for (const [respond, reason] of cases) {
        const { fetch, calls } = stubFetch(respond);
        const { authorizer } = makeAuthorizer(fetch);
        const input = { claims: claims(), signedToken: 't', channel: 'order.1' };
        assert.deepEqual(await authorizer.authorize(input), { allow: false, reason, source: 'remote' }, reason);
        await authorizer.authorize(input);
        assert.equal(calls.length, 2, `${reason} must not be cached`);
    }
});
