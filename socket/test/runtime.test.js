'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig } = require('../lib/config');
const { RuntimeConfig, parseRemoteConfig, MAX_ORIGINS_LENGTH } = require('../lib/runtime');

const KEY = 'k'.repeat(32);

function runtimeFor(env, now = () => Date.UTC(2026, 9, 15)) {
    return new RuntimeConfig(loadConfig(env), { now });
}

test('parseRemoteConfig accepts the API shape, with null meaning "use the environment"', () => {
    assert.deepEqual(parseRemoteConfig({ enabled: true, mode: 'log', origins: 'a.example:*', updated_at: 'x' }), {
        ok: true,
        value: { enabled: true, mode: 'log', origins: 'a.example:*' },
    });
    assert.deepEqual(parseRemoteConfig({ enabled: false }), { ok: true, value: { enabled: false, mode: null, origins: null } });
    assert.deepEqual(parseRemoteConfig({ enabled: true, mode: null, origins: '  ' }).value, { enabled: true, mode: null, origins: null });
    assert.equal(parseRemoteConfig({ enabled: true, origins: ' b.example:* ' }).value.origins, 'b.example:*');
});

test('parseRemoteConfig rejects anything else', () => {
    for (const payload of [
        null,
        'enabled',
        [],
        {},
        { enabled: 'true' },
        { enabled: true, mode: 'strict' },
        { enabled: true, mode: 1 },
        { enabled: true, origins: 42 },
        { enabled: true, origins: 'a\nb' },
        { enabled: true, origins: 'a'.repeat(MAX_ORIGINS_LENGTH + 1) },
    ]) {
        assert.deepEqual(parseRemoteConfig(payload), { ok: false }, JSON.stringify(payload));
    }
});

test('the environment is the starting config', () => {
    const runtime = runtimeFor({ SOCKETCLUSTER_AUTH_ENABLED: 'true', SOCKETCLUSTER_AUTH_KEY: KEY, SOCKETCLUSTER_OPTIONS: '{"origins":"env.example:*"}' });
    assert.equal(runtime.enabled, true);
    assert.equal(runtime.mode, 'enforce');
    assert.equal(runtime.origins, 'env.example:*');
    assert.deepEqual(runtime.snapshot(), { enabled: true, mode: 'enforce', origins: 'env.example:*', source: 'env', last_sync_at: null, last_sync_error: null });
});

test('applyRemote: enabled with a mode, a null mode falling back to the env mode, then enforce', () => {
    const logEnv = runtimeFor({ SOCKETCLUSTER_AUTH_KEY: KEY, SOCKETCLUSTER_AUTH_MODE: 'log' });
    assert.equal(logEnv.mode, 'off');
    assert.equal(logEnv.applyRemote({ enabled: true, mode: null, origins: null }), true);
    assert.equal(logEnv.mode, 'log');
    logEnv.applyRemote({ enabled: true, mode: 'enforce', origins: null });
    assert.equal(logEnv.mode, 'enforce');

    const bare = runtimeFor({ SOCKETCLUSTER_AUTH_KEY: KEY });
    bare.applyRemote({ enabled: true, mode: null, origins: null });
    assert.equal(bare.enabled, true);
    assert.equal(bare.mode, 'enforce');
});

test('applyRemote: disabled forces off whatever the mode; no key never enables', () => {
    const runtime = runtimeFor({ SOCKETCLUSTER_AUTH_ENABLED: 'true', SOCKETCLUSTER_AUTH_KEY: KEY });
    runtime.applyRemote({ enabled: false, mode: 'enforce', origins: null });
    assert.equal(runtime.enabled, false);
    assert.equal(runtime.mode, 'off');

    const keyless = runtimeFor({});
    keyless.applyRemote({ enabled: true, mode: 'enforce', origins: null });
    assert.equal(keyless.enabled, false);
    assert.equal(keyless.mode, 'off');
});

test('applyRemote: origins override the environment until cleared', () => {
    const runtime = runtimeFor({ SOCKETCLUSTER_AUTH_KEY: KEY, SOCKETCLUSTER_OPTIONS: '{"origins":"env.example:*"}' });
    runtime.applyRemote({ enabled: false, mode: null, origins: 'console.example:*' });
    assert.equal(runtime.origins, 'console.example:*');
    runtime.applyRemote({ enabled: false, mode: null, origins: null });
    assert.equal(runtime.origins, 'env.example:*');
});

test('listeners run only when something changes, with the next and previous state', () => {
    let clock = 1000;
    const runtime = runtimeFor({ SOCKETCLUSTER_AUTH_KEY: KEY }, () => clock);
    const changes = [];
    runtime.onChange((next, previous) => changes.push([previous.mode, next.mode]));

    assert.equal(runtime.applyRemote({ enabled: false, mode: null, origins: null }), false, 'same as env');
    assert.equal(runtime.source, 'api');
    assert.equal(runtime.snapshot().last_sync_at, new Date(1000).toISOString());

    clock = 2000;
    assert.equal(runtime.applyRemote({ enabled: true, mode: 'log', origins: null }), true);
    assert.equal(runtime.applyRemote({ enabled: true, mode: 'log', origins: null }), false);
    assert.equal(runtime.applyRemote({ enabled: true, mode: 'log', origins: 'x.example:*' }), true);
    assert.deepEqual(changes, [
        ['off', 'log'],
        ['log', 'log'],
    ]);
    assert.equal(runtime.snapshot().last_sync_at, new Date(2000).toISOString());
});

test('a failed sync keeps the current config and is reported until the next good one', () => {
    const runtime = runtimeFor({ SOCKETCLUSTER_AUTH_KEY: KEY });
    runtime.applyRemote({ enabled: true, mode: 'log', origins: null });
    runtime.recordFailure('timeout');
    assert.equal(runtime.mode, 'log');
    assert.equal(runtime.snapshot().last_sync_error, 'timeout');
    assert.equal(runtime.snapshot().source, 'api');
    runtime.applyRemote({ enabled: true, mode: 'log', origins: null });
    assert.equal(runtime.snapshot().last_sync_error, null);
});

test('the clock defaults to Date.now', () => {
    const runtime = new RuntimeConfig(loadConfig({ SOCKETCLUSTER_AUTH_KEY: KEY }));
    const before = Date.now();
    runtime.applyRemote({ enabled: true, mode: null, origins: null });
    assert.ok(Date.parse(runtime.snapshot().last_sync_at) >= before - 1000);
});
