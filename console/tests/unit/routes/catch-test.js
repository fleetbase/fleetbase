import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Route | catch', function (hooks) {
    setupTest(hooks);

    test('beforeModel sends unmatched URLs to the login route', function (assert) {
        const route = this.owner.lookup('route:catch');

        let transitionedTo;
        Object.defineProperty(route.router, 'transitionTo', {
            configurable: true,
            value: (routeName) => {
                transitionedTo = routeName;
                return 'login-transition';
            },
        });

        assert.strictEqual(route.beforeModel(), 'login-transition');
        assert.strictEqual(transitionedTo, 'auth.login');
    });
});
