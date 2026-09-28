import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

// load() — called by the route on entry — performs loadSystemTwoFaConfig and
// loadUserTwoFaSettings, so service:fetch must be registered before it runs.
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

    test('changePassword submits current credentials in the same request and clears sensitive fields', async function (assert) {
        const { posts, notified } = stubServices(this.owner);
        const controller = this.owner.lookup('controller:console/account/auth');
        controller.changePasswordCurrentPassword = 'current-secret';
        controller.newPassword = 'a-new-password';
        controller.newConfirmPassword = 'a-new-password';

        await controller.changePassword.perform();

        assert.deepEqual(posts.at(-1), {
            path: 'users/change-password',
            payload: { current_password: 'current-secret', password: 'a-new-password', password_confirmation: 'a-new-password' },
        });
        assert.deepEqual(notified.success, ['Password changed successfully.']);
        assert.strictEqual(controller.changePasswordCurrentPassword, undefined);
        assert.strictEqual(controller.newPassword, undefined);
        assert.strictEqual(controller.newConfirmPassword, undefined);
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
        this.modalResponse = null;
        class ModalsManagerStub extends Service {
            shown = [];
            show(name, options) {
                this.shown.push({ name, options });
                // The authenticator modal reports a change, then closes
                if (context.modalResponse) {
                    options.onChanged?.(context.modalResponse);
                }
                options.onClosed?.(Boolean(context.modalResponse));
                return Promise.resolve();
            }
        }
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.owner.register('service:modals-manager', ModalsManagerStub);

        this.build = async () => {
            const controller = this.owner.lookup('controller:console/account/auth');
            controller.load();
            await controller.loadSystemTwoFaConfig.last;
            await controller.loadUserTwoFaSettings.last;
            return controller;
        };
        this.notifications = () => this.owner.lookup('service:notifications');
    });

    test('looking the controller up requests nothing', function (assert) {
        // The router does this before authentication is checked — e.g. when a sign-out
        // reloads the page on this URL — so it must not fire authenticated requests.
        this.owner.lookup('controller:console/account/auth');

        assert.deepEqual(this.requests, []);
    });

    test('it loads the system config and the user 2FA settings when the route is entered', async function (assert) {
        const controller = await this.build();

        assert.deepEqual(this.requests.map((request) => request.path).sort(), ['two-fa/config', 'users/password-policy', 'users/two-fa', 'users/two-fa/authenticator']);
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

    test('changePassword submits the current and new passwords together', async function (assert) {
        const controller = await this.build();
        controller.changePasswordCurrentPassword = 'current-secret';
        controller.newPassword = 'new-secret';
        controller.newConfirmPassword = 'new-secret';

        await controller.changePassword.perform();

        assert.deepEqual(this.owner.lookup('service:modals-manager').shown, [], 'password authorization is handled by the server');
        assert.deepEqual(this.requests.at(-1), {
            method: 'post',
            path: 'users/change-password',
            payload: { current_password: 'current-secret', password: 'new-secret', password_confirmation: 'new-secret' },
        });
        assert.deepEqual(this.notifications().successes, ['Password changed successfully.']);
        assert.strictEqual(controller.newPassword, undefined, 'the form is cleared');
    });

    test('a rejected current password is reported and sensitive fields are cleared', async function (assert) {
        const failure = new Error('current password is incorrect');
        this.postRejectsWith = failure;
        const controller = await this.build();
        controller.changePasswordCurrentPassword = 'incorrect';
        controller.newPassword = 'new-secret';
        controller.newConfirmPassword = 'new-secret';

        await controller.changePassword.perform();

        assert.deepEqual(this.requests.at(-1).payload, { current_password: 'incorrect', password: 'new-secret', password_confirmation: 'new-secret' });
        assert.deepEqual(this.notifications().serverErrors.at(-1), [failure, 'Failed to change password.']);
        assert.strictEqual(controller.changePasswordCurrentPassword, undefined);
        assert.strictEqual(controller.newPassword, undefined);
        assert.strictEqual(controller.newConfirmPassword, undefined);
        assert.deepEqual(this.notifications().successes, []);
    });

    test('password policy disables changes only when the server explicitly disallows them', async function (assert) {
        const controller = await this.build();
        for (const policy of [{ can_change_password: false }, { can_change_password: true }, {}, null]) {
            this.responses['users/password-policy'] = policy;
            await controller.loadPasswordPolicy.perform();
            assert.strictEqual(controller.canChangePassword, policy?.can_change_password !== false);
        }
        this.getRejectsWith = new Error('endpoint unavailable');
        controller.canChangePassword = false;
        await controller.loadPasswordPolicy.perform();
        assert.true(controller.canChangePassword, 'older servers retain the password form');
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
    test('empty 2FA responses leave the defaults untouched', async function (assert) {
        this.responses = {};
        const controller = this.owner.lookup('controller:console/account/auth');
        const before = { system: controller.isSystemTwoFaEnabled, user: controller.isUserTwoFaEnabled, settings: controller.twoFaSettings, config: controller.twoFaConfig };

        controller.load();
        assert.strictEqual(await controller.loadSystemTwoFaConfig.last, undefined);
        assert.strictEqual(await controller.loadUserTwoFaSettings.last, undefined);

        assert.deepEqual(
            { system: controller.isSystemTwoFaEnabled, user: controller.isUserTwoFaEnabled, settings: controller.twoFaSettings, config: controller.twoFaConfig },
            before,
            'nothing is applied from an empty response'
        );
    });

    test('the authenticator app is offered, marked as needing setup until it is set up', async function (assert) {
        const controller = await this.build();

        assert.deepEqual(
            controller.methods.map(({ key, requiresSetup }) => [key, requiresSetup]),
            [
                ['authenticator_app', true],
                ['sms', undefined],
                ['email', undefined],
            ]
        );

        controller.authenticator = { enabled: true, confirmed_at: '2026-09-27T00:00:00Z', recovery_codes_remaining: 8 };

        assert.false(controller.methods[0].requiresSetup);
    });

    test('choosing the authenticator app sets it up first', async function (assert) {
        const controller = await this.build();
        const modals = this.owner.lookup('service:modals-manager');

        assert.true(await controller.beforeTwoFaMethodSelected('sms'), 'other methods need nothing');
        assert.strictEqual(modals.shown.length, 0);

        assert.false(await controller.beforeTwoFaMethodSelected('authenticator_app'), 'a cancelled setup keeps the previous choice');
        assert.strictEqual(modals.shown[0].name, 'modals/authenticator-app');
        assert.strictEqual(modals.shown[0].options.mode, 'setup');

        this.modalResponse = {
            status: { enabled: true, confirmed_at: '2026-09-27T00:00:00Z', recovery_codes_remaining: 8 },
            settings: { enabled: true, method: 'authenticator_app' },
        };

        assert.true(await controller.beforeTwoFaMethodSelected('authenticator_app'), 'a finished setup allows the choice');
        assert.true(controller.authenticator.enabled);
        assert.deepEqual(controller.twoFaSettings, { enabled: true, method: 'authenticator_app' });
        assert.true(await controller.beforeTwoFaMethodSelected('authenticator_app'), 'once set up, no modal is needed');
        assert.strictEqual(modals.shown.length, 2);
    });

    test('changes from the authenticator panel redraw the 2FA settings', async function (assert) {
        const controller = await this.build();

        await controller.manageAuthenticator('recovery-codes');
        assert.strictEqual(controller.twoFaSettingsRevision, 0, 'nothing changed');

        this.modalResponse = { status: { enabled: false, confirmed_at: null, recovery_codes_remaining: 0 }, settings: { enabled: false, method: 'email' } };
        await controller.manageAuthenticator('disable');

        assert.strictEqual(controller.twoFaSettingsRevision, 1);
        assert.strictEqual(this.owner.lookup('service:modals-manager').shown.at(-1).options.mode, 'disable');
        assert.deepEqual(controller.twoFaSettings, { enabled: false, method: 'email' });
    });
});

module('Unit | Controller | console/account/auth | form submission', function (hooks) {
    setupTest(hooks);

    test('changePassword stops the form submitting the page away', async function (assert) {
        const { posts, notified } = stubServices(this.owner, { post: () => Promise.resolve({ status: 'ok' }) });
        const controller = this.owner.lookup('controller:console/account/auth');
        controller.changePasswordCurrentPassword = 'current-password';
        controller.newPassword = 'new-password';
        controller.newConfirmPassword = 'new-password';

        const event = new Event('submit', { cancelable: true });
        await controller.changePassword.perform(event);

        assert.true(event.defaultPrevented, 'the native submit is cancelled');
        assert.deepEqual(posts.at(-1), {
            path: 'users/change-password',
            payload: { current_password: 'current-password', password: 'new-password', password_confirmation: 'new-password' },
        });
        assert.deepEqual(notified.success, ['Password changed successfully.']);
        assert.strictEqual(controller.newPassword, undefined, 'the form is cleared afterwards');
    });

    test('saving 2FA settings with nothing selected posts an empty settings object', async function (assert) {
        const { posts, notified } = stubServices(this.owner);
        const controller = this.owner.lookup('controller:console/account/auth');

        await controller.saveUserTwoFaSettings.perform();

        assert.deepEqual(posts.at(-1), { path: 'users/two-fa', payload: { twoFaSettings: {} } });
        assert.deepEqual(notified.success, ['2FA Settings saved successfully.']);
    });
});
