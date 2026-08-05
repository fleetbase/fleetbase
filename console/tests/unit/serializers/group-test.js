import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Serializer | group', function (hooks) {
    setupTest(hooks);

    test('serialize emits users/permissions/policies as id arrays', function (assert) {
        const store = this.owner.lookup('service:store');
        const user = store.push({ data: { id: 'u1', type: 'user' } });
        const permission = store.push({ data: { id: 'perm1', type: 'permission' } });
        const policy = store.push({ data: { id: 'pol1', type: 'policy' } });
        const record = store.createRecord('group', { name: 'Admins', users: [user], permissions: [permission], policies: [policy] });

        const json = record.serialize();

        assert.strictEqual(json.name, 'Admins');
        assert.deepEqual(json.users, ['u1'], 'users serialized as ids');
        assert.deepEqual(json.permissions, ['perm1'], 'permissions serialized as ids');
        assert.deepEqual(json.policies, ['pol1'], 'policies serialized as ids');
    });
});
