import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';
import ConfigureFilesystemComponent from '@fleetbase/console/components/configure/filesystem';

/**
 * Lets the fire-and-forget promise chains the component kicks off in its constructor and
 * actions run to completion. They are native promises, so settled() does not track them.
 */
function flush() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

module('Integration | Component | configure/filesystem', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.posted = [];
        this.uploads = [];
        this.getResponse = { driver: 'local', disks: ['local', 's3', 'gcs'] };
        this.postResponse = { status: 'ok', message: 'Connection successful' };
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

                    onUploaded({ id: 'file_1', path: 'gcs/creds.json' });
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
        const captured = captureComponent(this.owner, 'configure/filesystem', ConfigureFilesystemComponent);
        this.build = async () => {
            await render(hbs`
            <div id="next-view-section-subheader-actions"></div>
            <Configure::Filesystem />
        `);
            await flush();
            return captured.instance;
        };
    });

    test('it renders the filesystem panel and wormholes its save button to the subheader', async function (assert) {
        // The component wormholes its "Save Changes" button into an element that only
        // exists in the app shell, so the destination must be present in the test DOM.
        await render(hbs`
            <div id="next-view-section-subheader-actions"></div>
            <Configure::Filesystem />
        `);

        assert.dom('.next-content-panel').exists('the panel renders');
        assert.dom(this.element).containsText('Filesystem');
        assert.dom('#next-view-section-subheader-actions').containsText('Save Changes', 'the save button is wormholed into the subheader');
    });

    test('it loads the current driver from the settings endpoint', async function (assert) {
        await render(hbs`
            <div id="next-view-section-subheader-actions"></div>
            <Configure::Filesystem />
        `);

        assert.dom(this.element).containsText('Driver', 'the driver input group renders');
        assert.dom(this.element).doesNotContainText('S3 Bucket', 'S3 fields are hidden for the local driver');
    });

    test('it saves the configuration when the wormholed button is clicked', async function (assert) {
        await render(hbs`
            <div id="next-view-section-subheader-actions"></div>
            <Configure::Filesystem />
        `);

        await click('#next-view-section-subheader-actions button');

        assert.strictEqual(this.posted.at(-1).path, 'settings/filesystem-config');
        assert.strictEqual(this.posted.at(-1).payload.driver, 'local');
    });

    test('it starts on the local driver with no storage configured', async function (assert) {
        this.getResponse = {};
        const component = await this.build();

        assert.strictEqual(component.driver, 'local');
        assert.deepEqual(component.disks, []);
        // Read before anything writes them: a @tracked field's initializer only runs on
        // first access, so a test that assigns first never evaluates it.
        assert.strictEqual(component.testResponse, undefined, 'no connection test has run yet');
        assert.strictEqual(component.s3Url, null);
        assert.strictEqual(component.s3Endpoint, null);
        assert.strictEqual(component.gcsCredentialsFileId, null);
        assert.strictEqual(component.gcsCredentialsFile, null);
        assert.strictEqual(component.s3Bucket, null);
        assert.strictEqual(component.gcsBucket, null);
        assert.false(component.isGoogleCloudStorageEnvConfigued);
        assert.false(component.isLoading, 'loading is cleared once the config request settles');
    });

    test('loadConfigValues applies known keys and ignores unknown ones', async function (assert) {
        this.getResponse = { driver: 's3', s3Bucket: 'my-bucket', notAFieldOnThisComponent: 'ignored' };
        const component = await this.build();

        assert.strictEqual(component.driver, 's3');
        assert.strictEqual(component.s3Bucket, 'my-bucket');
        assert.strictEqual(component.notAFieldOnThisComponent, undefined, 'keys the component does not declare are dropped');
    });

    test('setDriver swaps the active driver', async function (assert) {
        const component = await this.build();

        component.setDriver('gcs');

        assert.strictEqual(component.driver, 'gcs');
    });

    test('save posts the s3 and gcs settings and reports success', async function (assert) {
        this.getResponse = {};
        const component = await this.build();

        component.setDriver('s3');
        component.s3Bucket = 'bucket';
        component.s3Url = 'https://cdn.example.com';
        component.s3Endpoint = 'https://s3.example.com';
        component.gcsBucket = 'gcs-bucket';
        component.gcsCredentialsFileId = 'file_1';

        component.save();
        assert.true(component.isLoading, 'the panel is busy while saving');
        await flush();

        const { path, payload } = this.posted.at(-1);
        assert.strictEqual(path, 'settings/filesystem-config');
        assert.strictEqual(payload.driver, 's3');
        assert.deepEqual(payload.s3, { bucket: 'bucket', url: 'https://cdn.example.com', endpoint: 'https://s3.example.com' });
        assert.strictEqual(payload.gcsBucket, 'gcs-bucket');
        assert.strictEqual(payload.gcsCredentialsFileId, 'file_1');
        assert.deepEqual(this.owner.lookup('service:notifications').successes, ['Filesystem configuration saved.']);
        assert.false(component.isLoading);
    });

    test('test posts the selected disk and keeps the response', async function (assert) {
        const component = await this.build();

        component.setDriver('s3');
        component.test();
        await flush();

        assert.deepEqual(this.posted.at(-1), { path: 'settings/test-filesystem-config', payload: { disk: 's3' } });
        assert.deepEqual(component.testResponse, this.postResponse);
        assert.false(component.isLoading);
    });

    test('uploading gcs credentials stores the returned file', async function (assert) {
        const component = await this.build();

        component.uploadGcsCredentialsFile({ name: 'creds.json' });

        assert.strictEqual(this.uploads[0].meta.path, 'gcs');
        assert.strictEqual(this.uploads[0].meta.type, 'gcs_credentials');
        assert.strictEqual(this.uploads[0].meta.subject_type, 'company');
        assert.strictEqual(component.gcsCredentialsFileId, 'file_1');
        assert.deepEqual(component.gcsCredentialsFile, { id: 'file_1', path: 'gcs/creds.json' });
    });

    test('a failed gcs upload is reported rather than thrown', async function (assert) {
        const failure = new Error('upload rejected');
        this.uploadThrows = failure;
        const component = await this.build();

        component.uploadGcsCredentialsFile({ name: 'creds.json' });

        assert.deepEqual(this.owner.lookup('service:notifications').serverErrors, [failure]);
        assert.strictEqual(component.gcsCredentialsFileId, null, 'nothing is stored when the upload fails');
    });

    test('removeGcsCredentialsFile clears both the file and its id', async function (assert) {
        const component = await this.build();

        component.uploadGcsCredentialsFile({ name: 'creds.json' });
        assert.strictEqual(component.gcsCredentialsFileId, 'file_1', 'precondition: a file is attached');

        component.removeGcsCredentialsFile();

        assert.strictEqual(component.gcsCredentialsFileId, undefined);
        assert.strictEqual(component.gcsCredentialsFile, undefined);
    });
});

module('Integration | Component | configure/filesystem | defaults', function (hooks) {
    setupRenderingTest(hooks);

    test('a server that reports no disks leaves the picker empty rather than undefined', async function (assert) {
        class FetchStub extends Service {
            async get() {
                return { driver: 'local' };
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

        const captured = captureComponent(this.owner, 'configure/filesystem', ConfigureFilesystemComponent);
        await render(hbs`<div id="next-view-section-subheader-actions"></div><Configure::Filesystem />`);

        assert.deepEqual(captured.instance.disks, [], 'the disk list defaults to empty');
        assert.strictEqual(captured.instance.driver, 'local');
    });
});
