import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Route | invite/for-user', function (hooks) {
    setupTest(hooks);

    test('model loads the brand record', async function (assert) {
        const route = this.owner.lookup('route:invite/for-user');
        route.store.findRecord = (type, id) => Promise.resolve(`${type}:${id}`);

        assert.strictEqual(await route.model(), 'brand:1');
    });
});
