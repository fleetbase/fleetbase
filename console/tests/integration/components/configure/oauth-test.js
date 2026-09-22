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
        auto_link: true,
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
                client_id: { label: 'Client ID', placeholder: '123-abc.apps.googleusercontent.com', required: true },
                client_secret: { label: 'Client Secret', placeholder: 'GOCSPX-…', secret: true, required: true },
                hosted_domain: { label: 'Restrict to Workspace domain', placeholder: 'example.com' },
            },
        },
        {
            id: 'apple',
            label: 'Apple',
            icon: 'apple',
            schema: {
                client_id: { label: 'Services ID', placeholder: 'com.example.signin', required: true },
                team_id: { label: 'Team ID', placeholder: 'A1B2C3D4E5', required: true },
                key_id: { label: 'Key ID', placeholder: 'ABC123DEFG', required: true },
                private_key: { label: 'Signing key (.p8)', placeholder: '-----BEGIN PRIVATE KEY-----', secret: true, required: true },
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
        this.checkResult = { configured: false, verified: false, problem: 'invalid_signing_key', message: 'The signing key could not be used to mint a client secret.' };
        const self = this;

        this.serverErrors = [];
        this.failures = {};

        class FetchStub extends Service {
            get(path) {
                if (self.failures[path]) {
                    return Promise.reject(self.failures[path]);
                }
                return Promise.resolve(JSON.parse(JSON.stringify(CONFIG)));
            }
            post(path, payload) {
                self.posted.push({ path, payload });

                if (self.failures[path]) {
                    return Promise.reject(self.failures[path]);
                }

                if (path === 'settings/test-oauth-config') {
                    return Promise.resolve({ provider: payload.provider, ...self.checkResult });
                }

                return Promise.resolve(JSON.parse(JSON.stringify(CONFIG)));
            }
        }
        class NotificationsStub extends Service {
            success() {}
            error() {}
            serverError(error) {
                self.serverErrors.push(error);
            }
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
        assert.true(saved.auto_link, 'automatic linking is sent with the global switches');
    });

    test('automatic linking can be switched off', async function (assert) {
        const captured = captureComponent(this.owner, 'configure/oauth', ConfigureOauthComponent);
        await render(hbs`<div id="next-view-section-subheader-actions"></div><Configure::Oauth />`);

        assert.dom(this.element).containsText('Link existing accounts automatically');
        captured.instance.autoLink = false;
        await click('#next-view-section-subheader-actions button');

        assert.false(this.posted.find((p) => p.path === 'settings/oauth-config').payload.auto_link);
    });

    test('saving sends a secret the admin typed', async function (assert) {
        await render(hbs`<div id="next-view-section-subheader-actions"></div><Configure::Oauth />`);

        await fillIn('input[type="password"]', 'a-brand-new-secret');
        await click('#next-view-section-subheader-actions button');

        const saved = this.posted.find((p) => p.path === 'settings/oauth-config').payload;

        assert.strictEqual(saved.providers.google.client_secret, 'a-brand-new-secret');
    });

    test('checking a provider reports what the server found', async function (assert) {
        const captured = captureComponent(this.owner, 'configure/oauth', ConfigureOauthComponent);
        await render(hbs`<div id="next-view-section-subheader-actions"></div><Configure::Oauth />`);
        await expandAll(this.element);

        await captured.instance.test.perform('apple');
        await settled();

        assert.strictEqual(this.posted.at(-1).path, 'settings/test-oauth-config');
        assert.strictEqual(this.posted.at(-1).payload.provider, 'apple');
        assert.dom(this.element).containsText('signing key could not be used');
    });

    test('checking sends what is in the form, before it is saved', async function (assert) {
        const captured = captureComponent(this.owner, 'configure/oauth', ConfigureOauthComponent);
        await render(hbs`<div id="next-view-section-subheader-actions"></div><Configure::Oauth />`);

        await fillIn('input[type="password"]', 'typed-not-saved');
        await captured.instance.test.perform('google');

        assert.deepEqual(this.posted.at(-1).payload, {
            provider: 'google',
            values: { client_id: 'google-client-id', client_secret: 'typed-not-saved', hosted_domain: '' },
        });
        assert.notOk(
            this.posted.some((p) => p.path === 'settings/oauth-config'),
            'nothing was saved to run the check'
        );
    });

    test('a blank secret is left out of the check so the saved one is used', async function (assert) {
        const captured = captureComponent(this.owner, 'configure/oauth', ConfigureOauthComponent);
        await render(hbs`<div id="next-view-section-subheader-actions"></div><Configure::Oauth />`);

        await captured.instance.test.perform('google');

        assert.notOk('client_secret' in this.posted.at(-1).payload.values);
    });

    test('typing into a provider field keeps its panel open', async function (assert) {
        await render(hbs`<div id="next-view-section-subheader-actions"></div><Configure::Oauth />`);
        await expandAll(this.element);

        // Apple is disabled, so its panel only stays open if typing does not reset it.
        const teamId = [...this.element.querySelectorAll('.next-content-panel-wrapper')].find((panel) => panel.textContent.includes('Team ID')).querySelector('input[type="text"]');
        await fillIn(teamId, 'T');
        await fillIn(teamId, 'TE');

        assert.dom(this.element).containsText('Signing key (.p8)');
        assert.strictEqual(this.element.querySelectorAll('.next-content-panel-header.next-content-panel-is-closed').length, 0);
    });

    test('saving keeps opened panels open', async function (assert) {
        await render(hbs`<div id="next-view-section-subheader-actions"></div><Configure::Oauth />`);
        await expandAll(this.element);

        await click('#next-view-section-subheader-actions button');

        assert.dom(this.element).containsText('Signing key (.p8)', 'the disabled provider the admin opened is still open');
        assert.strictEqual(this.element.querySelectorAll('.next-content-panel-header.next-content-panel-is-closed').length, 0);
    });

    test('every field shows a placeholder', async function (assert) {
        await render(hbs`<div id="next-view-section-subheader-actions"></div><Configure::Oauth />`);
        await expandAll(this.element);

        const editable = [...this.element.querySelectorAll('.next-content-panel-body input:not([readonly]), .next-content-panel-body textarea')].filter((input) => input.type !== 'checkbox');

        assert.ok(editable.length >= 7, 'every provider field is rendered');
        editable.forEach((input, index) => assert.notStrictEqual(input.placeholder, '', `field ${index + 1} has a placeholder`));
    });

    test('a provider can only be switched on after the provider accepts its credentials', async function (assert) {
        const captured = captureComponent(this.owner, 'configure/oauth', ConfigureOauthComponent);
        await render(hbs`<div id="next-view-section-subheader-actions"></div><Configure::Oauth />`);
        await expandAll(this.element);
        const component = captured.instance;

        assert.false(component.canToggleProvider('apple'), 'not before a check');
        assert.dom(this.element).containsText('to confirm Apple accepts these credentials');

        await component.test.perform('apple');
        assert.false(component.canToggleProvider('apple'), 'not after a failed check');

        this.checkResult = { configured: true, verified: true, problem: null, message: 'Apple accepted these credentials.' };
        await component.test.perform('apple');
        await settled();
        assert.true(component.canToggleProvider('apple'), 'after a passing check');
        assert.dom(this.element).doesNotContainText('to confirm Apple accepts these credentials');

        component.updateField('apple', 'key_id', 'CHANGED');
        assert.false(component.canToggleProvider('apple'), 'editing a credential invalidates the check');
    });

    test('a live provider can always be switched off', async function (assert) {
        const captured = captureComponent(this.owner, 'configure/oauth', ConfigureOauthComponent);
        await render(hbs`<div id="next-view-section-subheader-actions"></div><Configure::Oauth />`);

        assert.true(captured.instance.canToggleProvider('google'), 'google is enabled in the fixture');
    });

    test('a configuration that fails to load is reported', async function (assert) {
        const failure = new Error('settings unavailable');
        this.failures['settings/oauth-config'] = failure;

        await render(hbs`<div id="next-view-section-subheader-actions"></div><Configure::Oauth />`);

        assert.deepEqual(this.serverErrors, [failure]);
    });

    test('a save the server refuses is reported and leaves the form as it was', async function (assert) {
        const captured = captureComponent(this.owner, 'configure/oauth', ConfigureOauthComponent);
        await render(hbs`<div id="next-view-section-subheader-actions"></div><Configure::Oauth />`);
        const failure = { code: 'oauth_provider_check_failed', message: 'Google rejected these credentials.' };
        this.failures['settings/oauth-config'] = failure;

        await captured.instance.save.perform();

        assert.deepEqual(this.serverErrors, [failure]);
        assert.strictEqual(captured.instance.values.google.client_id, 'google-client-id', 'nothing was reset');
    });

    test('a check that cannot reach the server is reported', async function (assert) {
        const captured = captureComponent(this.owner, 'configure/oauth', ConfigureOauthComponent);
        await render(hbs`<div id="next-view-section-subheader-actions"></div><Configure::Oauth />`);
        const failure = new Error('network down');
        this.failures['settings/test-oauth-config'] = failure;

        await captured.instance.test.perform('google');

        assert.deepEqual(this.serverErrors, [failure]);
        assert.notOk(captured.instance.testResults.google, 'no result is recorded');
    });

    test('the offer toggle switches a provider on and off', async function (assert) {
        const captured = captureComponent(this.owner, 'configure/oauth', ConfigureOauthComponent);
        await render(hbs`<div id="next-view-section-subheader-actions"></div><Configure::Oauth />`);
        const component = captured.instance;

        component.toggleProvider('google', false);
        assert.false(component.isProviderEnabled('google'));

        component.toggleProvider('google', true);
        assert.true(component.isProviderEnabled('google'));
    });

    test('fields fall back to their key, no placeholder and no help, and a provider may have no schema', function (assert) {
        const component = Object.create(ConfigureOauthComponent.prototype);

        assert.deepEqual(component.fieldsFor({ id: 'okta', schema: { domain: {} } }), [
            { key: 'domain', label: 'domain', placeholder: '', help: null, secret: false, required: false, multiline: false },
        ]);
        assert.deepEqual(component.fieldsFor({ id: 'okta' }), []);
        assert.deepEqual(component.fieldsFor(undefined), []);
    });

    test('a saved secret with no hint still says it is saved', async function (assert) {
        const captured = captureComponent(this.owner, 'configure/oauth', ConfigureOauthComponent);
        await render(hbs`<div id="next-view-section-subheader-actions"></div><Configure::Oauth />`);
        const component = captured.instance;
        component.secretStatus = { google: { client_secret: { configured: true, hint: null } } };

        assert.strictEqual(component.placeholderFor('google', { key: 'client_secret', secret: true, placeholder: 'GOCSPX-…' }), 'Saved (••••) — leave blank to keep');
        assert.strictEqual(component.placeholderFor('apple', { key: 'private_key', secret: true, placeholder: '-----BEGIN' }), '-----BEGIN', 'nothing saved: the example');
    });

    test('it starts from empty settings with sign-in, sign-ups and automatic linking on', function (assert) {
        // Tracked defaults run lazily on first read. Each of these is assigned before it is
        // ever read in normal use, so read them fresh here to pin the defaults.
        const component = Object.create(ConfigureOauthComponent.prototype);

        assert.true(component.enabled);
        assert.true(component.allowRegistration);
        assert.true(component.autoLink);
        assert.deepEqual(component.providers, []);
        assert.deepEqual(component.values, {});
        assert.deepEqual(component.secretStatus, {});
        assert.deepEqual(component.redirectUris, {});
        assert.deepEqual(component.testResults, {});
        assert.deepEqual(component.savedEnabled, {});
        assert.deepEqual(component.panelOpen, {});
    });
});
