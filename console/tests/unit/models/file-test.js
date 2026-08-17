import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

module('Unit | Model | file', function (hooks) {
    setupTest(hooks);

    // Replace this with your real tests.
    test('it exists', function (assert) {
        let store = this.owner.lookup('service:store');
        let model = store.createRecord('file', {});
        assert.ok(model);
    });
});

module('Unit | Model | file | type detection and download', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.store = this.owner.lookup('service:store');
    });

    test('isVideo and isImage classify the content type, with negated companions', function (assert) {
        const video = this.store.createRecord('file', { content_type: 'video/mp4' });
        assert.true(video.isVideo);
        assert.false(video.isNotVideo);
        assert.false(video.isImage);
        assert.true(video.isNotImage);

        const image = this.store.createRecord('file', { content_type: 'image/png' });
        assert.true(image.isImage);
        assert.false(image.isNotImage);
        assert.false(image.isVideo);
        assert.true(image.isNotVideo);

        const document = this.store.createRecord('file', { content_type: 'application/pdf' });
        assert.false(document.isImage);
        assert.false(document.isVideo);
        assert.true(document.isNotImage);
        assert.true(document.isNotVideo);
    });

    test('download delegates to the fetch service with the original filename and type', async function (assert) {
        const downloads = [];
        class FetchStub extends Service {
            download(path, params, options) {
                downloads.push({ path, params, options });
                return Promise.resolve('downloaded');
            }
        }
        this.owner.register('service:fetch', FetchStub);

        const file = this.store.push({
            data: { id: 'file_1', type: 'file', attributes: { original_filename: 'invoice.pdf', content_type: 'application/pdf' } },
        });

        const result = await file.download();

        assert.strictEqual(result, 'downloaded');
        assert.deepEqual(downloads, [
            {
                path: 'files/download',
                params: { file: 'file_1' },
                options: { fileName: 'invoice.pdf', mimeType: 'application/pdf' },
            },
        ]);
    });

    test('downloadFromApi navigates to the API download endpoint for this file', function (assert) {
        const opened = [];
        const originalOpen = window.open;
        window.open = (url, target) => opened.push({ url, target });

        try {
            this.store.push({ data: { id: 'file_2', type: 'file' } }).downloadFromApi();
        } finally {
            window.open = originalOpen;
        }

        assert.strictEqual(opened.length, 1, 'the browser is sent to the download URL');
        assert.ok(opened[0].url.endsWith('/files/download?file=file_2'), `the file id is in the URL (got ${opened[0].url})`);
        assert.strictEqual(opened[0].target, '_self', 'in the same tab, so the download starts in place');
    });
});
