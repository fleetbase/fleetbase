import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Model | chat-receipt', function (hooks) {
    setupTest(hooks);

    test('the date getters format valid timestamps', function (assert) {
        const at = new Date('2026-05-06T14:30:00Z');
        const receipt = this.owner.lookup('service:store').createRecord('chat-receipt', { created_at: at, updated_at: at, read_at: at });

        assert.strictEqual(typeof receipt.createdAt, 'string');
        assert.strictEqual(typeof receipt.updatedAt, 'string');
        assert.strictEqual(typeof receipt.readAt, 'string');
        assert.ok(receipt.createdAgo.includes('ago'), 'relative times carry a suffix');
        assert.ok(receipt.updatedAgo.includes('ago'));
        assert.ok(receipt.readAgo.includes('ago'));
    });

    test('the date getters return null for missing timestamps', function (assert) {
        const receipt = this.owner.lookup('service:store').createRecord('chat-receipt', {});

        assert.strictEqual(receipt.createdAt, null);
        assert.strictEqual(receipt.createdAgo, null);
        assert.strictEqual(receipt.updatedAt, null);
        assert.strictEqual(receipt.updatedAgo, null);
        assert.strictEqual(receipt.readAt, null, 'an unread receipt has no read timestamp');
        assert.strictEqual(receipt.readAgo, null);
    });
});
