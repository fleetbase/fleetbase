import { module, test } from 'qunit';
import { initialize } from '@fleetbase/console/initializers/load-intl-polyfills';

module('Unit | Initializer | load-intl-polyfills', function () {
    test('it defers readiness while the polyfills load and advances afterwards', async function (assert) {
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

        // The polyfills load through dynamic imports in a bare async IIFE, which settled()
        // does not track — wait on advanceReadiness itself.
        await didAdvance;

        assert.deepEqual(calls, ['defer', 'advance'], 'readiness advances once the polyfills resolve');
    });
});
