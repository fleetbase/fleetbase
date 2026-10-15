'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ConfigPoller } = require('../lib/config-poller');
const { RuntimeConfig } = require('../lib/runtime');
const { loadConfig } = require('../lib/config');
const { Stats } = require('../lib/stats');
const { deriveKey, verifyRequest, PURPOSE_AUTHORIZE } = require('../lib/signing');
const { captureLogger, delay, waitFor } = require('./helpers');

const KEY = 'k'.repeat(32);
const AUTHORIZE_KEY = deriveKey(KEY, PURPOSE_AUTHORIZE);
const URL_ = 'http://api.test/int/v1/socket/config';

function jsonResponse(payload, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => payload,
        text: async () => JSON.stringify(payload),
    };
}

function setup(fetchImpl, overrides = {}) {
    const runtime = new RuntimeConfig(loadConfig({ SOCKETCLUSTER_AUTH_KEY: KEY }));
    const { records, logger } = captureLogger();
    const stats = new Stats();
    const poller = new ConfigPoller({ url: URL_, authorizeKey: AUTHORIZE_KEY, intervalMs: 10, runtime, logger, fetch: fetchImpl, stats, ...overrides });
    return { runtime, poller, logs: records, stats };
}

test('the constructor requires a url, a key and a positive interval', () => {
    const runtime = new RuntimeConfig(loadConfig({}));
    const base = { url: URL_, authorizeKey: AUTHORIZE_KEY, intervalMs: 10, runtime, logger: captureLogger().logger };
    assert.throws(() => new ConfigPoller({ ...base, url: '' }), /url/);
    assert.throws(() => new ConfigPoller({ ...base, authorizeKey: '' }), /authorizeKey/);
    assert.throws(() => new ConfigPoller({ ...base, intervalMs: 0 }), /intervalMs/);
    assert.throws(() => new ConfigPoller(), /url/);
    assert.equal(new ConfigPoller(base).stats, null);
});

test('a poll is a signed GET with an empty body, and a good answer is applied', async () => {
    const requests = [];
    const { runtime, poller, logs, stats } = setup(async (url, init) => {
        requests.push({ url, init });
        return jsonResponse({ enabled: true, mode: 'log', origins: 'console.example:*', updated_at: null });
    });

    assert.deepEqual(await poller.poll(), { ok: true, changed: true });
    assert.equal(requests[0].url, URL_);
    assert.equal(requests[0].init.method, 'GET');
    assert.equal(requests[0].init.body, undefined);
    const verdict = verifyRequest(AUTHORIZE_KEY, {
        timestamp: requests[0].init.headers['X-Fleetbase-Timestamp'],
        signature: requests[0].init.headers['X-Fleetbase-Signature'],
        rawBody: '',
    });
    assert.equal(verdict.ok, true);

    assert.equal(runtime.mode, 'log');
    assert.equal(runtime.origins, 'console.example:*');
    const applied = logs.find((record) => record.event === 'socket_config_applied');
    assert.deepEqual(
        { enabled: applied.enabled, mode: applied.mode, previous_mode: applied.previous_mode, source: applied.source },
        { enabled: true, mode: 'log', previous_mode: 'off', source: 'api' }
    );
    assert.equal(JSON.stringify(logs).includes(KEY), false);

    assert.deepEqual(await poller.poll(), { ok: true, changed: false });
    assert.equal(logs.filter((record) => record.event === 'socket_config_applied').length, 1);
    assert.equal(stats.get('config_polls'), 2);
});

test('failures keep the last good config and are logged once per reason', async () => {
    let answer = () => jsonResponse({ enabled: true, mode: 'log', origins: null });
    const { runtime, poller, logs, stats } = setup(async (url, init) => answer(init));
    await poller.poll();

    const cases = [
        [() => jsonResponse({ error: 'x' }, 500), 'http_500'],
        [() => jsonResponse({ enabled: 'nope' }), 'bad_response'],
        [
            () => ({
                ok: true,
                status: 200,
                json: async () => {
                    throw new SyntaxError('Unexpected token');
                },
            }),
            'bad_response',
        ],
        [
            () => {
                throw new TypeError('fetch failed');
            },
            'unreachable',
        ],
    ];
    for (const [next, reason] of cases) {
        answer = next;
        assert.deepEqual(await poller.poll(), { ok: false, reason });
        assert.equal(runtime.mode, 'log', `${reason} keeps the last good config`);
        assert.equal(runtime.lastSyncError, reason);
    }
    assert.deepEqual(
        logs.filter((record) => record.event === 'socket_config_sync_failed').map((record) => record.reason),
        ['http_500', 'bad_response', 'unreachable'],
        'a repeated reason is not logged again'
    );
    assert.equal(stats.get('config_poll_errors'), 4);

    answer = () => jsonResponse({ enabled: true, mode: 'log', origins: null });
    await poller.poll();
    assert.equal(runtime.lastSyncError, null);
    assert.ok(logs.some((record) => record.event === 'socket_config_sync_recovered'));
});

test('a non-200 whose body cannot be read is still a clean failure', async () => {
    const { poller } = setup(async () => ({ ok: false, status: 401, text: async () => Promise.reject(new Error('gone')) }));
    assert.deepEqual(await poller.poll(), { ok: false, reason: 'http_401' });
});

test('a slow API times out', async () => {
    const waitForAbort = (url, init) =>
        new Promise((resolve, reject) => {
            init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
        });
    const { poller } = setup(waitForAbort, { timeoutMs: 20 });
    assert.deepEqual(await poller.poll(), { ok: false, reason: 'timeout' });

    // A body that stalls past the timeout counts as a timeout too.
    const { poller: stalled } = setup(async (url, init) => ({
        ok: true,
        status: 200,
        json: () =>
            new Promise((resolve, reject) => {
                init.signal.addEventListener('abort', () => reject(new Error('aborted')));
            }),
    }), { timeoutMs: 20 });
    assert.deepEqual(await stalled.poll(), { ok: false, reason: 'timeout' });
});

test('start() polls at once and then on the interval, never overlapping; stop() ends it', async () => {
    let active = 0;
    let maxActive = 0;
    let calls = 0;
    const { poller } = setup(async () => {
        calls += 1;
        active += 1;
        maxActive = Math.max(maxActive, active);
        await delay(15);
        active -= 1;
        return jsonResponse({ enabled: false });
    });

    poller.start();
    poller.start();
    assert.equal(calls, 1, 'the first poll runs immediately, once');
    await waitFor(() => calls >= 4, 2000, 'repeated polls');
    assert.equal(maxActive, 1);

    await poller.stop();
    const stoppedAt = calls;
    await delay(60);
    assert.equal(calls, stoppedAt);
    assert.equal(poller.timer, null);
    await poller.stop();
});

test('the default fetch is the global fetch', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async () => jsonResponse({ enabled: true, mode: 'enforce' });
    try {
        const { runtime, poller } = setup(undefined);
        await poller.poll();
        assert.equal(runtime.mode, 'enforce');
    } finally {
        globalThis.fetch = original;
    }
});
