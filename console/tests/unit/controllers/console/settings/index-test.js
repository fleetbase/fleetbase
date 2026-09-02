import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import { settled } from '@ember/test-helpers';
import Service from '@ember/service';

module('Unit | Controller | console/settings/index', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        // The constructor auto-performs loadTimezones; stub fetch so lookup resolves deterministically.
        class FetchStub extends Service {
            get() {
                return Promise.resolve(['UTC', 'America/New_York']);
            }
        }
        this.owner.register('service:fetch', FetchStub);
    });

    test('loadTimezones populates the timezones list on construction', async function (assert) {
        const controller = this.owner.lookup('controller:console/settings/index');
        await settled();

        assert.deepEqual(controller.timezones, ['UTC', 'America/New_York']);
    });

    test('saveSettings persists the model and notifies success', async function (assert) {
        class NotificationsStub extends Service {
            success() {
                this.succeeded = true;
            }
        }
        this.owner.register('service:notifications', NotificationsStub);

        const controller = this.owner.lookup('controller:console/settings/index');
        let saved = false;
        controller.model = {
            save() {
                saved = true;
                return Promise.resolve();
            },
        };

        await controller.saveSettings.perform();

        assert.true(saved, 'model is saved');
        assert.true(this.owner.lookup('service:notifications').succeeded);
    });
});

module('Unit | Controller | console/settings/index | saving and uploads', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.uploads = [];
        this.timezones = ['UTC', 'America/New_York'];
        this.getRejectsWith = null;
        this.saveRejectsWith = null;
        const context = this;

        class FetchStub extends Service {
            get() {
                return context.getRejectsWith ? Promise.reject(context.getRejectsWith) : Promise.resolve(context.timezones);
            }
            uploadFile = {
                perform: (file, meta, onUploaded) => {
                    context.uploads.push({ file, meta });
                    return onUploaded({ id: 'file_1', url: 'https://cdn.example.com/logo.png' });
                },
            };
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

        this.saved = 0;
        this.build = async () => {
            const controller = this.owner.lookup('controller:console/settings/index');
            controller.model = {
                setProperties(properties) {
                    Object.assign(this, properties);
                },
                save: () => {
                    context.saved++;
                    return context.saveRejectsWith ? Promise.reject(context.saveRejectsWith) : Promise.resolve();
                },
            };
            await controller.loadTimezones.last;
            return controller;
        };
        this.notifications = () => this.owner.lookup('service:notifications');
    });

    test('it starts with empty upload queues and loads the timezone list', async function (assert) {
        const controller = await this.build();

        assert.deepEqual(controller.uploadQueue, []);
        assert.deepEqual(controller.uploadedFiles, []);
        assert.deepEqual(controller.timezones, this.timezones);
    });

    test('a failed timezone load leaves the list empty without interrupting the user', async function (assert) {
        this.getRejectsWith = new Error('lookup unavailable');
        const controller = await this.build();

        assert.deepEqual(controller.timezones, []);
    });

    test('saveSettings persists the organization and reports success', async function (assert) {
        const controller = await this.build();

        await controller.saveSettings.perform();

        assert.strictEqual(this.saved, 1);
        assert.deepEqual(this.notifications().successes, ['Organization changes successfully saved.']);
    });

    test('saveSettings prevents a form submission from navigating', async function (assert) {
        const controller = await this.build();
        const event = new Event('submit', { cancelable: true });

        await controller.saveSettings.perform(event);

        assert.true(event.defaultPrevented);
    });

    test('a failed save is swallowed rather than shown as a success', async function (assert) {
        this.saveRejectsWith = new Error('save rejected');
        const controller = await this.build();

        await controller.saveSettings.perform();

        assert.deepEqual(this.notifications().successes, [], 'nothing is reported as saved');
    });

    test('uploadFile files the asset under the company and records it on the model', async function (assert) {
        const controller = await this.build();

        await controller.uploadFile('logo', { name: 'logo.png' });

        assert.strictEqual(this.uploads[0].meta.key_type, 'company');
        assert.strictEqual(this.uploads[0].meta.type, 'logo');
        assert.ok(this.uploads[0].meta.path.endsWith('/logo'), `the asset type is part of the path (got ${this.uploads[0].meta.path})`);
        assert.strictEqual(controller.model.logo_uuid, 'file_1');
        assert.strictEqual(controller.model.logo_url, 'https://cdn.example.com/logo.png');
        assert.deepEqual(controller.model.logo, { id: 'file_1', url: 'https://cdn.example.com/logo.png' });
    });
});
