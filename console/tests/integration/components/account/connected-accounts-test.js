import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import ConnectedAccountsComponent from '@fleetbase/console/components/account/connected-accounts';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';

module('Integration | Component | account/connected-accounts', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.owner.lookup('service:intl').setLocale('en-us');

        const self = this;
        this.payload = {
            identities: [{ provider: 'google', label: 'Google', icon: 'google', provider_email: 'ada@example.com' }],
            available: [{ id: 'github', label: 'GitHub', icon: 'github' }],
            has_password: true,
        };
        this.linked = [];
        this.unlinked = [];

        class OauthStub extends Service {
            loadIdentities() {
                return Promise.resolve(self.payload);
            }
            startLink(id) {
                self.linked.push(id);
                return Promise.resolve();
            }
            unlink(id) {
                self.unlinked.push(id);
                return self.unlinkResult ? self.unlinkResult() : Promise.resolve({ identities: [], available: [], has_password: true });
            }
        }
        class NotificationsStub extends Service {
            errors = [];
            success() {}
            error(m) {
                self.errors = [...(self.errors ?? []), m];
            }
        }

        this.owner.register('service:oauth', OauthStub);
        this.owner.register('service:notifications', NotificationsStub);
    });

    test('it lists linked providers and offers the ones not yet linked', async function (assert) {
        await render(hbs`<Account::ConnectedAccounts />`);

        assert.dom(this.element).containsText('Google');
        assert.dom(this.element).containsText('ada@example.com');
        assert.dom(this.element).containsText('GitHub');
    });

    test('it renders nothing when no provider is linked or enabled', async function (assert) {
        this.payload = { identities: [], available: [], has_password: true };

        await render(hbs`<Account::ConnectedAccounts />`);

        // An install that has not turned OAuth on sees the account page exactly as before.
        assert.dom('.next-content-panel').doesNotExist();
    });

    test('it renders nothing when the endpoint is unreachable', async function (assert) {
        this.owner.lookup('service:oauth').loadIdentities = () => Promise.reject(new Error('down'));

        await render(hbs`<Account::ConnectedAccounts />`);

        assert.dom('.next-content-panel').doesNotExist();
    });

    test('it disables unlinking the only way a user can sign in', async function (assert) {
        const captured = captureComponent(this.owner, 'account/connected-accounts', ConnectedAccountsComponent);
        this.payload = {
            identities: [{ provider: 'google', label: 'Google', icon: 'google' }],
            available: [],
            has_password: false,
        };

        await render(hbs`<Account::ConnectedAccounts />`);

        const component = captured.instance;
        assert.true(component.isLastCredential(component.identities[0]), 'no password and one provider');

        component.hasPassword = true;
        assert.false(component.isLastCredential(component.identities[0]), 'a password is another way in');
    });

    test('linking starts the provider handshake', async function (assert) {
        const captured = captureComponent(this.owner, 'account/connected-accounts', ConnectedAccountsComponent);
        await render(hbs`<Account::ConnectedAccounts />`);

        await captured.instance.link.perform({ id: 'github' });

        assert.deepEqual(this.linked, ['github']);
    });

    test('unlinking refreshes the list from the API response', async function (assert) {
        const captured = captureComponent(this.owner, 'account/connected-accounts', ConnectedAccountsComponent);
        await render(hbs`<Account::ConnectedAccounts />`);

        await captured.instance.unlink.perform({ provider: 'google', label: 'Google' });

        assert.deepEqual(this.unlinked, ['google']);
        assert.deepEqual(captured.instance.identities, []);
    });

    test('it explains a refused unlink in plain language', async function (assert) {
        const captured = captureComponent(this.owner, 'account/connected-accounts', ConnectedAccountsComponent);
        this.unlinkResult = () => Promise.reject({ code: 'last_credential' });
        await render(hbs`<Account::ConnectedAccounts />`);

        await captured.instance.unlink.perform({ provider: 'google', label: 'Google' });

        assert.strictEqual(captured.instance.messageFor({ code: 'last_credential' }), 'auth.login.oauth.errors.last-credential');
        assert.strictEqual(captured.instance.messageFor({ code: 'something-else' }), 'auth.login.oauth.errors.generic');
        assert.strictEqual(this.errors.length, 1);
    });
});
