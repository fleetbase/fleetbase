import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Serializer | user', function (hooks) {
    setupTest(hooks);

    test('serialize strips the password and keeps other attributes', function (assert) {
        const store = this.owner.lookup('service:store');
        const record = store.createRecord('user', { name: 'Ron', email: 'ron@fleetbase.io', password: 'secret' });

        const json = record.serialize();

        assert.notOk('password' in json, 'password is never sent');
        assert.strictEqual(json.name, 'Ron');
        assert.strictEqual(json.email, 'ron@fleetbase.io');
    });

    test('serialize removes server-managed timestamp keys', function (assert) {
        const store = this.owner.lookup('service:store');
        const json = store.createRecord('user', {}).serialize();

        ['created_at', 'updated_at', 'deleted_at', 'email_verified_at', 'phone_verified_at'].forEach((key) => {
            assert.notOk(key in json, `${key} is not serialized`);
        });
    });
});
