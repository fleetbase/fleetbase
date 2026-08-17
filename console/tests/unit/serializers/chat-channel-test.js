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

module('Unit | Serializer | chat-channel | feed', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.store = this.owner.lookup('service:store');
        this.serializer = this.store.serializerFor('chat-channel');
    });

    test('serialize sends only the fields the API accepts', function (assert) {
        const channel = this.store.createRecord('chat-channel', { name: 'Dispatch', meta: { pinned: true }, title: 'ignored' });

        const json = channel.serialize();

        assert.deepEqual(json, { name: 'Dispatch', meta: { pinned: true } });
    });

    test('serializeItem materialises each feed entry into its own record type', function (assert) {
        const message = this.serializer.serializeItem({ type: 'message', created_at: '2026-01-01', data: { uuid: 'm_1' } });
        const log = this.serializer.serializeItem({ type: 'log', created_at: '2026-01-02', data: { uuid: 'l_1' } });
        const attachment = this.serializer.serializeItem({ type: 'attachment', created_at: '2026-01-03', data: { uuid: 'a_1' } });

        assert.strictEqual(message.record.constructor.modelName, 'chat-message');
        assert.strictEqual(message.record.id, 'm_1');
        assert.strictEqual(log.record.constructor.modelName, 'chat-log');
        assert.strictEqual(attachment.record.constructor.modelName, 'chat-attachment');
        assert.strictEqual(message.type, 'message', 'the rest of the entry is preserved');
    });

    test('an unrecognised feed entry type is dropped', function (assert) {
        assert.strictEqual(this.serializer.serializeItem({ type: 'not-a-type', data: {} }), null);
    });

    test('serializeFeed orders the entries oldest first', function (assert) {
        const feed = this.serializer.serializeFeed([
            { type: 'message', created_at: '2026-03-01', data: { uuid: 'm_2' } },
            { type: 'message', created_at: '2026-01-01', data: { uuid: 'm_1' } },
            { type: 'log', created_at: '2026-02-01', data: { uuid: 'l_1' } },
        ]);

        assert.deepEqual(
            feed.map((entry) => entry.record.id),
            ['m_1', 'l_1', 'm_2']
        );
    });

    test('serializeFeed with no entries yields an empty feed', function (assert) {
        assert.deepEqual(this.serializer.serializeFeed(), []);
    });

    test('normalize converts an incoming feed and leaves other payloads alone', function (assert) {
        const withFeed = this.serializer.normalize(this.store.modelFor('chat-channel'), {
            uuid: 'ch_1',
            name: 'Dispatch',
            feed: [{ type: 'message', created_at: '2026-01-01', data: { uuid: 'm_1' } }],
        });

        assert.strictEqual(withFeed.data.attributes.feed.length, 1);
        assert.strictEqual(withFeed.data.attributes.feed[0].record.id, 'm_1', 'the raw entry became a record');

        const withoutFeed = this.serializer.normalize(this.store.modelFor('chat-channel'), { uuid: 'ch_2', name: 'Ops' });
        assert.strictEqual(withoutFeed.data.id, 'ch_2', 'a payload with no feed normalizes normally');
    });
});
