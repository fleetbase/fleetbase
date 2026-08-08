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
