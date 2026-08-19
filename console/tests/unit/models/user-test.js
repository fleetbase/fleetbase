import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import { format, formatDistanceToNow } from 'date-fns';
import Service from '@ember/service';
import UserModel from '@fleetbase/console/models/user';

module('Unit | Model | user', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.calls = [];
        this.response = { email_verified_at: '2026-05-06T14:30:00Z' };
        const self = this;

        class FetchStub extends Service {
            patch(path) {
                self.calls.push({ method: 'patch', path });
                return Promise.resolve(self.response);
            }
            delete(path) {
                self.calls.push({ method: 'delete', path });
                return Promise.resolve({ ok: true });
            }
            post(path, payload) {
                self.calls.push({ method: 'post', path, payload });
                return Promise.resolve({ ok: true });
            }
        }
        this.owner.register('service:fetch', FetchStub);

        this.store = this.owner.lookup('service:store');
        this.user = (attrs = {}) => this.store.createRecord('user', attrs);
        this.savedUser = (attrs = {}) => this.store.push({ data: { id: 'user_1', type: 'user', attributes: attrs } });
    });

    test('isAdmin is true only when is_admin is strictly true', function (assert) {
        assert.true(this.user({ is_admin: true }).isAdmin);
        assert.false(this.user({ is_admin: false }).isAdmin);
        assert.false(this.user({}).isAdmin, 'unset is not admin');
    });

    test('isTwoFactorEnabled reads the meta flag', function (assert) {
        assert.notOk(this.user({}).isTwoFactorEnabled, 'no meta means not enabled');
        assert.notOk(this.user({ meta: {} }).isTwoFactorEnabled);
        assert.ok(this.user({ meta: { two_factor_enabled: true } }).isTwoFactorEnabled);
    });

    test('the verification getters reflect their timestamps', function (assert) {
        const unverified = this.user({});
        assert.notOk(unverified.isEmailVerified);
        assert.notOk(unverified.isPhoneVerified);
        assert.true(unverified.emailIsNotVerified, 'the negated alias tracks it');
        assert.true(unverified.phoneIsNotVerified);

        const verified = this.user({ email_verified_at: '2026-01-01T00:00:00Z', phone_verified_at: '2026-01-01T00:00:00Z' });
        assert.ok(verified.isEmailVerified);
        assert.ok(verified.isPhoneVerified);
        assert.false(verified.emailIsNotVerified);
        assert.false(verified.phoneIsNotVerified);
    });

    test('typesList joins the assigned types', function (assert) {
        assert.strictEqual(this.user({ types: ['admin', 'driver'] }).typesList, 'admin, driver');
        assert.strictEqual(this.user({ types: [] }).typesList, '');
    });

    test('lastLogin formats a real login and reads Never otherwise', function (assert) {
        assert.strictEqual(this.user({}).lastLogin, 'Never');
        assert.notStrictEqual(this.user({ last_login: new Date('2026-05-06T14:30:00Z') }).lastLogin, 'Never');
    });

    test('the timestamp getters fall back to a dash when unset', function (assert) {
        const empty = this.user({});
        assert.strictEqual(empty.createdAt, '-');
        assert.strictEqual(empty.createdAgo, '-');
        assert.strictEqual(empty.createdAtShort, '-');
        assert.strictEqual(empty.updatedAt, '-');
        assert.strictEqual(empty.updatedAgo, '-');
        assert.strictEqual(empty.updatedAtShort, '-');

        const at = new Date('2026-05-06T14:30:00Z');
        const filled = this.user({ created_at: at, updated_at: at });
        assert.ok(filled.createdAt.startsWith('2026-05-06'), filled.createdAt);
        assert.ok(filled.updatedAt.startsWith('2026-05-06'));
        assert.notStrictEqual(filled.createdAtShort, '-');
        assert.notStrictEqual(filled.updatedAgo, '-');
    });

    test('getPermissions collects direct, role and policy permissions', function (assert) {
        const store = this.store;
        const perm = (id) => store.push({ data: { id, type: 'permission', attributes: { name: id } } });

        // These must exist in the store for the relationships below to resolve, even
        // though the assertions reach them through the user rather than directly.
        const direct = perm('direct');
        perm('role-permission');
        perm('role-policy-permission');
        perm('policy-permission');

        const rolePolicy = store.push({
            data: { id: 'pol_role', type: 'policy', relationships: { permissions: { data: [{ id: 'role-policy-permission', type: 'permission' }] } } },
        });
        const role = store.push({
            data: {
                id: 'role_1',
                type: 'role',
                relationships: {
                    permissions: { data: [{ id: 'role-permission', type: 'permission' }] },
                    policies: { data: [{ id: 'pol_role', type: 'policy' }] },
                },
            },
        });
        const policy = store.push({
            data: { id: 'pol_1', type: 'policy', relationships: { permissions: { data: [{ id: 'policy-permission', type: 'permission' }] } } },
        });

        const user = this.user({ permissions: [direct], role, policies: [policy] });
        const names = user.getPermissions().map((p) => p.id);

        assert.ok(names.includes('direct'), 'direct permissions are included');
        assert.ok(names.includes('role-permission'), 'the role permissions are included');
        assert.ok(names.includes('role-policy-permission'), "the role's policy permissions are included");
        assert.ok(names.includes('policy-permission'), 'the direct policy permissions are included');
        assert.deepEqual(
            user.allPermissions.map((p) => p.id),
            names,
            'allPermissions delegates to getPermissions'
        );
        assert.strictEqual(rolePolicy.id, 'pol_role', 'the nested role policy resolved');
    });

    test('getPermissions returns just the direct permissions when there is no role or policy', function (assert) {
        const direct = this.store.push({ data: { id: 'direct', type: 'permission' } });

        const permissions = this.user({ permissions: [direct] }).getPermissions();

        assert.deepEqual(
            permissions.map((p) => p.id),
            ['direct']
        );
    });

    test('deactivate and activate patch the user and flip session_status', async function (assert) {
        const user = this.savedUser({ session_status: 'active' });

        await user.deactivate();
        assert.deepEqual(this.calls.at(-1), { method: 'patch', path: 'users/deactivate/user_1' });
        assert.strictEqual(user.session_status, 'inactive');

        await user.activate();
        assert.deepEqual(this.calls.at(-1), { method: 'patch', path: 'users/activate/user_1' });
        assert.strictEqual(user.session_status, 'active');
    });

    test('verify patches the user and stores the returned verification time', async function (assert) {
        const user = this.savedUser({});

        await user.verify();

        assert.deepEqual(this.calls.at(-1), { method: 'patch', path: 'users/verify/user_1' });
        assert.strictEqual(user.email_verified_at, '2026-05-06T14:30:00Z');
    });

    test('removeFromCurrentCompany deletes and resendInvite posts the user id', async function (assert) {
        const user = this.savedUser({});

        await user.removeFromCurrentCompany();
        assert.deepEqual(this.calls.at(-1), { method: 'delete', path: 'users/remove-from-company/user_1' });

        await user.resendInvite();
        assert.deepEqual(this.calls.at(-1), { method: 'post', path: 'users/resend-invite', payload: { user: 'user_1' } });
    });
});

module('Unit | Model | user | timestamps', function (hooks) {
    setupTest(hooks);

    test('the short updated stamp and the relative created stamp are exposed', function (assert) {
        const created = new Date('2026-01-15T10:30:00Z');
        const updated = new Date('2026-02-20T08:05:00Z');
        const user = this.owner.lookup('service:store').createRecord('user', { created_at: created, updated_at: updated });

        assert.strictEqual(user.updatedAtShort, format(updated, 'PP'));
        assert.strictEqual(user.createdAgo, formatDistanceToNow(created));
    });
});

/**
 * getPermissions guards every relationship it reads before walking it. Ember Data always
 * hands back a ManyArray — empty or not — so a saved record can never take those guards'
 * false arms; the only way to assert they actually guard is to run the method against a
 * minimal `get`-shaped stand-in, which is exactly the shape it consumes.
 */
module('Unit | Model | user | getPermissions guards', function () {
    const runOn = (values) => UserModel.prototype.getPermissions.call({ get: (key) => values[key] });
    // Relationships are consumed via toArray(), so a stand-in policy has to offer one.
    const policyWith = (...names) => ({ get: () => (names.length ? { toArray: () => names } : null) });

    test('a user with nothing attached collects no permissions', function (assert) {
        assert.deepEqual(runOn({}), [], 'no direct permissions, no role and no policies');
    });

    test('a role carrying neither permissions nor policies contributes nothing', function (assert) {
        assert.deepEqual(runOn({ role: { id: 'role_1' } }), [], 'the role is entered but has nothing to give');
    });

    test('a role policy with no permissions is skipped', function (assert) {
        const permissions = runOn({
            role: { id: 'role_1' },
            'role.policies': { length: 2, objectAt: (i) => [policyWith(), policyWith('granted')][i] },
        });

        assert.deepEqual(permissions, ['granted'], 'only the policy that has permissions contributes');
    });

    test('a directly attached policy with no permissions is skipped', function (assert) {
        const permissions = runOn({
            policies: { length: 2, objectAt: (i) => [policyWith(), policyWith('direct-grant')][i] },
        });

        assert.deepEqual(permissions, ['direct-grant']);
    });
});
