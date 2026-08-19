import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import { settled } from '@ember/test-helpers';
import Service from '@ember/service';

module('Unit | Controller | console/settings/two-fa', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        // Constructor auto-loads system/company/user 2FA settings; stub fetch so lookup settles.
        class FetchStub extends Service {
            get() {
                return Promise.resolve({});
            }
        }
        this.owner.register('service:fetch', FetchStub);
    });

    test('the toggle actions immutably patch twoFaSettings', async function (assert) {
        const controller = this.owner.lookup('controller:console/settings/two-fa');
        await settled();

        controller.onTwoFaToggled(true);
        assert.true(controller.twoFaSettings.enabled);

        controller.onTwoFaMethodSelected('sms');
        assert.strictEqual(controller.twoFaSettings.method, 'sms');
        assert.true(controller.twoFaSettings.enabled, 'previous keys are preserved');

        controller.onTwoFaEnforceToggled(true);
        assert.true(controller.twoFaSettings.enforced);
    });
});

module('Unit | Controller | console/settings/two-fa | loading and saving', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.requests = [];
        this.responses = {
            'two-fa/config': { enabled: true },
            'companies/two-fa': { enabled: true, enforced: true, method: 'email' },
            'users/two-fa': { enabled: false, method: 'sms' },
        };
        this.postRejectsWith = null;
        const context = this;

        class FetchStub extends Service {
            get(path) {
                context.requests.push({ method: 'get', path });
                return Promise.resolve(context.responses[path]);
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

        this.build = async () => {
            const controller = this.owner.lookup('controller:console/settings/two-fa');
            await controller.loadSystemTwoFaConfig.last;
            await controller.loadCompanyTwoFaSettings.last;
            await controller.loadUserTwoFaSettings.last;
            return controller;
        };
        this.notifications = () => this.owner.lookup('service:notifications');
    });

    test('it loads the system, company and user settings on construction', async function (assert) {
        const controller = await this.build();

        assert.deepEqual(this.requests.map((request) => request.path).sort(), ['companies/two-fa', 'two-fa/config', 'users/two-fa'], 'all three sources are consulted');
        assert.true(controller.isSystemTwoFaEnabled, 'the system flag comes from the config');
        assert.true(controller.isTwoFaEnforced, 'enforcement comes from the company');
        assert.false(controller.isUserTwoFaEnabled, 'the user flag comes from their own settings');
        assert.ok(controller.methods.length > 0);
    });

    test('empty responses leave every flag at its default', async function (assert) {
        this.responses = {};
        const controller = await this.build();

        assert.false(controller.isSystemTwoFaEnabled);
        assert.false(controller.isTwoFaEnforced);
        assert.false(controller.isUserTwoFaEnabled);
        assert.deepEqual(controller.twoFaSettings, {});
        assert.deepEqual(controller.twoFaConfig, {});
    });

    test('each toggle patches one field and leaves the rest alone', async function (assert) {
        const controller = await this.build();

        controller.onTwoFaToggled(true);
        assert.true(controller.twoFaSettings.enabled);

        controller.onTwoFaMethodSelected('authenticator');
        assert.strictEqual(controller.twoFaSettings.method, 'authenticator');
        assert.true(controller.twoFaSettings.enabled, 'the earlier change survives');

        controller.onTwoFaEnforceToggled(true);
        assert.true(controller.twoFaSettings.enforced);
        assert.strictEqual(controller.twoFaSettings.method, 'authenticator');
    });

    test('saveTwoFactor posts the settings for the organization', async function (assert) {
        const controller = await this.build();

        controller.saveTwoFactor();
        await controller.saveTwoFactorSettingsForCompany.last;

        assert.deepEqual(this.requests.at(-1), { method: 'post', path: 'companies/two-fa', payload: { twoFaSettings: controller.twoFaSettings } });
        assert.deepEqual(this.notifications().successes, ['2FA Settings saved for organization successfully.']);
    });

    test('a failed save is reported', async function (assert) {
        const failure = new Error('save rejected');
        this.postRejectsWith = failure;
        const controller = await this.build();

        controller.saveTwoFactor();
        await controller.saveTwoFactorSettingsForCompany.last;

        assert.deepEqual(this.notifications().serverErrors, [failure]);
        assert.deepEqual(this.notifications().successes, []);
    });
});

module('Unit | Controller | console/settings/two-fa | defaults', function (hooks) {
    setupTest(hooks);

    test('saving the company 2FA settings with nothing supplied posts an empty object', async function (assert) {
        const posted = [];

        class FetchStub extends Service {
            get() {
                return Promise.resolve({ enabled: false });
            }
            post(path, payload) {
                posted.push({ path, payload });
                return Promise.resolve({ ok: true });
            }
        }
        class NotificationsStub extends Service {
            success() {}
            serverError() {}
        }

        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);

        const controller = this.owner.lookup('controller:console/settings/two-fa');
        await controller.saveTwoFactorSettingsForCompany.perform();

        assert.deepEqual(posted.at(-1).payload, { twoFaSettings: {} });
    });
});
