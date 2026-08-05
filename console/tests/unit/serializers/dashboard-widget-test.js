import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Serializer | dashboard-widget', function (hooks) {
    setupTest(hooks);

    test('serialize keeps scalar attributes', function (assert) {
        const store = this.owner.lookup('service:store');
        const json = store.createRecord('dashboard-widget', { name: 'Orders', component: 'widget/orders' }).serialize();

        assert.strictEqual(json.name, 'Orders');
        assert.strictEqual(json.component, 'widget/orders');
    });
});
