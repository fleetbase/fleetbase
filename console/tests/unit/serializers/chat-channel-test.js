import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Serializer | chat-channel', function (hooks) {
    setupTest(hooks);

    test('serialize emits only name and meta', function (assert) {
        const store = this.owner.lookup('service:store');
        const json = store.createRecord('chat-channel', { name: 'General', title: 'ignored' }).serialize();

        assert.strictEqual(json.name, 'General');
        assert.notOk('title' in json, 'custom serialize omits other attributes');
    });
});
