import { module, test } from 'qunit';
import { initialize } from '@fleetbase/console/instance-initializers/register-runtime-engines';

const RUNTIME_ENGINES_MODULE = '@fleetbase/ember-core/utils/runtime-engines';

module('Unit | Instance Initializer | register-runtime-engines', function (hooks) {
    hooks.beforeEach(function () {
        this.runtime = window.require(RUNTIME_ENGINES_MODULE);
        this.originalRegister = this.runtime.registerRuntimeEngines;
    });

    hooks.afterEach(function () {
        this.runtime.registerRuntimeEngines = this.originalRegister;
    });

    test('it registers the prepared runtime engines with the instance', function (assert) {
        const appInstance = { name: 'instance' };
        let registeredWith;
        this.runtime.registerRuntimeEngines = (instance) => (registeredWith = instance);

        initialize(appInstance);

        assert.strictEqual(registeredWith, appInstance);
    });

    test('a failure is logged rather than stopping boot', function (assert) {
        const errors = [];
        const originalError = console.error;
        console.error = (...args) => errors.push(args[0]);
        this.runtime.registerRuntimeEngines = () => {
            throw new Error('no asset loader');
        };

        try {
            initialize({});
        } finally {
            console.error = originalError;
        }

        assert.deepEqual(errors, ['[Runtime Engines] Failed to register runtime engines:']);
    });
});
