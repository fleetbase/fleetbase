import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Model | category', function (hooks) {
    setupTest(hooks);

    // Replace this with your real tests.
    test('it exists', function (assert) {
        let store = this.owner.lookup('service:store');
        let model = store.createRecord('category', {});
        assert.ok(model);
    });
});

module('Unit | Model | category | customerId', function (hooks) {
    setupTest(hooks);

    test('customerId rewrites a contact public id as a customer one', function (assert) {
        const store = this.owner.lookup('service:store');

        assert.strictEqual(store.createRecord('category', { public_id: 'contact_abc123' }).customerId, 'customer_abc123');
        assert.strictEqual(store.createRecord('category', { public_id: 'category_xyz' }).customerId, 'category_xyz', 'ids that are not contacts are left alone');
    });
});

module('Unit | Model | category | editing state', function (hooks) {
    setupTest(hooks);

    test('a category starts with no custom fields and not in edit mode', function (assert) {
        const category = this.owner.lookup('service:store').createRecord('category');

        assert.deepEqual(category.customFields, [], 'no custom fields are attached yet');
        assert.false(category.isEditing, 'and it is not being edited');
        assert.strictEqual(category.parent_category, undefined, 'nor nested under a parent');
    });
});
