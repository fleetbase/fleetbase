import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

module('Unit | Model | chat-attachment', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.downloads = [];
        const downloads = this.downloads;

        class FetchStub extends Service {
            download(path, params, options) {
                downloads.push({ path, params, options });
                return Promise.resolve();
            }
        }
        this.owner.register('service:fetch', FetchStub);

        this.store = this.owner.lookup('service:store');
    });

    test('isImage and isVideo classify the content type', function (assert) {
        const attachment = (content_type) => this.store.createRecord('chat-attachment', { content_type });

        assert.true(attachment('image/png').isImage);
        assert.false(attachment('image/png').isVideo);
        assert.true(attachment('video/mp4').isVideo);
        assert.false(attachment('video/mp4').isImage);
        assert.false(attachment('application/pdf').isImage, 'other types are neither');
        assert.false(attachment('application/pdf').isVideo);
    });

    test('the date getters format valid timestamps and null otherwise', function (assert) {
        const at = new Date('2026-05-06T14:30:00Z');
        const filled = this.store.createRecord('chat-attachment', { created_at: at, updated_at: at });

        assert.strictEqual(typeof filled.createdAt, 'string');
        assert.strictEqual(typeof filled.updatedAt, 'string');
        assert.strictEqual(typeof filled.createdAgo, 'string');
        assert.strictEqual(typeof filled.updatedAgo, 'string');

        const empty = this.store.createRecord('chat-attachment', {});
        assert.strictEqual(empty.createdAt, null);
        assert.strictEqual(empty.createdAgo, null);
        assert.strictEqual(empty.updatedAt, null);
        assert.strictEqual(empty.updatedAgo, null);
    });

    test('download requests the file through the fetch service', async function (assert) {
        const attachment = this.store.createRecord('chat-attachment', {
            file_uuid: 'file_1',
            filename: 'notes.pdf',
            content_type: 'application/pdf',
        });

        await attachment.download();

        assert.deepEqual(this.downloads.at(-1), {
            path: 'files/download',
            params: { file: 'file_1' },
            options: { fileName: 'notes.pdf', mimeType: 'application/pdf' },
        });
    });
});

module('Unit | Model | chat-attachment | download', function (hooks) {
    setupTest(hooks);

    test('downloadFromApi navigates to the API download endpoint for the attached file', function (assert) {
        const opened = [];
        const originalOpen = window.open;
        window.open = (url, target) => opened.push({ url, target });

        try {
            this.owner
                .lookup('service:store')
                .push({ data: { id: 'att_1', type: 'chat-attachment', attributes: { file_uuid: 'file_9' } } })
                .downloadFromApi();
        } finally {
            window.open = originalOpen;
        }

        assert.strictEqual(opened.length, 1, 'the browser is sent to the download URL');
        assert.ok(opened[0].url.endsWith('/files/download?file=file_9'), `the attached file uuid is used, not the attachment id (got ${opened[0].url})`);
        assert.strictEqual(opened[0].target, '_self');
    });
});
