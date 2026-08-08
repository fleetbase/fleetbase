import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Serializer | policy', function (hooks) {
    setupTest(hooks);

    test('uses id as the primary key', function (assert) {
        assert.strictEqual(this.owner.lookup('serializer:policy').primaryKey, 'id');
    });

    test('serialize keeps attributes and emits permissions as an id array', function (assert) {
        const store = this.owner.lookup('service:store');
        const permission = store.push({ data: { id: 'perm1', type: 'permission' } });
        const json = store.createRecord('policy', { name: 'Dispatcher', service: 'fleet-ops', permissions: [permission] }).serialize();

        assert.strictEqual(json.name, 'Dispatcher');
        assert.deepEqual(json.permissions, ['perm1'], 'permissions serialized as ids');
    });
});
