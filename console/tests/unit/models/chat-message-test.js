import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import { format, formatDistanceToNow } from 'date-fns';

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

module('Unit | Model | chat-message | timestamps', function (hooks) {
    setupTest(hooks);

    test('the timestamp getters format both dates and read as suffixed durations', function (assert) {
        const created = new Date('2026-01-15T10:30:00Z');
        const updated = new Date('2026-02-20T08:05:00Z');
        const message = this.owner.lookup('service:store').createRecord('chat-message', { created_at: created, updated_at: updated });

        assert.strictEqual(message.createdAt, format(created, 'PP HH:mm'));
        assert.strictEqual(message.updatedAt, format(updated, 'PP HH:mm'));
        assert.strictEqual(message.createdAgo, formatDistanceToNow(created, { addSuffix: true }));
        assert.strictEqual(message.updatedAgo, formatDistanceToNow(updated, { addSuffix: true }));
    });
});
