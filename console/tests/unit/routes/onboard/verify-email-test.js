import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Route | onboard/verify-email', function (hooks) {
    setupTest(hooks);

    test('neither query param refreshes the model', function (assert) {
        const route = this.owner.lookup('route:onboard/verify-email');

        assert.deepEqual(Object.keys(route.queryParams), ['code', 'hello']);
        Object.entries(route.queryParams).forEach(([key, options]) => {
            assert.false(options.refreshModel, `${key} does not refresh the model`);
        });
    });
});
