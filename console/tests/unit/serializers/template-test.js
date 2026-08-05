import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Serializer | template', function (hooks) {
    setupTest(hooks);

    test('serialize embeds the queries hasMany inline and keeps attributes', function (assert) {
        const store = this.owner.lookup('service:store');
        const record = store.createRecord('template', { name: 'Invoice' });

        const json = record.serialize();

        assert.strictEqual(json.name, 'Invoice');
        assert.deepEqual(json.queries, [], 'queries embedded as an inline array');
    });
});
