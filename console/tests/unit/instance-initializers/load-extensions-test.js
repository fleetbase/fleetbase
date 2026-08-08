import { module, test } from 'qunit';
import { initialize } from '@fleetbase/console/instance-initializers/load-extensions';

module('Unit | Instance Initializer | load-extensions', function () {
    test('it loads the extensions for the application', async function (assert) {
        const application = { name: 'console' };
        let loadedFor;

        await initialize({
            application,
            lookup: () => ({
                loadExtensions(app) {
                    loadedFor = app;
                    return Promise.resolve();
                },
            }),
        });

        assert.strictEqual(loadedFor, application);
    });

    test('a failing extension load is swallowed so boot continues', async function (assert) {
        await initialize({
            application: {},
            lookup: () => ({
                loadExtensions() {
                    return Promise.reject(new Error('bad extension'));
                },
            }),
        });

        assert.ok(true, 'the rejection does not propagate');
    });
});
