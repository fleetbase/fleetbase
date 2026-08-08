import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

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
