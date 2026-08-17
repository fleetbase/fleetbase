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

/**
 * Each of these serializers withholds exactly one self-referential relationship so the API
 * never receives a nested tree it cannot accept. Every model here declares only that one
 * hasMany, so the "serialize it normally" arm is driven with another model's relationship —
 * the guard is on the key, not on the model.
 */
const WITHHELD = [
    { model: 'category', relationship: 'subcategories' },
    { model: 'comment', relationship: 'replies' },
    { model: 'dashboard', relationship: 'widgets' },
];

module('Unit | Serializer | withheld relationships', function (hooks) {
    setupTest(hooks);

    WITHHELD.forEach(({ model, relationship }) => {
        test(`${model} never serializes its ${relationship}`, function (assert) {
            const store = this.owner.lookup('service:store');
            const serializer = store.serializerFor(model);
            const record = store.createRecord(model, {});
            const json = { existing: 'untouched' };

            serializer.serializeHasMany(record._createSnapshot(), json, store.modelFor(model).relationshipsByName.get(relationship));

            assert.deepEqual(json, { existing: 'untouched' }, `${relationship} is left out of the payload entirely`);
        });
    });
});
