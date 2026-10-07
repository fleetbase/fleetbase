'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig, resolveMode, buildServerOptions, parseSwitch, ConfigError, DEFAULT_AUTHORIZE_URL } = require('../lib/config');

const KEY = 'k'.repeat(32);

test('defaults: ports 8000/8001, the in-network authorize URL, auth off without a key', () => {
    const config = loadConfig({});
    assert.equal(config.port, 8000);
    assert.equal(config.internalPort, 8001);
    assert.equal(config.authorizeUrl, DEFAULT_AUTHORIZE_URL);
    assert.equal(DEFAULT_AUTHORIZE_URL, 'http://application:8000/int/v1/socket/authorize');
    assert.equal(config.authKey, null);
    assert.equal(config.authEnabled, false);
    assert.equal(config.mode, 'off');
    assert.equal(config.socketChannelLimit, 1000);
    assert.deepEqual(config.options, {});
    assert.equal(config.scc.stateServerHost, null);
});

test('without a key the mode is forced off and a warning is recorded', () => {
    const plain = loadConfig({ SOCKETCLUSTER_AUTH_ENABLED: 'true' });
    assert.equal(plain.warnings.length, 1);
    assert.match(plain.warnings[0], /SOCKETCLUSTER_AUTH_KEY is not set/);

    const requested = loadConfig({ SOCKETCLUSTER_AUTH_ENABLED: 'true', SOCKETCLUSTER_AUTH_MODE: 'enforce' });
    assert.equal(requested.mode, 'off');
    assert.match(requested.warnings[0], /SOCKETCLUSTER_AUTH_MODE=enforce was requested/);

    const blankKey = loadConfig({ SOCKETCLUSTER_AUTH_ENABLED: 'true', SOCKETCLUSTER_AUTH_KEY: '   ', SOCKETCLUSTER_AUTH_MODE: 'log' });
    assert.equal(blankKey.mode, 'off');
    assert.equal(blankKey.authEnabled, false);
});

test('the switch keeps auth off by default, even with a key and a mode', () => {
    const plain = loadConfig({});
    assert.equal(plain.mode, 'off');
    assert.equal(plain.authEnabled, false);
    assert.match(plain.warnings[0], /SOCKETCLUSTER_AUTH_ENABLED is not true/);

    const keyed = loadConfig({ SOCKETCLUSTER_AUTH_KEY: KEY, SOCKETCLUSTER_AUTH_MODE: 'enforce' });
    assert.equal(keyed.mode, 'off');
    assert.equal(keyed.authEnabled, false);
    assert.equal(keyed.authKey, KEY);
    assert.match(keyed.warnings[0], /SOCKETCLUSTER_AUTH_MODE=enforce was requested but SOCKETCLUSTER_AUTH_ENABLED is not true/);

    const explicitOff = loadConfig({ SOCKETCLUSTER_AUTH_ENABLED: 'false', SOCKETCLUSTER_AUTH_KEY: KEY });
    assert.equal(explicitOff.mode, 'off');
    assert.equal(explicitOff.authEnabled, false);

    // An unknown mode is still a configuration error while switched off.
    assert.throws(() => loadConfig({ SOCKETCLUSTER_AUTH_MODE: 'strict' }), ConfigError);

    // The key is not handed to SocketCluster while auth is off, and clients may publish.
    const options = buildServerOptions(keyed);
    assert.equal(options.authKey, undefined);
    assert.equal(options.allowClientPublish, true);
});

test('parseSwitch accepts true, 1, yes and on', () => {
    for (const value of ['true', 'TRUE', ' 1 ', 'yes', 'On']) {
        assert.equal(parseSwitch(value), true, value);
    }
    for (const value of [undefined, null, '', '  ', 'false', '0', 'no', 'off', 'enabled']) {
        assert.equal(parseSwitch(value), false, String(value));
    }
});

test('with a key the mode defaults to enforce', () => {
    const config = loadConfig({ SOCKETCLUSTER_AUTH_ENABLED: 'true', SOCKETCLUSTER_AUTH_KEY: KEY });
    assert.equal(config.mode, 'enforce');
    assert.equal(config.authEnabled, true);
    assert.equal(config.authKey, KEY);
    assert.deepEqual(config.warnings, []);
});

test('an explicit mode is honoured, case-insensitively', () => {
    assert.equal(loadConfig({ SOCKETCLUSTER_AUTH_ENABLED: 'true', SOCKETCLUSTER_AUTH_KEY: KEY, SOCKETCLUSTER_AUTH_MODE: 'LOG' }).mode, 'log');
    assert.equal(loadConfig({ SOCKETCLUSTER_AUTH_ENABLED: 'true', SOCKETCLUSTER_AUTH_KEY: KEY, SOCKETCLUSTER_AUTH_MODE: ' off ' }).mode, 'off');
    assert.equal(loadConfig({ SOCKETCLUSTER_AUTH_ENABLED: 'true', SOCKETCLUSTER_AUTH_KEY: KEY, SOCKETCLUSTER_AUTH_MODE: '' }).mode, 'enforce');
});

test('an unknown mode is a configuration error', () => {
    assert.throws(() => loadConfig({ SOCKETCLUSTER_AUTH_ENABLED: 'true', SOCKETCLUSTER_AUTH_KEY: KEY, SOCKETCLUSTER_AUTH_MODE: 'strict' }), ConfigError);
    assert.throws(() => resolveMode(false, 'nope'), ConfigError);
});

test('resolveMode', () => {
    assert.deepEqual(resolveMode(true, undefined), { mode: 'enforce', warnings: [] });
    assert.equal(resolveMode(true, 'enforce', false).mode, 'off');
    assert.equal(resolveMode(true, 'off', false).warnings.length, 1);
    assert.equal(resolveMode(true, 'log').mode, 'log');
    assert.equal(resolveMode(false, undefined).mode, 'off');
    assert.equal(resolveMode(false, 'off').warnings.length, 1);
});

test('a key shorter than 32 characters is refused', () => {
    assert.throws(() => loadConfig({ SOCKETCLUSTER_AUTH_KEY: 'k'.repeat(31) }), /at least 32 characters/);
});

test('ports are validated', () => {
    assert.equal(loadConfig({ SOCKETCLUSTER_PORT: '9000', SOCKETCLUSTER_INTERNAL_PORT: '9001' }).port, 9000);
    assert.throws(() => loadConfig({ SOCKETCLUSTER_PORT: 'abc' }), ConfigError);
    assert.throws(() => loadConfig({ SOCKETCLUSTER_PORT: '70000' }), ConfigError);
    assert.throws(() => loadConfig({ SOCKETCLUSTER_PORT: '9000', SOCKETCLUSTER_INTERNAL_PORT: '9000' }), /must differ/);
    // Port 0 (ephemeral) may repeat; used by tests.
    assert.equal(loadConfig({ SOCKETCLUSTER_PORT: '0', SOCKETCLUSTER_INTERNAL_PORT: '0' }).internalPort, 0);
});

test('the authorize URL must be an http(s) URL', () => {
    assert.equal(loadConfig({ SOCKETCLUSTER_AUTHORIZE_URL: 'https://api.internal/int/v1/socket/authorize' }).authorizeUrl, 'https://api.internal/int/v1/socket/authorize');
    assert.throws(() => loadConfig({ SOCKETCLUSTER_AUTHORIZE_URL: 'not a url' }), ConfigError);
    assert.throws(() => loadConfig({ SOCKETCLUSTER_AUTHORIZE_URL: 'ftp://x/y' }), ConfigError);
});

test('SOCKETCLUSTER_OPTIONS must be a JSON object', () => {
    assert.deepEqual(loadConfig({ SOCKETCLUSTER_OPTIONS: '{"origins":"http://localhost:*"}' }).options, { origins: 'http://localhost:*' });
    assert.throws(() => loadConfig({ SOCKETCLUSTER_OPTIONS: '{bad' }), ConfigError);
    assert.throws(() => loadConfig({ SOCKETCLUSTER_OPTIONS: '[1,2]' }), ConfigError);
    assert.throws(() => loadConfig({ SOCKETCLUSTER_OPTIONS: 'null' }), ConfigError);
});

test('auth-related SOCKETCLUSTER_OPTIONS are stripped with a warning', () => {
    const config = loadConfig({
        SOCKETCLUSTER_AUTH_ENABLED: 'true',
        SOCKETCLUSTER_AUTH_KEY: KEY,
        SOCKETCLUSTER_OPTIONS: JSON.stringify({ origins: '*:*', allowClientPublish: true, authKey: 'x', authAlgorithm: 'none' }),
    });
    assert.deepEqual(config.options, { origins: '*:*' });
    assert.equal(config.warnings.length, 3);
    assert.ok(config.warnings.some((w) => w.includes('allowClientPublish')));
});

test('buildServerOptions locks client publish in enforce mode only and pins HS256', () => {
    const enforce = buildServerOptions(loadConfig({ SOCKETCLUSTER_AUTH_ENABLED: 'true', SOCKETCLUSTER_AUTH_KEY: KEY, SOCKETCLUSTER_OPTIONS: '{"origins":"a:*"}' }));
    assert.equal(enforce.allowClientPublish, false);
    assert.equal(enforce.authKey, KEY);
    assert.deepEqual(enforce.authVerifyAlgorithms, ['HS256']);
    assert.equal(enforce.origins, 'a:*');
    assert.equal(enforce.socketChannelLimit, 1000);

    const log = buildServerOptions(loadConfig({ SOCKETCLUSTER_AUTH_ENABLED: 'true', SOCKETCLUSTER_AUTH_KEY: KEY, SOCKETCLUSTER_AUTH_MODE: 'log' }));
    assert.equal(log.allowClientPublish, true);

    const off = buildServerOptions(loadConfig({}));
    assert.equal(off.allowClientPublish, true);
    assert.equal(Object.prototype.hasOwnProperty.call(off, 'authKey'), false);
});

test('SCC settings are read from the environment', () => {
    const config = loadConfig({ SCC_STATE_SERVER_HOST: 'scc-state', SCC_STATE_SERVER_PORT: '7777', SCC_CLIENT_POOL_SIZE: 'x' });
    assert.equal(config.scc.stateServerHost, 'scc-state');
    assert.equal(config.scc.stateServerPort, 7777);
    assert.equal(config.scc.clientPoolSize, null);
});
