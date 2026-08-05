import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Model | permission', function (hooks) {
    setupTest(hooks);

    test('toJSON emits the persisted attributes', function (assert) {
        const store = this.owner.lookup('service:store');
        const json = store.createRecord('permission', { name: 'fleet-ops view driver', guard_name: 'sanctum', service: 'fleet-ops' }).toJSON();

        assert.strictEqual(json.name, 'fleet-ops view driver');
        assert.strictEqual(json.guard_name, 'sanctum');
        assert.strictEqual(json.service, 'fleet-ops');
        assert.deepEqual(Object.keys(json).sort(), ['created_at', 'guard_name', 'name', 'service', 'updated_at']);
    });
});
