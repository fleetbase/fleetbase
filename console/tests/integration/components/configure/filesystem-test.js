import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

module('Integration | Component | configure/filesystem', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.posted = [];
        const posted = this.posted;

        class FetchStub extends Service {
            get() {
                return Promise.resolve({ driver: 'local', disks: ['local', 's3', 'gcs'] });
            }
            post(path, payload) {
                posted.push({ path, payload });
                return Promise.resolve({ status: 'ok', message: 'Connection successful' });
            }
        }
        class NotificationsStub extends Service {
            success() {}
            error() {}
            serverError() {}
        }

        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);
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
});
