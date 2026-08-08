import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Serializer | company', function (hooks) {
    setupTest(hooks);

    test('serialize keeps scalar attributes', function (assert) {
        const store = this.owner.lookup('service:store');
        const json = store.createRecord('company', { name: 'Acme', type: 'corporation' }).serialize();

        assert.strictEqual(json.name, 'Acme');
        assert.strictEqual(json.type, 'corporation');
    });
});
