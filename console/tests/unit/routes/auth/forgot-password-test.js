import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Route | auth/forgot-password', function (hooks) {
    setupTest(hooks);

    test('the email query param does not refresh the model', function (assert) {
        const route = this.owner.lookup('route:auth/forgot-password');

        assert.deepEqual(Object.keys(route.queryParams), ['email']);
        assert.false(route.queryParams.email.refreshModel);
    });
});
