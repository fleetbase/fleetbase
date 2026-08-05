import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Serializer | permission', function (hooks) {
    setupTest(hooks);

    test('uses id as the primary key', function (assert) {
        assert.strictEqual(this.owner.lookup('serializer:permission').primaryKey, 'id');
    });

    test('serialize keeps scalar attributes', function (assert) {
        const store = this.owner.lookup('service:store');
        const json = store.createRecord('permission', { name: 'fleet-ops view driver', service: 'fleet-ops' }).serialize();

        assert.strictEqual(json.name, 'fleet-ops view driver');
        assert.strictEqual(json.service, 'fleet-ops');
    });
});
