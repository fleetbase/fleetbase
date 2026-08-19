import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Model | policy', function (hooks) {
    setupTest(hooks);

    test('toJSON serializes the record via its serializer', function (assert) {
        const store = this.owner.lookup('service:store');
        const json = store.createRecord('policy', { name: 'Dispatcher' }).toJSON();

        assert.strictEqual(json.name, 'Dispatcher');
    });
});

module('Unit | Model | policy | permissions', function (hooks) {
    setupTest(hooks);

    test('toJSON serializes the record and permissionsArray materialises the relationship', function (assert) {
        const store = this.owner.lookup('service:store');
        const policy = store.createRecord('policy', { name: 'Dispatch policy' });

        assert.strictEqual(typeof policy.toJSON(), 'object');
        assert.deepEqual(policy.permissionsArray, []);

        const permission = store.createRecord('permission', { name: 'orders.view' });
        policy.permissions.pushObject(permission);

        assert.deepEqual(policy.permissionsArray, [permission]);
    });
});
