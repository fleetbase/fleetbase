import { module, test } from 'qunit';
import { initialize } from '@fleetbase/console/instance-initializers/setup-extensions';

module('Unit | Instance Initializer | setup-extensions', function () {
    test('it sets up the extensions with the universe service', async function (assert) {
        const universe = { name: 'universe' };
        const extensionManager = {
            calls: [],
            setupExtensions(appInstance, universeService) {
                this.calls.push([appInstance, universeService]);
                return Promise.resolve();
            },
        };

        const appInstance = {
            lookup(name) {
                return name === 'service:universe' ? universe : extensionManager;
            },
        };

        await initialize(appInstance);

        assert.deepEqual(extensionManager.calls, [[appInstance, universe]], 'the app instance and universe are passed through');
    });
});
