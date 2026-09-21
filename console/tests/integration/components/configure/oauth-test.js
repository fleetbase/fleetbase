import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render, click, fillIn, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import ConfigureOauthComponent from '@fleetbase/console/components/configure/oauth';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';

const CONFIG = {
    oauth: {
        enabled: true,
        allow_registration: true,
        providers: {
            google: {
                enabled: true,
                client_id: 'google-client-id',
                client_secret: { configured: true, hint: '••••1a2b' },
                hosted_domain: null,
            },
            apple: {
                enabled: false,
                client_id: null,
                team_id: null,
                key_id: null,
                private_key: { configured: false, hint: null },
            },
        },
    },
    providers: [
        {
            id: 'google',
            label: 'Google',
            icon: 'google',
            schema: {
                client_id: { label: 'Client ID', required: true },
                client_secret: { label: 'Client Secret', secret: true, required: true },
                hosted_domain: { label: 'Restrict to Workspace domain' },
            },
        },
        {
            id: 'apple',
            label: 'Apple',
            icon: 'apple',
            schema: {
                client_id: { label: 'Services ID', required: true },
                team_id: { label: 'Team ID', required: true },
                key_id: { label: 'Key ID', required: true },
                private_key: { label: 'Signing key (.p8)', secret: true, required: true },
            },
        },
    ],
    redirect_uris: {
        google: 'https://api.fleetbase.test/int/v1/auth/oauth/google/callback',
        apple: 'https://api.fleetbase.test/int/v1/auth/oauth/apple/callback',
    },
};

/**
 * A disabled provider's panel starts collapsed — on a fresh install that keeps the page
 * to a tidy list of provider headers — so its body is not in the DOM until opened.
 */
async function expandAll(element) {
    // Selected by class, not aria-expanded: Glimmer omits an attribute bound to `false`,
    // so a closed panel carries no aria-expanded attribute at all.
    for (const header of [...element.querySelectorAll('.next-content-panel-header.next-content-panel-is-closed .next-content-panel-header-left')]) {
        await click(header);
    }
}

module('Integration | Component | configure/oauth', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.posted = [];
        const self = this;

        class FetchStub extends Service {
            get() {
                return Promise.resolve(JSON.parse(JSON.stringify(CONFIG)));
            }
            post(path, payload) {
                self.posted.push({ path, payload });

                if (path === 'settings/test-oauth-config') {
                    return Promise.resolve({ provider: payload.provider, configured: false, enabled: false, problem: 'invalid_signing_key' });
                }

                return Promise.resolve(JSON.parse(JSON.stringify(CONFIG)));
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

    test('it renders a panel per provider from the server schema', async function (assert) {
        await render(hbs`<div id="next-view-section-subheader-actions"></div><Configure::Oauth />`);
        await expandAll(this.element);

        // Nothing is hardcoded: providers and their fields come from the API, which is
        // what lets a provider be added later without a console change.
        assert.dom(this.element).containsText('Google');
        assert.dom(this.element).containsText('Apple');
        assert.dom(this.element).containsText('Signing key (.p8)');
        assert.dom('#next-view-section-subheader-actions').containsText('Save Changes');
    });

    test('a disabled provider starts collapsed and an enabled one starts open', async function (assert) {
        await render(hbs`<div id="next-view-section-subheader-actions"></div><Configure::Oauth />`);

        // Google is enabled in the fixture, Apple is not.
        assert.dom(this.element).containsText('Restrict to Workspace domain', 'the enabled provider is expanded');
        assert.dom(this.element).doesNotContainText('Signing key (.p8)', 'the disabled provider is collapsed');
    });

    test('it shows each callback URL so the operator can register it', async function (assert) {
        await render(hbs`<div id="next-view-section-subheader-actions"></div><Configure::Oauth />`);
        await expandAll(this.element);

        const values = [...this.element.querySelectorAll('input[readonly]')].map((input) => input.value);

        assert.true(values.includes(CONFIG.redirect_uris.google));
        assert.true(values.includes(CONFIG.redirect_uris.apple));
    });

    test('secret inputs start empty and are masked', async function (assert) {
        await render(hbs`<div id="next-view-section-subheader-actions"></div><Configure::Oauth />`);

        const secret = this.element.querySelector('input[type="password"]');

        // The API never returns the real value, so there is nothing to show — only a
        // placeholder saying whether one is saved.
        assert.ok(secret, 'the secret renders as a password input');
        assert.strictEqual(secret.value, '', 'no value is prefilled');
        assert.true(secret.placeholder.includes('••••1a2b'), 'the saved hint is shown as a placeholder');
    });

    test('saving omits a secret left blank so the stored value is kept', async function (assert) {
        await render(hbs`<div id="next-view-section-subheader-actions"></div><Configure::Oauth />`);

        await click('#next-view-section-subheader-actions button');

        const saved = this.posted.find((p) => p.path === 'settings/oauth-config').payload;

        assert.strictEqual(saved.providers.google.client_id, 'google-client-id');
        assert.notOk('client_secret' in saved.providers.google, 'an untouched secret is not sent');
        assert.notOk('private_key' in saved.providers.apple);
        assert.strictEqual(saved.providers.google.enabled, true);
    });

    test('saving sends a secret the admin typed', async function (assert) {
        await render(hbs`<div id="next-view-section-subheader-actions"></div><Configure::Oauth />`);

        await fillIn('input[type="password"]', 'a-brand-new-secret');
        await click('#next-view-section-subheader-actions button');

        const saved = this.posted.find((p) => p.path === 'settings/oauth-config').payload;

        assert.strictEqual(saved.providers.google.client_secret, 'a-brand-new-secret');
    });

    test('checking a provider reports the problem in plain language', async function (assert) {
        const captured = captureComponent(this.owner, 'configure/oauth', ConfigureOauthComponent);
        await render(hbs`<div id="next-view-section-subheader-actions"></div><Configure::Oauth />`);
        await expandAll(this.element);

        await captured.instance.test.perform('apple');
        await settled();

        assert.strictEqual(this.posted.at(-1).path, 'settings/test-oauth-config');
        assert.deepEqual(this.posted.at(-1).payload, { provider: 'apple' });
        assert.dom(this.element).containsText('signing key could not be used');
    });

    test('it explains each check outcome', function (assert) {
        const component = Object.create(ConfigureOauthComponent.prototype);

        assert.strictEqual(component.testMessage(null), null);
        assert.true(component.testMessage({ problem: 'missing_credentials' }).includes('missing'));
        assert.true(component.testMessage({ configured: true, enabled: false, problem: null }).includes('Enable the provider'));
        assert.true(component.testMessage({ configured: true, enabled: true, problem: null }).includes('Register the callback URL'));
    });
});
