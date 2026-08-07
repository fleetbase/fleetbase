import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Model | dashboard', function (hooks) {
    setupTest(hooks);

    test('getRegistry delegates to the universe service for this dashboard id', function (assert) {
        // service:universe is a pre-resolved singleton and can't be swapped via owner.register,
        // so patch the method on the injected instance getRegistry actually calls.
        const universe = this.owner.lookup('service:universe');
        universe.getDashboardRegistry = (id) => ({ dashboardId: id });

        const store = this.owner.lookup('service:store');
        const dashboard = store.push({ data: { id: 'dash_1', type: 'dashboard' } });

        assert.deepEqual(dashboard.getRegistry(), { dashboardId: 'dash_1' });
    });
});
