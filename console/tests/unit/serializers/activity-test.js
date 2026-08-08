import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Serializer | activity', function (hooks) {
    setupTest(hooks);

    test('serialize keeps scalar attributes', function (assert) {
        const store = this.owner.lookup('service:store');
        const json = store.createRecord('activity', { log_name: 'created', description: 'a thing happened' }).serialize();

        assert.strictEqual(json.log_name, 'created');
        assert.strictEqual(json.description, 'a thing happened');
    });
});
