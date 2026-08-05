import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Serializer | chat-message', function (hooks) {
    setupTest(hooks);

    test('serialize keeps content and embeds the hasMany relationships as arrays', function (assert) {
        const store = this.owner.lookup('service:store');
        const json = store.createRecord('chat-message', { content: 'hello' }).serialize();

        assert.strictEqual(json.content, 'hello');
        assert.deepEqual(json.attachments, [], 'attachments embedded as an array');
        assert.deepEqual(json.receipts, [], 'receipts embedded as an array');
    });
});
