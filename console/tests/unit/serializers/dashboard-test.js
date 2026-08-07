import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Serializer | dashboard', function (hooks) {
    setupTest(hooks);

    test('serialize suppresses the widgets hasMany and keeps attributes', function (assert) {
        const store = this.owner.lookup('service:store');
        const record = store.createRecord('dashboard', { name: 'Ops' });

        const json = record.serialize();

        assert.strictEqual(json.name, 'Ops');
        assert.notOk('widgets' in json, 'widgets is suppressed');
    });
});
