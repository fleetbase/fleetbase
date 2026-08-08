import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Serializer | report', function (hooks) {
    setupTest(hooks);

    test('serialize keeps scalar attributes', function (assert) {
        const store = this.owner.lookup('service:store');
        const json = store.createRecord('report', { title: 'Weekly Orders', type: 'sql' }).serialize();

        assert.strictEqual(json.title, 'Weekly Orders');
        assert.strictEqual(json.type, 'sql');
    });
});
