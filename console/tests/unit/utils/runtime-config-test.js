import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import { applyRuntimeConfig, clearRuntimeConfigCache } from '@fleetbase/console/utils/runtime-config';
import config from '@fleetbase/console/config/environment';
import { get, set } from '@ember/object';

const TOUCHED_PATHS = ['API.host', 'API.namespace', 'socket.path', 'socket.hostname', 'socket.secure', 'socket.port', 'osrm.host', 'APP.extensions'];

module('Unit | Utility | runtime-config', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        // applyRuntimeConfig writes straight into the shared environment config, so
        // snapshot everything it can touch and put it back afterwards.
        this.snapshot = TOUCHED_PATHS.map((path) => [path, get(config, path)]);
    });

    hooks.afterEach(function () {
        this.snapshot.forEach(([path, value]) => set(config, path, value));
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
});
