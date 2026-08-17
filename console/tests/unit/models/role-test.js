import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Model | role', function (hooks) {
    setupTest(hooks);

    test('toJSON serializes the record via its serializer', function (assert) {
        const store = this.owner.lookup('service:store');
        const json = store.createRecord('role', { name: 'Administrator' }).toJSON();

        assert.strictEqual(json.name, 'Administrator');
    });
});

module('Unit | Model | role | permissions', function (hooks) {
    setupTest(hooks);

    test('toJSON serializes the record and permissionsArray materialises the relationship', function (assert) {
        const store = this.owner.lookup('service:store');
        const role = store.createRecord('role', { name: 'Dispatcher' });

        const json = role.toJSON();
        assert.strictEqual(typeof json, 'object', 'a plain object is produced');
        assert.deepEqual(role.permissionsArray, [], 'a role with no permissions yields an empty array');

        const permission = store.createRecord('permission', { name: 'orders.view' });
        role.permissions.pushObject(permission);

        assert.deepEqual(role.permissionsArray, [permission], 'attached permissions are listed');
    });
});
