import { module, test } from 'qunit';
import { initialize } from '@fleetbase/console/initializers/load-runtime-engines';

const RUNTIME_ENGINES_MODULE = '@fleetbase/ember-core/utils/runtime-engines';

/**
 * The initializer only sequences: wait for the runtime config, prepare the
 * runtime engines, and always release readiness. prepareRuntimeEngines is
 * replaced on its module object, which the compiled import reads at call time.
 */
module('Unit | Initializer | load-runtime-engines', function (hooks) {
    hooks.beforeEach(function () {
        this.runtime = window.require(RUNTIME_ENGINES_MODULE);
        this.originalPrepare = this.runtime.prepareRuntimeEngines;
        this.calls = [];
        this.application = {
            deferReadiness: () => this.calls.push('defer'),
            advanceReadiness: () => this.calls.push('advance'),
        };
    });

    hooks.afterEach(function () {
        this.runtime.prepareRuntimeEngines = this.originalPrepare;
    });

    test('it waits for the runtime config, prepares the engines, then advances readiness', async function (assert) {
        let releaseConfig;
        this.application.runtimeConfigLoaded = new Promise((resolve) => (releaseConfig = resolve)).then(() => this.calls.push('config'));
        this.runtime.prepareRuntimeEngines = (application) => {
            this.calls.push(application === this.application ? 'prepare' : 'prepare (wrong application)');
            return Promise.resolve([{ name: '@acme/widgets-engine' }]);
        };

        const done = initialize(this.application);
        assert.deepEqual(this.calls, ['defer'], 'readiness is deferred synchronously');

        releaseConfig();
        await done;

        assert.deepEqual(this.calls, ['defer', 'config', 'prepare', 'advance']);
    });

    test('without a pending runtime config it prepares straight away', async function (assert) {
        this.runtime.prepareRuntimeEngines = () => {
            this.calls.push('prepare');
            return Promise.resolve([]);
        };

        await initialize(this.application);

        assert.deepEqual(this.calls, ['defer', 'prepare', 'advance']);
    });

    test('a failure is logged and readiness still advances', async function (assert) {
        const errors = [];
        const originalError = console.error;
        console.error = (...args) => errors.push(args[0]);
        this.runtime.prepareRuntimeEngines = () => Promise.reject(new Error('registry down'));

        try {
            await initialize(this.application);
        } finally {
            console.error = originalError;
        }

        assert.deepEqual(this.calls, ['defer', 'advance'], 'the console still boots');
        assert.deepEqual(errors, ['[Runtime Engines] Failed to load runtime engines:']);
    });
});
