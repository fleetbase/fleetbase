import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import AccountConnectedAppsComponent from '@fleetbase/console/components/account/connected-apps';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';

const CONNECTED = [
    {
        id: 'ca_1',
        app: { name: 'AppHelm', logo_url: 'https://cdn.example.com/apphelm.png' },
        organization: { name: 'Acme' },
        last_used_at: '2026-10-01T12:00:00Z',
        scopes: [{ scope: 'organization:read', description: "See Acme's name" }],
    },
    {
        id: 'ca_2',
        app: { name: 'Fleet Tools' },
        organization: null,
        last_used_at: null,
        scopes: [],
    },
];

module('Integration | Component | account/connected-apps', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.owner.lookup('service:intl').setLocale('en-us');

        const self = this;
        this.calls = [];
        this.successes = [];
        this.serverErrors = [];
        this.confirmed = [];
        this.load = () => Promise.resolve({ connected_apps: CONNECTED });
        this.remove = () => Promise.resolve({});

        class FetchStub extends Service {
            get(path) {
                self.calls.push(['get', path]);
                return self.load();
            }
            delete(path) {
                self.calls.push(['delete', path]);
                return self.remove();
            }
        }
        class NotificationsStub extends Service {
            success(message) {
                self.successes.push(message);
            }
            serverError(error) {
                self.serverErrors.push(error);
            }
        }
        class ModalsManagerStub extends Service {
            confirm(options) {
                self.confirmed.push(options);
            }
        }

        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.owner.register('service:modals-manager', ModalsManagerStub);
    });

    test('it lists the apps the user authorized', async function (assert) {
        const captured = captureComponent(this.owner, 'account/connected-apps', AccountConnectedAppsComponent);

        await render(hbs`<Account::ConnectedApps />`);
        await captured.instance.load.perform();
        await settled();

        assert.deepEqual(this.calls[0], ['get', 'oauth-server/connected-apps']);
        assert.dom('[data-test-connected-apps]').containsText('AppHelm');
        assert.dom('[data-test-connected-apps]').containsText('Has access to Acme');
        assert.dom('[data-test-connected-apps]').containsText('Sign-in only');
        assert.dom('[data-test-connected-apps]').containsText('not used yet');
    });

    test('it renders nothing for a malformed or failed response', async function (assert) {
        const captured = captureComponent(this.owner, 'account/connected-apps', AccountConnectedAppsComponent);
        this.load = () => Promise.resolve({ connected_apps: 'nope' });

        await render(hbs`<Account::ConnectedApps />`);
        await captured.instance.load.perform();

        assert.deepEqual(captured.instance.apps, []);
        assert.dom('[data-test-connected-apps]').doesNotExist();

        captured.instance.apps = CONNECTED;
        this.load = () => Promise.reject(new Error('down'));
        await captured.instance.load.perform();

        assert.deepEqual(captured.instance.apps, [], 'a failed load is not fatal and shows nothing');
        assert.deepEqual(this.serverErrors, [], 'and is not reported');
    });

    test('formatDate shows a short date and leaves an unparseable value as it is', async function (assert) {
        const captured = captureComponent(this.owner, 'account/connected-apps', AccountConnectedAppsComponent);

        await render(hbs`<Account::ConnectedApps />`);

        assert.ok(captured.instance.formatDate('2026-10-01T12:00:00Z').includes('2026'));
        assert.strictEqual(captured.instance.formatDate('not a date'), 'not a date');
    });

    test('removing access asks first, then drops the app from the list', async function (assert) {
        const captured = captureComponent(this.owner, 'account/connected-apps', AccountConnectedAppsComponent);

        await render(hbs`<Account::ConnectedApps />`);
        await captured.instance.load.perform();

        captured.instance.confirmRevoke(CONNECTED[0]);
        const [options] = this.confirmed;
        assert.strictEqual(options.title, 'Remove AppHelm?');
        assert.strictEqual(options.acceptButtonText, 'Remove access');
        assert.strictEqual(options.acceptButtonScheme, 'danger');

        const log = [];
        await options.confirm({ startLoading: () => log.push('loading'), done: () => log.push('done') });

        assert.deepEqual(this.calls[this.calls.length - 1], ['delete', 'oauth-server/connected-apps/ca_1']);
        assert.deepEqual(
            captured.instance.apps.map((app) => app.id),
            ['ca_2']
        );
        assert.deepEqual(this.successes, ['AppHelm no longer has access.']);
        assert.deepEqual(log, ['loading', 'done']);
    });

    test('a refused removal is reported and keeps the app listed', async function (assert) {
        const captured = captureComponent(this.owner, 'account/connected-apps', AccountConnectedAppsComponent);
        const failure = new Error('nope');
        this.remove = () => Promise.reject(failure);

        await render(hbs`<Account::ConnectedApps />`);
        await captured.instance.load.perform();

        await captured.instance.revoke.perform(CONNECTED[0]);

        assert.strictEqual(captured.instance.apps.length, 2);
        assert.deepEqual(this.serverErrors, [failure]);
    });

    test('it starts with no apps', function (assert) {
        const component = Object.create(AccountConnectedAppsComponent.prototype);

        assert.deepEqual(component.apps, []);
    });
});
