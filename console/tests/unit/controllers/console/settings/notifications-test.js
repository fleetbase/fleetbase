import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import { settled } from '@ember/test-helpers';
import Service from '@ember/service';

module('Unit | Controller | console/settings/notifications', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        // Constructor auto-performs getSettings; stub fetch so lookup settles deterministically.
        class FetchStub extends Service {
            get() {
                return Promise.resolve({ notificationSettings: {} });
            }
        }
        this.owner.register('service:fetch', FetchStub);
    });

    test('onSelectNotifiable records notifiables and derives transport methods', async function (assert) {
        const controller = this.owner.lookup('controller:console/settings/notifications');
        await settled();

        controller.onSelectNotifiable({ definition: 'order.created', name: 'Order Created' }, [{ value: 'user_1' }]);

        const settings = controller.notificationSettings;
        const keys = Object.keys(settings);
        assert.strictEqual(keys.length, 1, 'one notification key is recorded');

        const entry = settings[keys[0]];
        assert.deepEqual(entry.notifiables, [{ value: 'user_1' }]);
        assert.strictEqual(entry.definition, 'order.created');
        assert.deepEqual(entry.via, [{ identifier: 'user_1', methods: ['email', 'sms'] }], 'each notifiable gets the default transport methods');
    });

    test('mutateNotificationSettings merges into the existing settings', async function (assert) {
        const controller = this.owner.lookup('controller:console/settings/notifications');
        await settled();

        controller.notificationSettings = { a: 1 };
        controller.mutateNotificationSettings({ b: 2 });

        assert.deepEqual(controller.notificationSettings, { a: 1, b: 2 });
    });
});

module('Unit | Controller | console/settings/notifications | persistence', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.requests = [];
        this.getResponse = { notificationSettings: { 'order:created': { via: [] } } };
        this.getRejectsWith = null;
        this.postRejectsWith = null;
        this.saveRejectsWith = null;
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

        this.saved = 0;
        this.withCompany = (options) => {
            const company = {
                options,
                set(key, value) {
                    this[key] = value;
                },
                save: () => {
                    context.saved++;
                    return context.saveRejectsWith ? Promise.reject(context.saveRejectsWith) : Promise.resolve();
                },
            };
            return company;
        };
        this.build = () => this.owner.lookup('controller:console/settings/notifications');
        this.notifications = () => this.owner.lookup('service:notifications');
    });

    test('it loads the saved notification settings on construction', async function (assert) {
        const controller = this.build();
        await controller.getSettings.last;

        assert.deepEqual(this.requests, [{ method: 'get', path: 'notifications/get-settings' }]);
        assert.deepEqual(controller.notificationSettings, this.getResponse.notificationSettings);
        assert.deepEqual(controller.notificationTransportMethods, ['email', 'sms']);
    });

    test('a failed load is reported', async function (assert) {
        const failure = new Error('settings unavailable');
        this.getRejectsWith = failure;
        const controller = this.build();
        await controller.getSettings.last;

        assert.deepEqual(this.notifications().serverErrors, [failure]);
    });

    test('toggling the alphanumeric sender id keeps the other company options', async function (assert) {
        const controller = this.build();
        await controller.getSettings.last;
        controller.company = this.withCompany({ existing: 'kept' });

        controller.toggleAlphaNumericSenderId(true);

        assert.deepEqual(controller.company.options, { existing: 'kept', alpha_numeric_sender_id_enabled: true });
    });

    test('setting the alphanumeric sender id keeps the other company options', async function (assert) {
        const controller = this.build();
        await controller.getSettings.last;
        controller.company = this.withCompany({ existing: 'kept' });

        controller.setAlphaNumericSenderId({ target: { value: 'FLEETBASE' } });

        assert.deepEqual(controller.company.options, { existing: 'kept', alpha_numeric_sender_id: 'FLEETBASE' });
    });

    test('a company with no options yet starts from an empty set', async function (assert) {
        const controller = this.build();
        await controller.getSettings.last;
        controller.company = this.withCompany(undefined);

        controller.toggleAlphaNumericSenderId(false);

        assert.deepEqual(controller.company.options, { alpha_numeric_sender_id_enabled: false });
    });

    test('saveSettings posts the settings, saves the company and reports success', async function (assert) {
        const controller = this.build();
        await controller.getSettings.last;
        controller.company = this.withCompany({});

        await controller.saveSettings.perform();

        assert.deepEqual(this.requests.at(-1), { method: 'post', path: 'notifications/save-settings', payload: { notificationSettings: controller.notificationSettings } });
        assert.strictEqual(this.saved, 1, 'the company options are persisted too');
        assert.deepEqual(this.notifications().successes, ['Notification settings successfully saved.']);
    });

    test('saveSettings sends an empty object when nothing has been configured', async function (assert) {
        const controller = this.build();
        await controller.getSettings.last;
        controller.notificationSettings = null;

        await controller.saveSettings.perform();

        assert.deepEqual(this.requests.at(-1).payload, { notificationSettings: {} });
    });

    test('a failed save is reported and success is not', async function (assert) {
        const failure = new Error('save rejected');
        this.postRejectsWith = failure;
        const controller = this.build();
        await controller.getSettings.last;

        await controller.saveSettings.perform();

        assert.deepEqual(this.notifications().serverErrors, [failure]);
        assert.deepEqual(this.notifications().successes, []);
    });

    test('saving company options is skipped when there is no company loaded', async function (assert) {
        const controller = this.build();
        await controller.getSettings.last;
        controller.company = null;

        await controller.saveCompanyOptions.perform();

        assert.strictEqual(this.saved, 0, 'nothing is persisted');
        assert.deepEqual(this.notifications().serverErrors, []);
    });

    test('a failed company save is reported on its own', async function (assert) {
        const failure = new Error('company save rejected');
        this.saveRejectsWith = failure;
        const controller = this.build();
        await controller.getSettings.last;
        controller.company = this.withCompany({});

        await controller.saveCompanyOptions.perform();

        assert.deepEqual(this.notifications().serverErrors, [failure]);
    });
});

module('Unit | Controller | console/settings/notifications | company options', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        class FetchStub extends Service {
            get() {
                return Promise.resolve({ notificationSettings: {} });
            }
        }
        this.owner.register('service:fetch', FetchStub);

        this.build = async () => {
            const controller = this.owner.lookup('controller:console/settings/notifications');
            await settled();

            // Stands in for the company record: only options and set() are read.
            controller.company = {
                options: undefined,
                set(key, value) {
                    this[key] = value;
                },
            };

            return controller;
        };
    });

    test('a company that has never had options gets a fresh options object', async function (assert) {
        const controller = await this.build();

        controller.setAlphaNumericSenderId({ target: { value: 'FLEETBASE' } });

        assert.deepEqual(controller.company.options, { alpha_numeric_sender_id: 'FLEETBASE' });
    });

    test('existing company options are preserved when the sender id changes', async function (assert) {
        const controller = await this.build();
        controller.company.options = { alpha_numeric_sender_id_enabled: true, unrelated: 'kept' };

        controller.setAlphaNumericSenderId({ target: { value: 'ACME' } });

        assert.deepEqual(controller.company.options, {
            alpha_numeric_sender_id_enabled: true,
            unrelated: 'kept',
            alpha_numeric_sender_id: 'ACME',
        });
    });

    test('selecting notifiables twice for the same notification updates the existing entry', async function (assert) {
        const controller = await this.build();
        const notification = { definition: 'order.created', name: 'Order Created' };

        controller.onSelectNotifiable(notification, [{ value: 'user_1' }]);
        const key = Object.keys(controller.notificationSettings)[0];

        controller.onSelectNotifiable(notification, [{ value: 'user_2' }, { value: 'user_3' }]);

        assert.deepEqual(Object.keys(controller.notificationSettings), [key], 'the same key is reused rather than duplicated');
        assert.deepEqual(controller.notificationSettings[key].notifiables, [{ value: 'user_2' }, { value: 'user_3' }], 'the selection is replaced');
    });

    test('mutating with nothing leaves the settings as they were', async function (assert) {
        const controller = await this.build();
        controller.notificationSettings = { 'order.created': { definition: 'order.created' } };

        controller.mutateNotificationSettings();

        assert.deepEqual(controller.notificationSettings, { 'order.created': { definition: 'order.created' } });
    });

    test('the transport methods a notifiable is reachable on default to email and sms', async function (assert) {
        const controller = await this.build();

        assert.deepEqual(controller.notificationTransportMethods, ['email', 'sms']);
    });
});
