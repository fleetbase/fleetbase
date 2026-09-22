import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Route | console/admin/two-fa-settings', function (hooks) {
    setupTest(hooks);

    test('it exists', function (assert) {
        let route = this.owner.lookup('route:console/admin/two-fa-settings');
        assert.ok(route);
    });

    test('entering the route loads its settings', function (assert) {
        const route = this.owner.lookup('route:console/admin/two-fa-settings');
        let loads = 0;

        route.setupController({ load: () => loads++ }, undefined);

        assert.strictEqual(loads, 1);
    });
});
