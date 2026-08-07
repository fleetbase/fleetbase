import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Serializer | alert', function (hooks) {
    setupTest(hooks);

    test('serialize keeps scalar attributes', function (assert) {
        const store = this.owner.lookup('service:store');
        const json = store.createRecord('alert', { type: 'threshold', message: 'CPU high' }).serialize();

        assert.strictEqual(json.type, 'threshold');
        assert.strictEqual(json.message, 'CPU high');
    });
});
