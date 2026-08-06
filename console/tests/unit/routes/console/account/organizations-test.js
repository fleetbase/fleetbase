import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Route | console/account/organizations', function (hooks) {
    setupTest(hooks);

    test('model loads the current user organizations', async function (assert) {
        const route = this.owner.lookup('route:console/account/organizations');

        Object.defineProperty(route.currentUser, 'loadOrganizations', {
            configurable: true,
            value: () => Promise.resolve(['acme', 'globex']),
        });

        assert.deepEqual(await route.model(), ['acme', 'globex']);
    });
});
