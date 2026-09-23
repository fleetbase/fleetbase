import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Route | console/account/auth', function (hooks) {
    setupTest(hooks);

    test('it exists', function (assert) {
        let route = this.owner.lookup('route:console/account/auth');
        assert.ok(route);
    });

    test('entering the route loads its settings', function (assert) {
        const route = this.owner.lookup('route:console/account/auth');
        let loads = 0;

        route.setupController({ load: () => loads++ }, undefined);

        assert.strictEqual(loads, 1);
    });
});
