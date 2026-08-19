import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

module('Unit | Controller | console/admin/two-fa-settings', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.requests = [];
        this.getResponse = { enabled: true, method: 'email', enforced: false };
        this.getRejectsWith = null;
        this.postRejectsWith = null;
        const context = this;

        class FetchStub extends Service {
            get(path) {
                context.requests.push({ method: 'get', path });
                return context.getRejectsWith ? Promise.reject(context.getRejectsWith) : Promise.resolve(context.getResponse);
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
            serverError(error) {
                this.serverErrors.push(error);
            }
        }

        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);

        this.build = () => this.owner.lookup('controller:console/admin/two-fa-settings');
        this.notifications = () => this.owner.lookup('service:notifications');
    });

    test('it loads the system 2FA config on construction', async function (assert) {
        const controller = this.build();
        await controller.loadSystemTwoFaConfig.last;

        assert.deepEqual(this.requests, [{ method: 'get', path: 'two-fa/config' }]);
        assert.deepEqual(controller.twoFaSettings, this.getResponse);
        assert.ok(controller.methods.length > 0, 'the available methods are offered');
    });

    test('a config that comes back empty leaves the settings untouched', async function (assert) {
        this.getResponse = null;
        const controller = this.build();
        await controller.loadSystemTwoFaConfig.last;

        assert.deepEqual(controller.twoFaSettings, {}, 'nothing is applied');
    });

    test('a failed config load is reported', async function (assert) {
        const failure = new Error('config unavailable');
        this.getRejectsWith = failure;
        const controller = this.build();
        await controller.loadSystemTwoFaConfig.last;

        assert.deepEqual(this.notifications().serverErrors, [failure]);
        assert.deepEqual(controller.twoFaSettings, {});
    });

    test('the toggles and method selection each patch one field of the settings', async function (assert) {
        const controller = this.build();
        await controller.loadSystemTwoFaConfig.last;

        controller.onTwoFaToggled(false);
        assert.false(controller.twoFaSettings.enabled);
        assert.strictEqual(controller.twoFaSettings.method, 'email', 'the other fields survive');

        controller.onTwoFaMethodSelected('sms');
        assert.strictEqual(controller.twoFaSettings.method, 'sms');
        assert.false(controller.twoFaSettings.enabled);

        controller.onTwoFaEnforceToggled(true);
        assert.true(controller.twoFaSettings.enforced);
        assert.strictEqual(controller.twoFaSettings.method, 'sms');
    });

    test('saveSettings posts the current settings and reports success', async function (assert) {
        const controller = this.build();
        await controller.loadSystemTwoFaConfig.last;

        controller.saveSettings();
        await controller.saveTwoFactorSettingsForAdmin.last;

        assert.deepEqual(this.requests.at(-1), { method: 'post', path: 'two-fa/config', payload: { twoFaSettings: controller.twoFaSettings } });
        assert.deepEqual(this.notifications().successes, ['2FA Settings saved for admin successfully.']);
        assert.false(controller.isLoading, 'the busy flag is cleared either way');
    });

    test('a failed save is reported and still clears the busy flag', async function (assert) {
        const failure = new Error('save rejected');
        this.postRejectsWith = failure;
        const controller = this.build();
        await controller.loadSystemTwoFaConfig.last;

        controller.saveSettings();
        await controller.saveTwoFactorSettingsForAdmin.last;

        assert.deepEqual(this.notifications().serverErrors, [failure]);
        assert.false(controller.isLoading);
    });
});

module('Unit | Controller | console/admin/two-fa-settings | defaults', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.requests = [];
        const context = this;

        class FetchStub extends Service {
            get(path) {
                context.requests.push({ method: 'get', path });
                return Promise.resolve({ enabled: false });
            }
            post(path, payload) {
                context.requests.push({ method: 'post', path, payload });
                return Promise.resolve({ ok: true });
            }
        }
        class NotificationsStub extends Service {
            successes = [];
            success(message) {
                this.successes.push(message);
            }
            serverError() {}
        }

        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);
    });

    test('saving with nothing supplied posts an empty settings object', async function (assert) {
        const controller = this.owner.lookup('controller:console/admin/two-fa-settings');

        await controller.saveTwoFactorSettingsForAdmin.perform();

        const post = this.requests.find((request) => request.method === 'post');
        assert.deepEqual(post, { method: 'post', path: 'two-fa/config', payload: { twoFaSettings: {} } });
    });
});
