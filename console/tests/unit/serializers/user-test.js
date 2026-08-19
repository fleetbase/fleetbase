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

module('Unit | Serializer | user | payload hygiene', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.store = this.owner.lookup('service:store');
        this.serializer = this.store.serializerFor('user');
    });

    test('serialize never sends the password, verification flags or server timestamps', function (assert) {
        const user = this.store.createRecord('user', {
            name: 'Ron',
            email: 'ron@fleetbase.io',
            password: 'secret',
            email_verified_at: new Date(),
            phone_verified_at: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: new Date(),
        });

        const json = user.serialize();

        assert.strictEqual(json.name, 'Ron', 'the editable fields still go');
        for (const key of ['password', 'email_verified_at', 'phone_verified_at', 'created_at', 'updated_at', 'deleted_at']) {
            assert.notOk(key in json, `${key} is stripped`);
        }
    });

    test('a partial payload does not blank out fields on an already-loaded user', function (assert) {
        this.store.push({
            data: { id: 'user_1', type: 'user', attributes: { name: 'Ron', phone: '+15550001111', avatar_url: '/original.png' } },
        });

        const normalized = this.serializer.normalize(this.store.modelFor('user'), {
            uuid: 'user_1',
            name: 'Ron Richardson',
            phone: null,
            avatar_url: '/replaced.png',
        });

        assert.strictEqual(normalized.data.attributes.name, 'Ron Richardson', 'real values still apply');
        assert.notOk('phone' in normalized.data.attributes, 'a null does not wipe the loaded phone');
        assert.notOk('avatar_url' in normalized.data.attributes, 'the avatar is always left to the loaded record');
    });

    test('a payload for a user that is not loaded yet is applied in full', function (assert) {
        const normalized = this.serializer.normalize(this.store.modelFor('user'), {
            uuid: 'user_new',
            name: 'Sam',
            phone: null,
            avatar_url: '/avatar.png',
        });

        assert.strictEqual(normalized.data.attributes.name, 'Sam');
        assert.strictEqual(normalized.data.attributes.avatar_url, '/avatar.png', 'nothing to protect, so everything lands');
    });
});

module('Unit | Serializer | user | reloading an existing record', function (hooks) {
    setupTest(hooks);

    test('a payload with no attributes at all is left alone', function (assert) {
        const store = this.owner.lookup('service:store');
        store.push({ data: { id: 'u1', type: 'user', attributes: { name: 'Existing' } } });

        // A relationship-only payload normalizes to a resource with no attributes hash;
        // the merge guard has to cope with that rather than reading through undefined.
        const normalized = store.serializerFor('user').normalize(store.modelFor('user'), { uuid: 'u1' }, 'user');

        assert.strictEqual(normalized.data.id, 'u1');
        assert.strictEqual(store.peekRecord('user', 'u1').name, 'Existing', 'the loaded record keeps its name');
    });
});
