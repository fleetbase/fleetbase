import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Route | console/home', function (hooks) {
    setupTest(hooks);

    test('activate disables the sidebar and deactivate re-enables it', function (assert) {
        const route = this.owner.lookup('route:console/home');

        // Patch the injected sidebar instance rather than registering a stub — app-wide
        // singletons are already resolved by the time the route is looked up. enable/disable
        // are @action, which are exposed as getters, so shadow them with value properties.
        const calls = [];
        Object.defineProperty(route.sidebar, 'disable', { configurable: true, value: () => calls.push('disable') });
        Object.defineProperty(route.sidebar, 'enable', { configurable: true, value: () => calls.push('enable') });

        route.activate();
        route.deactivate();

        assert.deepEqual(calls, ['disable', 'enable']);
    });
});
