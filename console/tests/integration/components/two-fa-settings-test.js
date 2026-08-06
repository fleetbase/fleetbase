import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | two-fa-settings', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.set('methods', [
            { key: 'email', name: 'Email' },
            { key: 'sms', name: 'SMS', recommended: true },
        ]);
    });

    test('it renders the enable toggle and hides the details when 2FA is off', async function (assert) {
        this.set('settings', { enabled: false });

        await render(hbs`<TwoFaSettings @twoFaSettings={{this.settings}} @twoFaMethods={{this.methods}} />`);

        assert.dom(this.element).containsText('Enable Two-Factor Authentication');
        assert.dom(this.element).doesNotContainText('Choose an authentication method', 'method selection is hidden while disabled');
    });

    test('it shows the method selection when 2FA is enabled', async function (assert) {
        this.set('settings', { enabled: true, method: 'sms' });

        await render(hbs`<TwoFaSettings @twoFaSettings={{this.settings}} @twoFaMethods={{this.methods}} />`);

        assert.dom(this.element).containsText('Choose an authentication method');
    });

    test('the enforce option is only offered when requested', async function (assert) {
        this.set('settings', { enabled: true, enforced: true });

        await render(hbs`<TwoFaSettings @twoFaSettings={{this.settings}} @twoFaMethods={{this.methods}} />`);
        assert.dom(this.element).doesNotContainText('Require Users to Set-Up 2FA', 'hidden by default');

        await render(hbs`<TwoFaSettings @twoFaSettings={{this.settings}} @twoFaMethods={{this.methods}} @showEnforceOption={{true}} />`);
        assert.dom(this.element).containsText('Require Users to Set-Up 2FA');
    });

    test('method selection can be suppressed', async function (assert) {
        this.set('settings', { enabled: true, method: 'email' });

        await render(hbs`<TwoFaSettings @twoFaSettings={{this.settings}} @twoFaMethods={{this.methods}} @showMethodSelection={{false}} />`);

        assert.dom(this.element).doesNotContainText('Choose an authentication method');
    });
});
