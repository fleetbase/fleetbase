import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Model | chat-log', function (hooks) {
    setupTest(hooks);

    test('the date getters format valid timestamps', function (assert) {
        const at = new Date('2026-05-06T14:30:00Z');
        const log = this.owner.lookup('service:store').createRecord('chat-log', { created_at: at, updated_at: at });

        assert.strictEqual(typeof log.createdAt, 'string');
        assert.strictEqual(typeof log.updatedAt, 'string');
        assert.ok(log.createdAgo.includes('ago'), 'relative times carry a suffix');
        assert.ok(log.updatedAgo.includes('ago'));
    });

    test('the date getters return null for missing timestamps', function (assert) {
        const log = this.owner.lookup('service:store').createRecord('chat-log', {});

        assert.strictEqual(log.createdAt, null);
        assert.strictEqual(log.createdAgo, null);
        assert.strictEqual(log.updatedAt, null);
        assert.strictEqual(log.updatedAgo, null);
    });

    test('it keeps its event attributes', function (assert) {
        const log = this.owner.lookup('service:store').createRecord('chat-log', {
            event_type: 'participant_added',
            content: 'Ron joined',
            status: 'ok',
        });

        assert.strictEqual(log.event_type, 'participant_added');
        assert.strictEqual(log.content, 'Ron joined');
        assert.strictEqual(log.status, 'ok');
    });
});
