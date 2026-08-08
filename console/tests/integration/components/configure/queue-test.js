import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

module('Integration | Component | configure/queue', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.posted = [];
        const posted = this.posted;

        class FetchStub extends Service {
            get() {
                return Promise.resolve({ driver: 'redis' });
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

    test('it renders the queue panel and wormholes its save button to the subheader', async function (assert) {
        await render(hbs`
            <div id="next-view-section-subheader-actions"></div>
            <Configure::Queue />
        `);

        assert.dom('.next-content-panel').exists('the panel renders');
        assert.dom(this.element).containsText('Queue');
        assert.dom('#next-view-section-subheader-actions').containsText('Save Changes', 'the save button is wormholed into the subheader');
    });

    test('it saves the queue configuration when the wormholed button is clicked', async function (assert) {
        await render(hbs`
            <div id="next-view-section-subheader-actions"></div>
            <Configure::Queue />
        `);

        await click('#next-view-section-subheader-actions button');

        assert.strictEqual(this.posted.at(-1).path, 'settings/queue-config');
    });
});
