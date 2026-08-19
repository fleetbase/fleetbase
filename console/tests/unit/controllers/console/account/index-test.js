import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import { settled } from '@ember/test-helpers';
import Service from '@ember/service';

module('Unit | Controller | console/account/index', function (hooks) {
    setupTest(hooks);

    test('loadTimezones populates the timezones list on construction', async function (assert) {
        class FetchStub extends Service {
            get(path) {
                this.path = path;
                return Promise.resolve(['UTC', 'Europe/Berlin']);
            }
        }
        this.owner.register('service:fetch', FetchStub);

        const controller = this.owner.lookup('controller:console/account/index');
        await settled();

        assert.strictEqual(this.owner.lookup('service:fetch').path, 'lookup/timezones');
        assert.deepEqual(controller.timezones, ['UTC', 'Europe/Berlin']);
    });
});

module('Unit | Controller | console/account/index | profile', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.uploads = [];
        this.getResponse = ['UTC', 'America/New_York'];
        this.getRejectsWith = null;
        this.saveRejectsWith = null;
        const context = this;

        class FetchStub extends Service {
            get(path) {
                context.requestedPath = path;
                return context.getRejectsWith ? Promise.reject(context.getRejectsWith) : Promise.resolve(context.getResponse);
            }
            uploadFile = {
                perform: (file, meta, onUploaded) => {
                    context.uploads.push({ file, meta });
                    return onUploaded({ id: 'file_1', url: 'https://cdn.example.com/avatar.png' });
                },
            };
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
        this.user = {
            id: 'user_1',
            slug: 'ron',
            company_uuid: 'co_1',
            setProperties(properties) {
                Object.assign(this, properties);
            },
            save: () => {
                context.saved++;
                return context.saveRejectsWith ? Promise.reject(context.saveRejectsWith) : Promise.resolve(context.user);
            },
        };

        this.build = () => {
            const controller = this.owner.lookup('controller:console/account/index');
            // `user` is an alias onto the currentUser service, so set the backing property.
            controller.currentUser.set('user', this.user);
            return controller;
        };
        this.notifications = () => this.owner.lookup('service:notifications');
    });

    test('it loads the timezone list on construction', async function (assert) {
        const controller = this.build();
        await controller.loadTimezones.last;

        assert.strictEqual(this.requestedPath, 'lookup/timezones');
        assert.deepEqual(controller.timezones, this.getResponse);
    });

    test('a failed timezone load leaves the list empty without a user-facing error', async function (assert) {
        this.getRejectsWith = new Error('lookup unavailable');
        const controller = this.build();
        await controller.loadTimezones.last;

        assert.deepEqual(controller.timezones, [], 'nothing to choose from');
        assert.deepEqual(this.notifications().serverErrors, [], 'a missing lookup is not worth interrupting the user');
    });

    test('uploadNewPhoto files the avatar under the company and saves the user', async function (assert) {
        const controller = this.build();
        await controller.loadTimezones.last;

        await controller.uploadNewPhoto({ name: 'avatar.png' });

        assert.deepEqual(this.uploads[0].meta, {
            path: 'uploads/co_1/users/ron',
            subject_uuid: 'user_1',
            subject_type: 'user',
            type: 'user_avatar',
            resize: 'md',
        });
        assert.strictEqual(this.user.avatar_uuid, 'file_1');
        assert.strictEqual(this.user.avatar_url, 'https://cdn.example.com/avatar.png');
        assert.strictEqual(this.saved, 1, 'the new avatar is persisted');
    });

    test('saveProfile saves the user and refreshes the signed-in record', async function (assert) {
        const controller = this.build();
        await controller.loadTimezones.last;

        await controller.saveProfile.perform();

        assert.strictEqual(this.saved, 1);
        assert.deepEqual(this.notifications().successes, ['Profile changes saved.']);
        assert.strictEqual(controller.currentUser.user, this.user, 'the saved record replaces the cached one');
    });

    test('saveProfile prevents a form submission from navigating', async function (assert) {
        const controller = this.build();
        await controller.loadTimezones.last;
        const event = new Event('submit', { cancelable: true });

        await controller.saveProfile.perform(event);

        assert.true(event.defaultPrevented);
    });

    test('a failed profile save is reported and success is not', async function (assert) {
        const failure = new Error('save rejected');
        this.saveRejectsWith = failure;
        const controller = this.build();
        await controller.loadTimezones.last;

        await controller.saveProfile.perform();

        assert.deepEqual(this.notifications().serverErrors, [failure]);
        assert.deepEqual(this.notifications().successes, []);
    });
});
