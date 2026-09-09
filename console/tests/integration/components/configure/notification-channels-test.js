import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';
import ConfigureNotificationChannelsComponent from '@fleetbase/console/components/configure/notification-channels';

/**
 * Lets the fire-and-forget promise chains the component starts run to completion. They are
 * native promises, so settled() does not track them.
 */
function flush() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

module('Integration | Component | configure/notification-channels', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.posted = [];
        this.uploads = [];
        this.getResponse = {};
        this.postResponse = { status: 'ok' };
        const context = this;

        class FetchStub extends Service {
            get() {
                return Promise.resolve(context.getResponse);
            }
            post(path, payload) {
                context.posted.push({ path, payload });
                return Promise.resolve(context.postResponse);
            }
            uploadFile = {
                perform: (file, meta, onUploaded) => {
                    context.uploads.push({ file, meta });

                    if (context.uploadThrows) {
                        throw context.uploadThrows;
                    }

                    onUploaded(context.uploadedFile ?? { id: 'file_1', path: 'apn/key.p8' });
                },
            };
        }
        class NotificationsStub extends Service {
            successes = [];
            serverErrors = [];
            success(message) {
                this.successes.push(message);
            }
            error() {}
            serverError(error) {
                this.serverErrors.push(error);
            }
        }

        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);

        // Glimmer components cannot be constructed by hand, so let Ember build one and
        // capture it: the actions below are only reachable through third-party controls
        // in the template, or not rendered at all.
        const captured = captureComponent(this.owner, 'configure/notification-channels', ConfigureNotificationChannelsComponent);
        this.build = async () => {
            await render(hbs`
            <div id="next-view-section-subheader-actions"></div>
            <Configure::NotificationChannels />
        `);
            await flush();
            return captured.instance;
        };
    });

    test('it renders the APN, Firebase and test panels', async function (assert) {
        await render(hbs`
            <div id="next-view-section-subheader-actions"></div>
            <Configure::NotificationChannels />
        `);

        assert.dom(this.element).containsText('APN');
        assert.dom(this.element).containsText('Firebase');
        assert.dom(this.element).containsText('Test Push Notification');
    });

    test('it wormholes its save button to the subheader and posts the config', async function (assert) {
        await render(hbs`
            <div id="next-view-section-subheader-actions"></div>
            <Configure::NotificationChannels />
        `);

        assert.dom('#next-view-section-subheader-actions').containsText('Save Changes');

        await click('#next-view-section-subheader-actions button');

        assert.strictEqual(this.posted.at(-1).path, 'settings/notification-channels-config');
    });

    test('it starts with an empty APN config and a prefilled test notification', async function (assert) {
        const component = await this.build();

        // Read before anything writes them: a @tracked field's initializer only runs on
        // first access, so a test that assigns first never evaluates it.
        assert.strictEqual(component.testResponse, undefined, 'no test notification has been sent yet');
        assert.strictEqual(component.testTitle, 'Hello World from Fleetbase 🚀');
        assert.strictEqual(component.testMessage, 'This is a test push notification!');
        assert.strictEqual(component.apnToken, undefined);
        assert.strictEqual(component.fcmToken, undefined);
        assert.true(component.apn.production, 'APN defaults to the production gateway');
        assert.strictEqual(component.apn.key_id, '');
        assert.deepEqual(component.firebase, { credentials: '' });
        assert.false(component.isLoading);
    });

    test('loadConfigValues applies known keys and ignores unknown ones', async function (assert) {
        this.getResponse = {
            apn: { key_id: 'ABC123', production: false },
            testTitle: 'Loaded title',
            notAFieldOnThisComponent: 'ignored',
        };
        const component = await this.build();

        assert.strictEqual(component.apn.key_id, 'ABC123');
        assert.strictEqual(component.testTitle, 'Loaded title');
        assert.strictEqual(component.notAFieldOnThisComponent, undefined, 'keys the component does not declare are dropped');
    });

    test('toggleApnProduction switches the gateway without dropping the rest of the config', async function (assert) {
        const component = await this.build();

        component.apn = { ...component.apn, key_id: 'ABC123' };
        component.toggleApnProduction(false);

        assert.false(component.apn.production);
        assert.strictEqual(component.apn.key_id, 'ABC123', 'the other APN fields survive the toggle');

        component.toggleApnProduction(true);
        assert.true(component.apn.production);
    });

    test('uploading an APN key records it against the company', async function (assert) {
        this.uploadedFile = { id: 'apn_1', path: 'apn/AuthKey.p8' };
        const component = await this.build();

        component.uploadApnKey({ name: 'AuthKey.p8' });

        assert.strictEqual(this.uploads[0].meta.path, 'apn');
        assert.strictEqual(this.uploads[0].meta.type, 'apn_key');
        assert.strictEqual(this.uploads[0].meta.subject_type, 'company');
        assert.strictEqual(component.apn.private_key_file_id, 'apn_1');
        assert.strictEqual(component.apn.private_key_path, 'apn/AuthKey.p8');
        assert.strictEqual(component.apn._private_key_path, 'apn/AuthKey.p8');
        assert.deepEqual(component.apn.private_key_file, this.uploadedFile);
    });

    test('a failed APN key upload is reported rather than thrown', async function (assert) {
        const failure = new Error('upload rejected');
        this.uploadThrows = failure;
        const component = await this.build();

        component.uploadApnKey({ name: 'AuthKey.p8' });

        assert.deepEqual(this.owner.lookup('service:notifications').serverErrors, [failure]);
        assert.strictEqual(component.apn.private_key_file_id, '', 'nothing is recorded when the upload fails');
    });

    test('removeApnFile clears every trace of the uploaded key', async function (assert) {
        const component = await this.build();

        component.uploadApnKey({ name: 'AuthKey.p8' });
        assert.strictEqual(component.apn.private_key_file_id, 'file_1', 'precondition: a key is attached');

        component.removeApnFile();

        assert.strictEqual(component.apn.private_key_file, null);
        assert.strictEqual(component.apn.private_key_file_id, '');
        assert.strictEqual(component.apn.private_key_path, '');
        assert.strictEqual(component.apn._private_key_path, '');
    });

    test('uploading Firebase credentials records them against the company', async function (assert) {
        this.uploadedFile = { id: 'fb_1', path: 'firebase/creds.json' };
        const component = await this.build();

        component.uploadFirebaseCredentials({ name: 'creds.json' });

        assert.strictEqual(this.uploads[0].meta.path, 'firebase');
        assert.strictEqual(this.uploads[0].meta.type, 'firebase_credentials');
        assert.strictEqual(component.firebase.credentials_file_id, 'fb_1');
        assert.strictEqual(component.firebase.credentials_file_path, 'firebase/creds.json');
        assert.deepEqual(component.firebase.credentials_file, this.uploadedFile);
    });

    test('a failed Firebase upload is reported rather than thrown', async function (assert) {
        const failure = new Error('upload rejected');
        this.uploadThrows = failure;
        const component = await this.build();

        component.uploadFirebaseCredentials({ name: 'creds.json' });

        assert.deepEqual(this.owner.lookup('service:notifications').serverErrors, [failure]);
        assert.strictEqual(component.firebase.credentials_file_id, undefined, 'nothing is recorded when the upload fails');
    });

    test('removeFirebaseCredentialsFile clears the stored credentials', async function (assert) {
        const component = await this.build();

        component.uploadFirebaseCredentials({ name: 'creds.json' });
        assert.strictEqual(component.firebase.credentials_file_id, 'file_1', 'precondition: credentials are attached');

        component.removeFirebaseCredentialsFile();

        assert.strictEqual(component.firebase.credentials_file, null);
        assert.strictEqual(component.firebase.credentials_file_id, '');
        assert.strictEqual(component.firebase.credentials, '');
    });

    test('save strips the file handles before posting and reports success', async function (assert) {
        const component = await this.build();

        component.uploadApnKey({ name: 'AuthKey.p8' });
        component.uploadFirebaseCredentials({ name: 'creds.json' });

        component.save();
        assert.true(component.isLoading, 'the panel is busy while saving');
        await flush();

        const { path, payload } = this.posted.at(-1);
        assert.strictEqual(path, 'settings/notification-channels-config');
        assert.false('private_key_file' in payload.apn, 'the APN file handle is not sent');
        assert.false('credentials_file' in payload.firebase, 'the Firebase file handle is not sent');
        assert.strictEqual(payload.apn.private_key_file_id, 'file_1', 'but the uploaded file id is');
        assert.deepEqual(this.owner.lookup('service:notifications').successes, ["Notification channel's configuration saved."]);
        assert.false(component.isLoading);
    });

    test('test posts the notification payload and keeps the response', async function (assert) {
        this.postResponse = { status: 'ok', delivered: 2 };
        const component = await this.build();

        component.testTitle = 'Ping';
        component.testMessage = 'Are you there?';
        component.apnToken = 'apn-token';
        component.fcmToken = 'fcm-token';

        component.test();
        assert.true(component.isLoading);
        await flush();

        const { path, payload } = this.posted.at(-1);
        assert.strictEqual(path, 'settings/test-notification-channels-config');
        assert.strictEqual(payload.title, 'Ping');
        assert.strictEqual(payload.message, 'Are you there?');
        assert.strictEqual(payload.apnToken, 'apn-token');
        assert.strictEqual(payload.fcmToken, 'fcm-token');
        assert.deepEqual(payload.apn, component.apn);
        assert.deepEqual(component.testResponse, this.postResponse);
        assert.false(component.isLoading);
    });
});

module('Integration | Component | configure/notification-channels | defaults', function (hooks) {
    setupRenderingTest(hooks);

    test('the test push notification is pre-filled so an admin can send one straight away', async function (assert) {
        class FetchStub extends Service {
            async get() {
                return {};
            }
            async post() {
                return {};
            }
        }
        class NotificationsStub extends Service {
            success() {}
            serverError() {}
        }
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);

        const captured = captureComponent(this.owner, 'configure/notification-channels', ConfigureNotificationChannelsComponent);
        await render(hbs`<div id="next-view-section-subheader-actions"></div><Configure::NotificationChannels />`);

        assert.strictEqual(captured.instance.testTitle, 'Hello World from Fleetbase 🚀');
        assert.strictEqual(captured.instance.testMessage, 'This is a test push notification!');
    });
});
