import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import { format } from 'date-fns';

module('Unit | Model | chat-channel', function (hooks) {
    setupTest(hooks);

    test('toJSON emits company_uuid, name and meta', function (assert) {
        const store = this.owner.lookup('service:store');
        const json = store.createRecord('chat-channel', { name: 'General', company_uuid: 'c1' }).toJSON();

        assert.strictEqual(json.name, 'General');
        assert.strictEqual(json.company_uuid, 'c1');
        assert.deepEqual(Object.keys(json).sort(), ['company_uuid', 'meta', 'name']);
    });

    test('existsInFeed matches on type and record id', function (assert) {
        const store = this.owner.lookup('service:store');
        const channel = store.createRecord('chat-channel', { name: 'General' });
        channel.feed = [{ type: 'message', record: { id: 'm1' } }];

        assert.true(channel.existsInFeed('message', { id: 'm1' }));
        assert.false(channel.existsInFeed('message', { id: 'm2' }), 'different id does not match');
        assert.false(channel.existsInFeed('log', { id: 'm1' }), 'different type does not match');
        assert.true(channel.doesntExistsInFeed('log', { id: 'm1' }));
    });
});

module('Unit | Model | chat-channel | behaviour', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.store = this.owner.lookup('service:store');
    });

    test('the timestamp getters format valid dates and withhold invalid ones', function (assert) {
        const channel = this.store.createRecord('chat-channel', {
            created_at: new Date('2026-01-15T10:30:00Z'),
            updated_at: new Date('2026-02-20T08:05:00Z'),
        });

        assert.strictEqual(channel.createdAt, format(new Date('2026-01-15T10:30:00Z'), 'PP HH:mm'));
        assert.strictEqual(channel.updatedAt, format(new Date('2026-02-20T08:05:00Z'), 'PP HH:mm'));
        assert.ok(channel.createdAgo.length > 0);
        assert.ok(channel.updatedAgo.length > 0);

        const undated = this.store.createRecord('chat-channel');
        assert.strictEqual(undated.createdAt, null, 'an unset created_at yields null rather than throwing');
        assert.strictEqual(undated.updatedAt, null);
        assert.strictEqual(undated.createdAgo, null);
        assert.strictEqual(undated.updatedAgo, null);
    });

    test('toJSON emits only the fields the API accepts', function (assert) {
        const channel = this.store.createRecord('chat-channel', {
            company_uuid: 'co_1',
            name: 'Dispatch',
            meta: { pinned: true },
            title: 'ignored',
        });

        assert.deepEqual(channel.toJSON(), { company_uuid: 'co_1', name: 'Dispatch', meta: { pinned: true } });
    });

    test('existsInFeed and doesntExistsInFeed match on both type and record id', function (assert) {
        const channel = this.store.createRecord('chat-channel');
        channel.feed = [
            { type: 'message', record: { id: 'm_1' } },
            { type: 'log', record: { id: 'l_1' } },
        ];

        assert.true(channel.existsInFeed('message', { id: 'm_1' }));
        assert.false(channel.existsInFeed('message', { id: 'm_2' }), 'a different id does not match');
        assert.false(channel.existsInFeed('log', { id: 'm_1' }), 'a different type does not match either');

        assert.false(channel.doesntExistsInFeed('message', { id: 'm_1' }));
        assert.true(channel.doesntExistsInFeed('message', { id: 'm_2' }));
    });

    test('reloadParticipants queries by channel and stores the result', async function (assert) {
        const channel = this.store.push({ data: { id: 'ch_1', type: 'chat-channel' } });
        // participants is a hasMany, so it will only accept real records.
        const participants = [this.store.push({ data: { id: 'p_1', type: 'chat-participant' } })];
        const queries = [];

        this.store.query = (type, params) => {
            queries.push({ type, params });
            return Promise.resolve(participants);
        };

        const result = await channel.reloadParticipants();

        assert.deepEqual(queries, [{ type: 'chat-participant', params: { chat_channel_uuid: 'ch_1' } }]);
        assert.strictEqual(result, participants, 'the participants are handed back');
        assert.deepEqual(
            channel.participants.map((participant) => participant.id),
            ['p_1'],
            'and stored on the channel'
        );
    });
});
