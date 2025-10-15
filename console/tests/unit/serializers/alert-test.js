import { module, test } from 'qunit';

import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Serializer | alert', function (hooks) {
    setupTest(hooks);

    // Replace this with your real tests.
    test('it exists', function (assert) {
        let store = this.owner.lookup('service:store');
        let serializer = store.serializerFor('alert');

        assert.ok(serializer);
    });

    test('it serializes records', function (assert) {
        let store = this.owner.lookup('service:store');
        let record = store.createRecord('alert', {});

        let serializedRecord = record.serialize();

        assert.ok(serializedRecord);
    });
});
