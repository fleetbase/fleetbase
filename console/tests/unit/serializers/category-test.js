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

module('Unit | Serializer | category | relationship pruning', function (hooks) {
    setupTest(hooks);

    test('the parent and subcategories relationships are never sent back', function (assert) {
        const store = this.owner.lookup('service:store');
        const serializer = store.serializerFor('category');
        const json = {};

        assert.strictEqual(serializer.serializeBelongsTo({}, json, { key: 'parent' }), undefined, 'parent is skipped');
        assert.strictEqual(serializer.serializeHasMany({}, json, { key: 'subcategories' }), undefined, 'subcategories are skipped');
        assert.deepEqual(json, {}, 'neither wrote anything into the payload');
    });

    test('other relationships still serialize', function (assert) {
        const store = this.owner.lookup('service:store');
        const category = store.createRecord('category', { name: 'Parcels' });

        const json = category.serialize();

        assert.strictEqual(json.name, 'Parcels');
        assert.notOk(json.subcategories, 'the pruned relationships are absent');
    });
});
