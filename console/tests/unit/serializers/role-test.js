import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Serializer | role', function (hooks) {
    setupTest(hooks);

    test('uses id as the primary key', function (assert) {
        assert.strictEqual(this.owner.lookup('serializer:role').primaryKey, 'id');
    });

    test('serialize keeps attributes and emits policies/permissions as id arrays', function (assert) {
        const store = this.owner.lookup('service:store');
        const policy = store.push({ data: { id: 'pol1', type: 'policy' } });
        const permission = store.push({ data: { id: 'perm1', type: 'permission' } });
        const json = store.createRecord('role', { name: 'Administrator', policies: [policy], permissions: [permission] }).serialize();

        assert.strictEqual(json.name, 'Administrator');
        assert.deepEqual(json.policies, ['pol1'], 'policies serialized as ids');
        assert.deepEqual(json.permissions, ['perm1'], 'permissions serialized as ids');
    });
});
