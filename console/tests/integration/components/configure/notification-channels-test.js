import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

module('Integration | Component | configure/notification-channels', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.posted = [];
        const posted = this.posted;

        class FetchStub extends Service {
            get() {
                return Promise.resolve({});
            }
            post(path, payload) {
                posted.push({ path, payload });
                return Promise.resolve({ status: 'ok' });
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
});
