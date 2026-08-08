import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Model | chat-participant', function (hooks) {
    setupTest(hooks);

    test('the date getters format valid timestamps', function (assert) {
        const at = new Date('2026-05-06T14:30:00Z');
        const participant = this.owner.lookup('service:store').createRecord('chat-participant', { created_at: at, updated_at: at, last_seen_at: at });

        assert.strictEqual(typeof participant.createdAt, 'string');
        assert.strictEqual(typeof participant.updatedAt, 'string');
        assert.strictEqual(typeof participant.lastSeenAt, 'string');
        assert.strictEqual(typeof participant.createdAgo, 'string');
        assert.strictEqual(typeof participant.updatedAgo, 'string');
        assert.strictEqual(typeof participant.lastSeenAgo, 'string');
    });

    test('the date getters return null for missing timestamps', function (assert) {
        const participant = this.owner.lookup('service:store').createRecord('chat-participant', {});

        assert.strictEqual(participant.createdAt, null);
        assert.strictEqual(participant.createdAgo, null);
        assert.strictEqual(participant.updatedAt, null);
        assert.strictEqual(participant.updatedAgo, null);
        assert.strictEqual(participant.lastSeenAt, null, 'a participant who has never been seen has no timestamp');
        assert.strictEqual(participant.lastSeenAgo, null);
    });
});
