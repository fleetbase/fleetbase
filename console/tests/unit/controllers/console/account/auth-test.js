import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

// The controller's constructor immediately performs loadSystemTwoFaConfig and
// loadUserTwoFaSettings, so service:fetch must be registered before any lookup.
function stubServices(owner, { get = () => Promise.resolve(null), post = () => Promise.resolve({}) } = {}) {
    const posts = [];
    const notified = { success: [], errors: [] };

    class FetchStub extends Service {
        get(path) {
            return get(path);
        }
        post(path, payload) {
            posts.push({ path, payload });
            return post(path, payload);
        }
    }
    class NotificationsStub extends Service {
        success(message) {
            notified.success.push(message);
        }
        serverError(error, message) {
            notified.errors.push(message ?? error);
        }
    }

    owner.register('service:fetch', FetchStub);
    owner.register('service:notifications', NotificationsStub);

    return { posts, notified };
}

module('Unit | Controller | console/account/auth', function (hooks) {
    setupTest(hooks);

    test('onTwoFaToggled and onTwoFaMethodSelected merge into the 2FA settings', function (assert) {
        stubServices(this.owner);
        const controller = this.owner.lookup('controller:console/account/auth');

        controller.onTwoFaToggled(true);
        assert.deepEqual(controller.twoFaSettings, { enabled: true });

        controller.onTwoFaMethodSelected('sms');
        assert.deepEqual(controller.twoFaSettings, { enabled: true, method: 'sms' }, 'existing settings are preserved');
    });

    test('loadSystemTwoFaConfig and loadUserTwoFaSettings populate tracked state', async function (assert) {
        stubServices(this.owner, {
            get: (path) => Promise.resolve(path === 'two-fa/config' ? { enabled: true, method: 'email' } : { enabled: false }),
        });

        const controller = this.owner.lookup('controller:console/account/auth');

        await controller.loadSystemTwoFaConfig.perform();
        assert.true(controller.isSystemTwoFaEnabled);
        assert.deepEqual(controller.twoFaConfig, { enabled: true, method: 'email' });

        await controller.loadUserTwoFaSettings.perform();
        assert.deepEqual(controller.twoFaSettings, { enabled: false });
    });

    test('changeEmail posts the new address and clears the form on success', async function (assert) {
        const { posts, notified } = stubServices(this.owner);
        const controller = this.owner.lookup('controller:console/account/auth');

        controller.newEmail = 'new@fleetbase.io';
        controller.currentPassword = 'hunter2';

        await controller.changeEmail.perform();

        assert.deepEqual(posts.at(-1), { path: 'users/change-email', payload: { email: 'new@fleetbase.io', password: 'hunter2' } });
        assert.strictEqual(notified.success.length, 1, 'success is reported');
        assert.strictEqual(controller.newEmail, undefined, 'email field cleared');
        assert.strictEqual(controller.currentPassword, undefined, 'password field cleared');
    });

    test('changeEmail reports a server error and keeps the form values', async function (assert) {
        const { notified } = stubServices(this.owner, { post: () => Promise.reject(new Error('nope')) });
        const controller = this.owner.lookup('controller:console/account/auth');

        controller.newEmail = 'new@fleetbase.io';

        await controller.changeEmail.perform();

        assert.deepEqual(notified.errors, ['Failed to request email change.']);
        assert.strictEqual(controller.newEmail, 'new@fleetbase.io', 'form is not cleared on failure');
    });

    test('changePassword aborts and clears the fields when the current password is not validated', async function (assert) {
        const { posts } = stubServices(this.owner);

        class ModalsManagerStub extends Service {
            show(_name, options) {
                options.onValidated(false);
                return Promise.resolve();
            }
        }
        this.owner.register('service:modals-manager', ModalsManagerStub);

        const controller = this.owner.lookup('controller:console/account/auth');
        controller.newPassword = 'a-new-password';
        controller.newConfirmPassword = 'a-new-password';

        await controller.changePassword.perform();

        assert.notOk(
            posts.some((p) => p.path === 'users/change-password'),
            'the password is never submitted'
        );
        assert.strictEqual(controller.newPassword, undefined);
        assert.strictEqual(controller.newConfirmPassword, undefined);
    });

    test('changePassword submits once the current password is validated', async function (assert) {
        const { posts, notified } = stubServices(this.owner);

        class ModalsManagerStub extends Service {
            show(_name, options) {
                options.onValidated(true);
                return Promise.resolve();
            }
        }
        this.owner.register('service:modals-manager', ModalsManagerStub);

        const controller = this.owner.lookup('controller:console/account/auth');
        controller.newPassword = 'a-new-password';
        controller.newConfirmPassword = 'a-new-password';

        await controller.changePassword.perform();

        assert.deepEqual(posts.at(-1), {
            path: 'users/change-password',
            payload: { password: 'a-new-password', password_confirmation: 'a-new-password' },
        });
        assert.strictEqual(notified.success.length, 1);
        assert.strictEqual(controller.newPassword, undefined, 'fields are cleared after submitting');
    });

    test('saveTwoFactorAuthSettings posts the current 2FA settings', async function (assert) {
        const { posts } = stubServices(this.owner);
        const controller = this.owner.lookup('controller:console/account/auth');

        controller.onTwoFaToggled(true);
        await controller.saveUserTwoFaSettings.perform(controller.twoFaSettings);

        assert.deepEqual(posts.at(-1), { path: 'users/two-fa', payload: { twoFaSettings: { enabled: true } } });
    });
});
