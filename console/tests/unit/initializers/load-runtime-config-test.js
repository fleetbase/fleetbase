import { module, test } from 'qunit';
import { initialize } from '@fleetbase/console/initializers/load-runtime-config';

module('Unit | Initializer | load-runtime-config', function () {
    test('it defers readiness while the runtime config loads and always advances', async function (assert) {
        const calls = [];
        let advanced;
        const didAdvance = new Promise((resolve) => (advanced = resolve));

        const application = {
            deferReadiness: () => calls.push('defer'),
            advanceReadiness: () => {
                calls.push('advance');
                advanced();
            },
        };

        initialize(application);

        assert.deepEqual(calls, ['defer'], 'readiness is deferred synchronously');

        // The loader runs in a bare async IIFE that settled() does not track, so wait on
        // advanceReadiness itself. Whether the config load resolves or fails, readiness
        // must advance — otherwise the app would never boot.
        await didAdvance;

        assert.deepEqual(calls, ['defer', 'advance'], 'readiness always advances');
    });
});
