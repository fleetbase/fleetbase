import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Model | chat-message', function (hooks) {
    setupTest(hooks);

    test('hasReadReceipt detects a receipt for the given participant', function (assert) {
        const store = this.owner.lookup('service:store');
        const participant = store.push({ data: { id: 'p1', type: 'chat-participant' } });
        const receipt = store.push({ data: { id: 'r1', type: 'chat-receipt', attributes: { participant_uuid: 'p1' } } });
        const msg = store.createRecord('chat-message', { receipts: [receipt] });

        assert.true(msg.hasReadReceipt(participant));
        assert.false(msg.doesntHaveReadReceipt(participant));

        const other = store.push({ data: { id: 'p2', type: 'chat-participant' } });
        assert.false(msg.hasReadReceipt(other), 'no receipt for a different participant');
        assert.notOk(msg.hasReadReceipt(null), 'guards against a missing participant');
    });

    test('the date getters return null for an invalid date', function (assert) {
        const store = this.owner.lookup('service:store');
        const msg = store.createRecord('chat-message', {});

        assert.strictEqual(msg.updatedAgo, null);
        assert.strictEqual(msg.updatedAt, null);
        assert.strictEqual(msg.createdAgo, null);
        assert.strictEqual(msg.createdAt, null);
    });
});
