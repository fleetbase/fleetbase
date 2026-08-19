import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Model | group', function (hooks) {
    setupTest(hooks);

    // Replace this with your real tests.
    test('it exists', function (assert) {
        let store = this.owner.lookup('service:store');
        let model = store.createRecord('group', {});
        assert.ok(model);
    });
});

module('Unit | Model | group | members', function (hooks) {
    setupTest(hooks);

    test('membersList names every user in the group', function (assert) {
        const store = this.owner.lookup('service:store');
        const group = store.createRecord('group', { name: 'Dispatchers' });

        assert.deepEqual(group.membersList, [], 'an empty group has no members');

        group.users.pushObject(store.createRecord('user', { name: 'Ron' }));
        group.users.pushObject(store.createRecord('user', { name: 'Sam' }));

        assert.deepEqual(group.membersList, ['Ron', 'Sam']);
    });
});
