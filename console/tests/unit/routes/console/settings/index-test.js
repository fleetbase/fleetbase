import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Route | console/settings/index', function (hooks) {
    setupTest(hooks);

    test('model loads the current user company', async function (assert) {
        const route = this.owner.lookup('route:console/settings/index');

        // companyId is @alias('userSnapshot.company_uuid') — set the backing property.
        route.currentUser.userSnapshot = { company_uuid: 'company_1' };
        route.store.findRecord = (type, id) => Promise.resolve(`${type}:${id}`);

        assert.strictEqual(await route.model(), 'company:company_1');
    });
});
