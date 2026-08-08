import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Serializer | category', function (hooks) {
    setupTest(hooks);

    test('serialize suppresses the parent belongsTo and subcategories hasMany', function (assert) {
        const store = this.owner.lookup('service:store');
        const record = store.createRecord('category', { name: 'Boxes' });

        const json = record.serialize();

        assert.strictEqual(json.name, 'Boxes');
        assert.notOk('parent' in json, 'parent is suppressed');
        assert.notOk('subcategories' in json, 'subcategories is suppressed');
    });
});
