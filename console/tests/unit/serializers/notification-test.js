import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Serializer | notification', function (hooks) {
    setupTest(hooks);

    test('uses id as the primary key', function (assert) {
        assert.strictEqual(this.owner.lookup('serializer:notification').primaryKey, 'id');
    });

    test('serialize keeps scalar attributes', function (assert) {
        const store = this.owner.lookup('service:store');
        const json = store.createRecord('notification', { type: 'App\\Notifications\\Welcome' }).serialize();

        assert.strictEqual(json.type, 'App\\Notifications\\Welcome');
    });
});
