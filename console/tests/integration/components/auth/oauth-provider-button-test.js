import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | auth/oauth-provider-button', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.provider = { id: 'google', label: 'Google', icon: 'google' };
    });

    test('it is a block button carrying the provider, logo at the far left', async function (assert) {
        await render(hbs`<Auth::OauthProviderButton @provider={{this.provider}} />`);

        assert.dom('.btn-wrapper').hasClass('btn-block').hasClass('oauth-provider-google');
        assert.dom('button .btn-icon-wrapper .oauth-provider-logo-google').exists();
    });

    test('it shows the given text, or the provider label', async function (assert) {
        await render(hbs`<Auth::OauthProviderButton @provider={{this.provider}} @text="Continue with Google" />`);
        assert.dom('button').hasText('Continue with Google');

        await render(hbs`<Auth::OauthProviderButton @provider={{this.provider}} />`);
        assert.dom('button').hasText('Google');
    });

    test('clicking calls onClick with the provider, and is safe without one', async function (assert) {
        this.clicked = [];
        this.onClick = (provider) => this.clicked.push(provider);
        await render(hbs`<Auth::OauthProviderButton @provider={{this.provider}} @onClick={{this.onClick}} />`);
        await click('button');
        assert.deepEqual(this.clicked, [this.provider]);

        await render(hbs`<Auth::OauthProviderButton @provider={{this.provider}} />`);
        await click('button');
        assert.dom('button').exists();
    });
});
