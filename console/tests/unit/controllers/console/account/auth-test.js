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

module('Unit | Controller | console/account/auth | credentials and 2FA', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.requests = [];
        this.responses = { 'two-fa/config': { enabled: true }, 'users/two-fa': { enabled: true, method: 'sms' } };
        this.getRejectsWith = null;
        this.postRejectsWith = null;
        this.passwordIsValid = true;
        const context = this;

        class FetchStub extends Service {
            get(path) {
                context.requests.push({ method: 'get', path });
                return context.getRejectsWith ? Promise.reject(context.getRejectsWith) : Promise.resolve(context.responses[path]);
            }
            post(path, payload) {
                context.requests.push({ method: 'post', path, payload });
                return context.postRejectsWith ? Promise.reject(context.postRejectsWith) : Promise.resolve({ ok: true });
            }
        }
        class NotificationsStub extends Service {
            successes = [];
            serverErrors = [];
            success(message) {
                this.successes.push(message);
            }
            serverError(error, fallback) {
                this.serverErrors.push([error, fallback]);
            }
        }
        class ModalsManagerStub extends Service {
            shown = [];
            show(name, options) {
                this.shown.push({ name, options });
                options.onValidated?.(context.passwordIsValid);
                return Promise.resolve();
            }
        }
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.owner.register('service:modals-manager', ModalsManagerStub);

        this.build = async () => {
            const controller = this.owner.lookup('controller:console/account/auth');
            await controller.loadSystemTwoFaConfig.last;
            await controller.loadUserTwoFaSettings.last;
            return controller;
        };
        this.notifications = () => this.owner.lookup('service:notifications');
    });

    test('it loads the system config and the user 2FA settings on construction', async function (assert) {
        const controller = await this.build();

        assert.deepEqual(this.requests.map((request) => request.path).sort(), ['two-fa/config', 'users/two-fa']);
        assert.true(controller.isSystemTwoFaEnabled);
        assert.deepEqual(controller.twoFaSettings, this.responses['users/two-fa']);
    });

    test('failed 2FA loads are reported', async function (assert) {
        const failure = new Error('two-fa unavailable');
        this.getRejectsWith = failure;
        await this.build();

        assert.deepEqual(this.notifications().serverErrors, [
            [failure, undefined],
            [failure, undefined],
        ]);
    });

    test('changeEmail posts the new address and clears the form', async function (assert) {
        const controller = await this.build();
        controller.newEmail = 'new@fleetbase.io';
        controller.currentPassword = 'secret';

        await controller.changeEmail.perform();

        assert.deepEqual(this.requests.at(-1), { method: 'post', path: 'users/change-email', payload: { email: 'new@fleetbase.io', password: 'secret' } });
        assert.strictEqual(controller.newEmail, undefined, 'the form is cleared');
        assert.strictEqual(controller.currentPassword, undefined);
        assert.strictEqual(this.notifications().successes.length, 1);
    });

    test('changeEmail prevents a form submission from navigating', async function (assert) {
        const controller = await this.build();
        const event = new Event('submit', { cancelable: true });

        await controller.changeEmail.perform(event);

        assert.true(event.defaultPrevented);
    });

    test('a failed email change is reported with its own fallback message', async function (assert) {
        const failure = new Error('address already in use');
        this.postRejectsWith = failure;
        const controller = await this.build();

        await controller.changeEmail.perform();

        assert.deepEqual(this.notifications().serverErrors.at(-1), [failure, 'Failed to request email change.']);
    });

    test('changePassword validates the current password before changing it', async function (assert) {
        const controller = await this.build();
        controller.newPassword = 'new-secret';
        controller.newConfirmPassword = 'new-secret';

        await controller.changePassword.perform();

        assert.strictEqual(this.owner.lookup('service:modals-manager').shown[0].name, 'modals/validate-password');
        assert.deepEqual(this.requests.at(-1), {
            method: 'post',
            path: 'users/change-password',
            payload: { password: 'new-secret', password_confirmation: 'new-secret' },
        });
        assert.deepEqual(this.notifications().successes, ['Password change successfully.']);
        assert.strictEqual(controller.newPassword, undefined, 'the form is cleared');
    });

    test('a failed password validation abandons the change', async function (assert) {
        this.passwordIsValid = false;
        const controller = await this.build();
        controller.newPassword = 'new-secret';
        controller.newConfirmPassword = 'new-secret';

        await controller.changePassword.perform();

        assert.notOk(
            this.requests.some((request) => request.path === 'users/change-password'),
            'nothing is submitted'
        );
        assert.strictEqual(controller.newPassword, undefined, 'the form is cleared anyway');
        assert.deepEqual(this.notifications().successes, []);
    });

    test('a failed password change is reported with its own fallback message', async function (assert) {
        const failure = new Error('password too weak');
        const controller = await this.build();
        this.postRejectsWith = failure;

        await controller.changePassword.perform();

        assert.deepEqual(this.notifications().serverErrors.at(-1), [failure, 'Failed to change password.']);
        assert.strictEqual(controller.newPassword, undefined);
    });

    test('the 2FA toggles patch one field each and saving posts them', async function (assert) {
        const controller = await this.build();

        controller.onTwoFaToggled(false);
        assert.false(controller.twoFaSettings.enabled);

        controller.onTwoFaMethodSelected('email');
        assert.strictEqual(controller.twoFaSettings.method, 'email');
        assert.false(controller.twoFaSettings.enabled, 'the earlier change survives');

        controller.saveTwoFactorAuthSettings();
        await controller.saveUserTwoFaSettings.last;

        assert.deepEqual(this.requests.at(-1), { method: 'post', path: 'users/two-fa', payload: { twoFaSettings: controller.twoFaSettings } });
        assert.deepEqual(this.notifications().successes, ['2FA Settings saved successfully.']);
    });

    test('a failed 2FA save is reported', async function (assert) {
        const controller = await this.build();
        this.postRejectsWith = new Error('save rejected');

        controller.saveTwoFactorAuthSettings();
        await controller.saveUserTwoFaSettings.last;

        assert.strictEqual(this.notifications().serverErrors.length, 1);
        assert.deepEqual(this.notifications().successes, []);
    });
});

module('Unit | Controller | console/account/auth | form submission', function (hooks) {
    setupTest(hooks);

    // changePassword waits on the validate-password modal, which never resolves on its own.
    function stubModals(owner, isValid) {
        class ModalsManagerStub extends Service {
            show(name, options) {
                options.onValidated(isValid);
                return Promise.resolve();
            }
        }

        owner.register('service:modals-manager', ModalsManagerStub);
    }

    test('changePassword stops the form submitting the page away', async function (assert) {
        const { posts, notified } = stubServices(this.owner, { post: () => Promise.resolve({ status: 'ok' }) });
        stubModals(this.owner, true);
        const controller = this.owner.lookup('controller:console/account/auth');
        controller.newPassword = 'new-password';
        controller.newConfirmPassword = 'new-password';

        const event = new Event('submit', { cancelable: true });
        await controller.changePassword.perform(event);

        assert.true(event.defaultPrevented, 'the native submit is cancelled');
        assert.deepEqual(posts.at(-1), {
            path: 'users/change-password',
            payload: { password: 'new-password', password_confirmation: 'new-password' },
        });
        assert.deepEqual(notified.success, ['Password change successfully.']);
        assert.strictEqual(controller.newPassword, undefined, 'the form is cleared afterwards');
    });

    test('a password that fails validation clears the form without changing anything', async function (assert) {
        const { posts } = stubServices(this.owner);
        stubModals(this.owner, false);
        const controller = this.owner.lookup('controller:console/account/auth');
        controller.newPassword = 'new-password';
        controller.newConfirmPassword = 'new-password';

        await controller.changePassword.perform();

        assert.deepEqual(posts, [], 'nothing is sent');
        assert.strictEqual(controller.newPassword, undefined);
        assert.strictEqual(controller.newConfirmPassword, undefined);
    });

    test('saving 2FA settings with nothing selected posts an empty settings object', async function (assert) {
        const { posts, notified } = stubServices(this.owner);
        const controller = this.owner.lookup('controller:console/account/auth');

        await controller.saveUserTwoFaSettings.perform();

        assert.deepEqual(posts.at(-1), { path: 'users/two-fa', payload: { twoFaSettings: {} } });
        assert.deepEqual(notified.success, ['2FA Settings saved successfully.']);
    });
});
