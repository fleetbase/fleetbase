import { module, test } from 'qunit';

import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Model | custom field', function (hooks) {
    setupTest(hooks);

    // Replace this with your real tests.
    test('it exists', function (assert) {
        let store = this.owner.lookup('service:store');
        let model = store.createRecord('custom-field', {});
        assert.ok(model);
    });
});

module('Unit | Model | custom-field | valueType', function (hooks) {
    setupTest(hooks);

    test('each input type maps to the kind of value it stores', function (assert) {
        const store = this.owner.lookup('service:store');
        const field = (type) => store.createRecord('custom-field', { type }).valueType;

        assert.strictEqual(field('file-upload'), 'file');
        assert.strictEqual(field('date-time-input'), 'date');
        assert.strictEqual(field('model-select'), 'model');
        assert.strictEqual(field('text-input'), 'text', 'anything else stores plain text');
        assert.strictEqual(field(undefined), 'text', 'so does an unset type');
    });
});
