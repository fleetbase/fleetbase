import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import loadRuntimeConfig, { applyRuntimeConfig, clearRuntimeConfigCache } from '@fleetbase/console/utils/runtime-config';
import config from '@fleetbase/console/config/environment';
import { get, set } from '@ember/object';

const TOUCHED_PATHS = ['API.host', 'API.namespace', 'socket.path', 'socket.hostname', 'socket.secure', 'socket.port', 'osrm.host', 'APP.extensions'];

const CACHE_KEY = 'fleetbase_runtime_config';
const CACHE_VERSION_KEY = 'fleetbase_runtime_config_version';
const CACHE_TTL = 1000 * 60 * 60;

/**
 * loadRuntimeConfig() only consults the cache in production, so the cache branches can
 * only be reached by standing the environment up as production for the duration of a test.
 */
function asProduction() {
    set(config, 'APP.disableRuntimeConfig', false);
    set(config, 'environment', 'production');
}

function writeCache(runtimeConfig, { version = config.APP.version, age = 0 } = {}) {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ config: runtimeConfig, timestamp: Date.now() - age }));

    if (version !== null) {
        window.localStorage.setItem(CACHE_VERSION_KEY, version);
    }
}

/**
 * Replaces a localStorage method with one that throws, so the defensive try/catch blocks
 * can be driven the way a private-mode or quota-exhausted browser would drive them.
 * Storage methods live on Storage.prototype; an own property on the instance shadows them.
 */
function breakStorage(method) {
    Object.defineProperty(window.localStorage, method, {
        configurable: true,
        value() {
            throw new Error('QuotaExceededError');
        },
    });

    return () => delete window.localStorage[method];
}

module('Unit | Utility | runtime-config', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        // applyRuntimeConfig writes straight into the shared environment config, so
        // snapshot everything it can touch and put it back afterwards.
        this.snapshot = TOUCHED_PATHS.map((path) => [path, get(config, path)]);
        this.environment = config.environment;
        this.disableRuntimeConfig = config.APP.disableRuntimeConfig;
        this.fetch = window.fetch;

        // Nothing in these tests should reach the network; each one opts into a response.
        this.requests = [];
        window.fetch = (...args) => {
            this.requests.push(args);
            return Promise.reject(new Error('unexpected request'));
        };
        this.respondWith = (response) => {
            window.fetch = (...args) => {
                this.requests.push(args);
                return Promise.resolve(response);
            };
        };
    });

    hooks.afterEach(function () {
        this.snapshot.forEach(([path, value]) => set(config, path, value));
        set(config, 'environment', this.environment);
        set(config, 'APP.disableRuntimeConfig', this.disableRuntimeConfig);
        window.fetch = this.fetch;
    });

    test('it maps the runtime keys onto their config paths', function (assert) {
        applyRuntimeConfig({
            API_HOST: 'https://api.example.com',
            API_NAMESPACE: 'v2',
            SOCKETCLUSTER_HOST: 'socket.example.com',
            SOCKETCLUSTER_PATH: '/ws',
            OSRM_HOST: 'https://osrm.example.com',
        });

        assert.strictEqual(get(config, 'API.host'), 'https://api.example.com');
        assert.strictEqual(get(config, 'API.namespace'), 'v2');
        assert.strictEqual(get(config, 'socket.hostname'), 'socket.example.com');
        assert.strictEqual(get(config, 'socket.path'), '/ws');
        assert.strictEqual(get(config, 'osrm.host'), 'https://osrm.example.com');
    });

    test('the socket port is coerced to a number', function (assert) {
        applyRuntimeConfig({ SOCKETCLUSTER_PORT: '8000' });

        assert.strictEqual(get(config, 'socket.port'), 8000, 'a string port becomes an integer');
    });

    test('the secure flag is coerced to a boolean', function (assert) {
        applyRuntimeConfig({ SOCKETCLUSTER_SECURE: 'true' });
        assert.true(get(config, 'socket.secure'), 'the string "true" becomes true');

        applyRuntimeConfig({ SOCKETCLUSTER_SECURE: 'false' });
        assert.false(get(config, 'socket.secure'), 'the string "false" becomes false');
    });

    test('extensions are coerced to an array from either a string or a list', function (assert) {
        applyRuntimeConfig({ EXTENSIONS: 'fleet-ops,storefront,pallet' });
        assert.deepEqual(get(config, 'APP.extensions'), ['fleet-ops', 'storefront', 'pallet'], 'a comma separated string splits');

        applyRuntimeConfig({ EXTENSIONS: ['fleet-ops'] });
        assert.deepEqual(get(config, 'APP.extensions'), ['fleet-ops'], 'an existing array is copied');
    });

    test('unmapped keys are ignored rather than written', function (assert) {
        const before = get(config, 'API.host');

        applyRuntimeConfig({ NOT_A_REAL_KEY: 'whatever' });

        assert.strictEqual(get(config, 'API.host'), before, 'nothing else is disturbed');
        assert.strictEqual(config.NOT_A_REAL_KEY, undefined, 'the unknown key is not set anywhere');
    });

    test('an empty config is a no-op', function (assert) {
        const before = get(config, 'API.host');

        applyRuntimeConfig();

        assert.strictEqual(get(config, 'API.host'), before);
    });

    test('clearRuntimeConfigCache removes both cache entries', function (assert) {
        window.localStorage.setItem('fleetbase_runtime_config', JSON.stringify({ config: {}, timestamp: Date.now() }));
        window.localStorage.setItem('fleetbase_runtime_config_version', '1.0.0');

        clearRuntimeConfigCache();

        assert.strictEqual(window.localStorage.getItem('fleetbase_runtime_config'), null);
        assert.strictEqual(window.localStorage.getItem('fleetbase_runtime_config_version'), null);
    });

    test('clearRuntimeConfigCache swallows a storage failure', function (assert) {
        window.localStorage.setItem(CACHE_KEY, 'cached-payload');
        const restore = breakStorage('removeItem');

        try {
            clearRuntimeConfigCache();
        } finally {
            restore();
        }

        assert.strictEqual(window.localStorage.getItem(CACHE_KEY), 'cached-payload', 'the entry survives because removal threw, but the error did not escape');
    });

    test('loadRuntimeConfig does nothing when runtime config is disabled', async function (assert) {
        set(config, 'APP.disableRuntimeConfig', true);
        const before = get(config, 'API.host');

        await loadRuntimeConfig();

        assert.deepEqual(this.requests, [], 'no request is made');
        assert.strictEqual(get(config, 'API.host'), before, 'the built-in config is left alone');
    });

    test('loadRuntimeConfig applies a fresh cached config in production without a request', async function (assert) {
        asProduction();
        writeCache({ API_HOST: 'https://cached.example.com' });

        await loadRuntimeConfig();

        assert.strictEqual(get(config, 'API.host'), 'https://cached.example.com', 'the cached override is applied');
        assert.deepEqual(this.requests, [], 'a cache hit skips the network entirely');
    });

    test('loadRuntimeConfig falls through to the server when the cache is empty', async function (assert) {
        asProduction();
        this.respondWith({ ok: true, json: () => Promise.resolve({ API_NAMESPACE: 'from-server' }) });

        await loadRuntimeConfig();

        assert.strictEqual(get(config, 'API.namespace'), 'from-server');
        assert.strictEqual(this.requests.length, 1, 'the config file is requested');
        assert.strictEqual(this.requests[0][0], '/fleetbase.config.json');
        assert.deepEqual(this.requests[0][1], { cache: 'default' });
        assert.deepEqual(JSON.parse(window.localStorage.getItem(CACHE_KEY)).config, { API_NAMESPACE: 'from-server' }, 'the response is cached for the next boot');
        assert.strictEqual(window.localStorage.getItem(CACHE_VERSION_KEY), config.APP.version, 'the cache is stamped with the app version');
    });

    test('loadRuntimeConfig ignores a cached config that has no version stamp', async function (assert) {
        asProduction();
        writeCache({ API_HOST: 'https://stale.example.com' }, { version: null });
        this.respondWith({ ok: true, json: () => Promise.resolve({ API_HOST: 'https://server.example.com' }) });

        await loadRuntimeConfig();

        assert.strictEqual(get(config, 'API.host'), 'https://server.example.com', 'an unstamped cache is not trusted');
        assert.strictEqual(this.requests.length, 1);
    });

    test('loadRuntimeConfig discards a cache written by a different app version', async function (assert) {
        asProduction();
        writeCache({ API_HOST: 'https://stale.example.com' }, { version: 'some-other-version' });
        this.respondWith({ ok: true, json: () => Promise.resolve({ API_HOST: 'https://server.example.com' }) });

        await loadRuntimeConfig();

        assert.strictEqual(get(config, 'API.host'), 'https://server.example.com', 'a version mismatch invalidates the cache');
        assert.strictEqual(this.requests.length, 1);
    });

    test('loadRuntimeConfig discards a cache older than the TTL', async function (assert) {
        asProduction();
        writeCache({ API_HOST: 'https://stale.example.com' }, { age: CACHE_TTL + 1000 });
        this.respondWith({ ok: true, json: () => Promise.resolve({ API_HOST: 'https://server.example.com' }) });

        await loadRuntimeConfig();

        assert.strictEqual(get(config, 'API.host'), 'https://server.example.com', 'an expired cache is refetched');
        assert.strictEqual(this.requests.length, 1);
    });

    test('loadRuntimeConfig discards cache data it cannot parse', async function (assert) {
        asProduction();
        window.localStorage.setItem(CACHE_KEY, 'not-json');
        window.localStorage.setItem(CACHE_VERSION_KEY, config.APP.version);
        this.respondWith({ ok: true, json: () => Promise.resolve({ API_HOST: 'https://server.example.com' }) });

        await loadRuntimeConfig();

        assert.strictEqual(get(config, 'API.host'), 'https://server.example.com', 'corrupt cache data falls back to the server');
        assert.strictEqual(this.requests.length, 1);
    });

    test('loadRuntimeConfig keeps the built-in defaults when there is no config file', async function (assert) {
        set(config, 'APP.disableRuntimeConfig', false);
        const before = get(config, 'API.host');
        this.respondWith({ ok: false, status: 404 });

        await loadRuntimeConfig();

        assert.strictEqual(get(config, 'API.host'), before, 'a 404 leaves the built-in config in place');
        assert.strictEqual(window.localStorage.getItem(CACHE_KEY), null, 'nothing is cached for a missing file');
    });

    test('loadRuntimeConfig swallows a failed request', async function (assert) {
        set(config, 'APP.disableRuntimeConfig', false);
        const before = get(config, 'API.host');

        // The default beforeEach stub rejects, standing in for an offline browser.
        await loadRuntimeConfig();

        assert.strictEqual(this.requests.length, 1, 'the request was attempted');
        assert.strictEqual(get(config, 'API.host'), before, 'boot continues on the built-in config');
    });

    test('loadRuntimeConfig still applies a config it cannot cache', async function (assert) {
        set(config, 'APP.disableRuntimeConfig', false);
        this.respondWith({ ok: true, json: () => Promise.resolve({ API_HOST: 'https://uncacheable.example.com' }) });
        const restore = breakStorage('setItem');

        try {
            await loadRuntimeConfig();
        } finally {
            restore();
        }

        assert.strictEqual(get(config, 'API.host'), 'https://uncacheable.example.com', 'a storage failure does not stop the config being applied');
        assert.strictEqual(window.localStorage.getItem(CACHE_KEY), null, 'and nothing was written');
    });
});
