import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Route | console/admin/branding', function (hooks) {
    setupTest(hooks);

    test('model loads the brand record', async function (assert) {
        const route = this.owner.lookup('route:console/admin/branding');
        route.store.findRecord = (type, id) => Promise.resolve(`${type}:${id}`);

        assert.strictEqual(await route.model(), 'brand:1');
    });
});
