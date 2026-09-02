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

    test('readiness still advances when the first attempt throws', async function (assert) {
        // The app must boot even if advancing readiness fails once — otherwise a failure
        // here would leave the console stuck on its loading screen forever.
        const calls = [];
        let advanced;
        const didAdvance = new Promise((resolve) => (advanced = resolve));
        const errors = [];
        const originalError = console.error;
        console.error = (...args) => errors.push(args[0]);

        const application = {
            deferReadiness: () => calls.push('defer'),
            advanceReadiness: () => {
                calls.push('advance');

                if (calls.length === 2) {
                    throw new Error('readiness already advanced');
                }

                advanced();
            },
        };

        try {
            initialize(application);
            await didAdvance;
        } finally {
            console.error = originalError;
        }

        assert.deepEqual(calls, ['defer', 'advance', 'advance'], 'the second attempt is made from the catch');
        assert.deepEqual(errors, ['[Runtime Config] Failed to load runtime config:'], 'and the failure is logged');
    });
});
