import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

module('Integration | Component | modals/validate-password', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        class FetchStub extends Service {
            post() {
                return Promise.resolve({ valid: true });
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

    test('it renders the password fields and the supplied body', async function (assert) {
        this.set('options', { body: 'Validate your current password.' });

        await render(hbs`<Modals::ValidatePassword @modalIsOpened={{true}} @options={{this.options}} />`);

        assert.dom(this.element).containsText('Validate your current password.');
        assert.dom('input[type="password"]').exists({ count: 2 });
    });

    test('it rewrites the modal options on setup', async function (assert) {
        this.set('options', {});

        await render(hbs`<Modals::ValidatePassword @modalIsOpened={{true}} @options={{this.options}} />`);

        assert.strictEqual(this.options.title, 'Validate Current Password');
        assert.strictEqual(this.options.acceptButtonText, 'Validate Password');
        assert.true(this.options.declineButtonHidden, 'the decline button is hidden');
        assert.strictEqual(typeof this.options.confirm, 'function', 'a confirm handler is installed');
    });
});
