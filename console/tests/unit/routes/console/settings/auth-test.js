import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Route | console/settings/auth', function (hooks) {
    setupTest(hooks);

    test('it exists', function (assert) {
        let route = this.owner.lookup('route:console/settings/auth');
        assert.ok(route);
    });

    test('entering the route loads authentication settings once per entry', function (assert) {
        const route = this.owner.lookup('route:console/settings/auth');
        let loads = 0;
        const controller = { load: () => loads++ };

        route.setupController(controller, undefined);
        assert.strictEqual(loads, 1);

        route.setupController(controller, undefined);
        assert.strictEqual(loads, 2, 'reentering refreshes the organization policy');
    });
});
