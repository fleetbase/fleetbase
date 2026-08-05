import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Model | user', function (hooks) {
    setupTest(hooks);

    test('isAdmin is true only when is_admin is strictly true', function (assert) {
        const store = this.owner.lookup('service:store');

        assert.true(store.createRecord('user', { is_admin: true }).isAdmin);
        assert.false(store.createRecord('user', { is_admin: false }).isAdmin);
        assert.false(store.createRecord('user', {}).isAdmin, 'unset is not admin');
    });

    test('isEmailVerified reflects a valid email_verified_at timestamp', function (assert) {
        const store = this.owner.lookup('service:store');

        assert.notOk(store.createRecord('user', {}).isEmailVerified, 'unverified when unset');
        assert.ok(store.createRecord('user', { email_verified_at: '2024-01-01T00:00:00Z' }).isEmailVerified);
    });
});
