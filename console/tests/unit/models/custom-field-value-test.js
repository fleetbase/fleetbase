import { module, test } from 'qunit';

import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

module('Unit | Model | custom field value', function (hooks) {
    setupTest(hooks);

    // Replace this with your real tests.
    test('it exists', function (assert) {
        let store = this.owner.lookup('service:store');
        let model = store.createRecord('custom-field-value', {});
        assert.ok(model);
    });
});

module('Unit | Model | custom-field-value | asFile', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.converted = [];
        const context = this;

        class FetchStub extends Service {
            jsonToModel(json, modelName) {
                context.converted.push({ json, modelName });
                return { id: 'file_1', modelName };
            }
        }
        this.owner.register('service:fetch', FetchStub);
        this.store = this.owner.lookup('service:store');
    });

    test('a JSON object value is converted into a file model', function (assert) {
        const value = '{"uuid":"file_1","original_filename":"invoice.pdf"}';
        const record = this.store.createRecord('custom-field-value', { value });

        assert.deepEqual(record.asFile, { id: 'file_1', modelName: 'file' });
        assert.deepEqual(this.converted, [{ json: value, modelName: 'file' }]);
    });

    test('a value that is not a JSON object is not treated as a file', function (assert) {
        const store = this.store;

        assert.strictEqual(store.createRecord('custom-field-value', { value: 'just text' }).asFile, null);
        assert.strictEqual(store.createRecord('custom-field-value', { value: '[1,2]' }).asFile, null, 'an array is not a file object');
        assert.strictEqual(store.createRecord('custom-field-value').asFile, null, 'neither is an unset value');
        assert.deepEqual(this.converted, [], 'the fetch service is never asked to convert');
    });
});
