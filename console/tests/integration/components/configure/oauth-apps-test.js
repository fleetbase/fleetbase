import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import ConfigureOauthAppsComponent from '@fleetbase/console/components/configure/oauth-apps';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';

const APP = {
    id: 'client_1',
    name: 'AppHelm',
    description: 'Fleet dashboards',
    redirect_uris: ['https://app.example.com/cb', 'https://app.example.com/cb2'],
    allowed_scopes: ['openid', 'organization:read'],
    logo_url: 'https://cdn.example.com/apphelm.png',
    website_url: 'https://app.example.com',
    official: true,
    development: false,
    confidential: true,
    active_grants_count: 2,
    disabled_at: null,
};

const SCOPES = [
    { scope: 'openid', description: 'Sign you in' },
    { scope: 'organization:read', description: 'See your organization' },
];

const MODAL = (log) => ({
    startLoading: () => log.push('loading'),
    done: () => log.push('done'),
});

module('Integration | Component | configure/oauth-apps', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        const self = this;
        this.calls = [];
        this.successes = [];
        this.serverErrors = [];
        this.confirmed = [];
        this.handlers = {
            'get oauth-server/apps': () => Promise.resolve({ apps: [APP], scopes: SCOPES }),
        };
        this.reply = (method, path, body) => {
            self.calls.push([method, path, body]);
            const handler = self.handlers[`${method} ${path}`];
            return handler ? handler(body) : Promise.resolve({});
        };

        class FetchStub extends Service {
            uploadFile = {
                perform: (file, options, onSuccess, onError) => {
                    self.uploaded = { file, options };
                    return self.upload(onSuccess, onError);
                },
            };
            get(path) {
                return self.reply('get', path);
            }
            post(path, body) {
                return self.reply('post', path, body);
            }
            put(path, body) {
                return self.reply('put', path, body);
            }
            delete(path) {
                return self.reply('delete', path);
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

    test('it lists the registered apps and the scopes an app can be given', async function (assert) {
        const captured = captureComponent(this.owner, 'configure/oauth-apps', ConfigureOauthAppsComponent);

        await render(hbs`<Configure::OauthApps />`);
        await captured.instance.load.perform();

        assert.deepEqual(captured.instance.apps, [APP]);
        assert.deepEqual(captured.instance.scopes, SCOPES);
        assert.dom('[data-test-oauth-app]').exists({ count: 1 });
        assert.dom('[data-test-oauth-app]').containsText('AppHelm');
    });

    test('an empty or failed load leaves an empty list', async function (assert) {
        const captured = captureComponent(this.owner, 'configure/oauth-apps', ConfigureOauthAppsComponent);
        this.handlers['get oauth-server/apps'] = () => Promise.resolve({});

        await render(hbs`<Configure::OauthApps />`);
        await captured.instance.load.perform();

        assert.deepEqual(captured.instance.apps, []);
        assert.deepEqual(captured.instance.scopes, []);
        assert.dom(this.element).containsText('No apps yet.');

        const failure = new Error('down');
        this.handlers['get oauth-server/apps'] = () => Promise.reject(failure);
        await captured.instance.load.perform();

        assert.deepEqual(this.serverErrors, [failure]);
    });

    test('registering an app sends a clean payload and shows its secret once', async function (assert) {
        const captured = captureComponent(this.owner, 'configure/oauth-apps', ConfigureOauthAppsComponent);
        this.handlers['post oauth-server/apps'] = () => Promise.resolve({ app: { id: 'client_2', name: 'Fleet Tools' }, client_secret: 's3cret' });

        await render(hbs`<Configure::OauthApps />`);
        const component = captured.instance;

        component.startCreate();
        await settled();
        assert.dom('[data-test-oauth-app-form]').exists();
        assert.false(component.hasScope('openid'));

        component.setField('name', { target: { value: 'Fleet Tools' } });
        component.setField('description', '   ');
        component.setField('redirect_uris', ' https://tools.example.com/cb\n\nhttps://tools.example.com/cb2 ');
        component.setField('website_url', 'https://tools.example.com');
        component.setField('privacy_url', null);
        component.setField('development', true);
        component.toggleScope('openid');
        component.toggleScope('organization:read');
        component.toggleScope('organization:read');
        assert.true(component.hasScope('openid'));
        assert.false(component.hasScope('organization:read'), 'toggling twice takes the scope off again');

        await component.save.perform();

        const [, path, body] = this.calls.find(([method]) => method === 'post');
        assert.strictEqual(path, 'oauth-server/apps');
        assert.deepEqual(body, {
            name: 'Fleet Tools',
            description: null,
            redirect_uris: ['https://tools.example.com/cb', 'https://tools.example.com/cb2'],
            allowed_scopes: ['openid'],
            logo_url: null,
            website_url: 'https://tools.example.com',
            privacy_url: null,
            terms_url: null,
            official: false,
            development: true,
            confidential: true,
        });
        assert.deepEqual(component.revealedSecret, { app: { id: 'client_2', name: 'Fleet Tools' }, secret: 's3cret' });
        assert.strictEqual(component.form, null, 'the form closes');
        assert.deepEqual(this.successes, ['App registered.']);

        await settled();
        assert.dom('[data-test-oauth-app-secret]').containsText('s3cret');

        component.dismissSecret();
        assert.strictEqual(component.revealedSecret, null);
    });

    test('editing an app fills the form from it and saves with PUT', async function (assert) {
        const captured = captureComponent(this.owner, 'configure/oauth-apps', ConfigureOauthAppsComponent);

        await render(hbs`<Configure::OauthApps />`);
        const component = captured.instance;

        component.startEdit(APP);
        assert.strictEqual(component.form.redirect_uris, 'https://app.example.com/cb\nhttps://app.example.com/cb2');
        assert.deepEqual(component.form.allowed_scopes, ['openid', 'organization:read']);
        assert.notStrictEqual(component.form.allowed_scopes, APP.allowed_scopes, 'a copy, so cancelling leaves the app untouched');
        await settled();
        assert.dom('[data-test-oauth-app-form]').containsText('Edit AppHelm');

        await component.save.perform();

        const [, path, body] = this.calls.find(([method]) => method === 'put');
        assert.strictEqual(path, 'oauth-server/apps/client_1');
        assert.deepEqual(body.redirect_uris, APP.redirect_uris);
        assert.strictEqual(body.logo_url, APP.logo_url);
        assert.deepEqual(this.successes, ['App updated.']);
        assert.strictEqual(component.revealedSecret, null, 'no secret is shown for an edit');
        assert.strictEqual(component.editing, null);
    });

    test('an app without redirect URIs or scopes still opens for editing', async function (assert) {
        const captured = captureComponent(this.owner, 'configure/oauth-apps', ConfigureOauthAppsComponent);

        await render(hbs`<Configure::OauthApps />`);
        const component = captured.instance;

        component.startEdit({ id: 'client_3', name: 'Bare', redirect_uris: null, allowed_scopes: null });

        assert.strictEqual(component.form.redirect_uris, '');
        assert.deepEqual(component.form.allowed_scopes, []);

        component.cancelForm();
        assert.strictEqual(component.form, null);
        assert.strictEqual(component.editing, null);
        assert.false(component.hasScope('openid'), 'no form, no scopes');
    });

    test('a missing redirect URI list serializes to an empty list', async function (assert) {
        const captured = captureComponent(this.owner, 'configure/oauth-apps', ConfigureOauthAppsComponent);

        await render(hbs`<Configure::OauthApps />`);
        const component = captured.instance;

        component.startCreate();
        component.setField('redirect_uris', null);

        assert.deepEqual(component.serialize().redirect_uris, []);
    });

    test('a save the API refuses keeps the form open', async function (assert) {
        const captured = captureComponent(this.owner, 'configure/oauth-apps', ConfigureOauthAppsComponent);
        const failure = new Error('invalid');
        this.handlers['post oauth-server/apps'] = () => Promise.reject(failure);

        await render(hbs`<Configure::OauthApps />`);
        const component = captured.instance;

        component.startCreate();
        component.setField('name', 'Broken');
        await component.save.perform();

        assert.deepEqual(this.serverErrors, [failure]);
        assert.strictEqual(component.form.name, 'Broken');
    });

    test('a logo upload keeps the public URL, and Remove clears it', async function (assert) {
        const captured = captureComponent(this.owner, 'configure/oauth-apps', ConfigureOauthAppsComponent);
        this.upload = (onSuccess) => {
            assert.true(captured.instance.isUploadingLogo, 'uploading while the file is sent');
            onSuccess({ url: 'https://cdn.example.com/logo.png' });
            return 'uploaded';
        };

        await render(hbs`<Configure::OauthApps />`);
        const component = captured.instance;
        component.startCreate();

        assert.strictEqual(component.uploadLogo('file'), 'uploaded');
        assert.deepEqual(this.uploaded, { file: 'file', options: { path: 'uploads/system/oauth-apps', type: 'system' } });
        assert.strictEqual(component.form.logo_url, 'https://cdn.example.com/logo.png');
        assert.false(component.isUploadingLogo);

        await settled();
        assert.dom('[data-test-oauth-app-logo-preview]').exists();

        component.removeLogo();
        assert.strictEqual(component.form.logo_url, '');
    });

    test('a failed logo upload is reported and unblocks saving', async function (assert) {
        const captured = captureComponent(this.owner, 'configure/oauth-apps', ConfigureOauthAppsComponent);
        const failure = new Error('too big');
        this.upload = (onSuccess, onError) => onError(failure);

        await render(hbs`<Configure::OauthApps />`);
        const component = captured.instance;
        component.startCreate();

        component.uploadLogo('file');

        assert.false(component.isUploadingLogo);
        assert.deepEqual(this.serverErrors, [failure]);
        assert.strictEqual(component.form.logo_url, '');
    });

    test('rotating a secret asks first, then shows the new secret', async function (assert) {
        const captured = captureComponent(this.owner, 'configure/oauth-apps', ConfigureOauthAppsComponent);
        this.handlers['post oauth-server/apps/client_1/rotate-secret'] = () => Promise.resolve({ app: APP, client_secret: 'n3w' });

        await render(hbs`<Configure::OauthApps />`);
        const component = captured.instance;

        component.confirmRotate(APP);
        const [options] = this.confirmed;
        assert.strictEqual(options.title, 'Rotate the secret for AppHelm?');
        assert.strictEqual(options.acceptButtonScheme, 'danger');

        const log = [];
        await options.confirm(MODAL(log));

        assert.deepEqual(component.revealedSecret, { app: APP, secret: 'n3w' });
        assert.deepEqual(log, ['loading', 'done']);
    });

    test('a refused rotation is reported and the modal still closes', async function (assert) {
        const captured = captureComponent(this.owner, 'configure/oauth-apps', ConfigureOauthAppsComponent);
        const failure = new Error('nope');
        this.handlers['post oauth-server/apps/client_1/rotate-secret'] = () => Promise.reject(failure);

        await render(hbs`<Configure::OauthApps />`);
        captured.instance.confirmRotate(APP);

        const log = [];
        await this.confirmed[0].confirm(MODAL(log));

        assert.deepEqual(this.serverErrors, [failure]);
        assert.strictEqual(captured.instance.revealedSecret, null);
        assert.deepEqual(log, ['loading', 'done']);
    });

    test('turning an app off warns about signed-in users, and turning it back on does not', async function (assert) {
        const captured = captureComponent(this.owner, 'configure/oauth-apps', ConfigureOauthAppsComponent);

        await render(hbs`<Configure::OauthApps />`);
        const component = captured.instance;

        component.confirmToggle(APP);
        component.confirmToggle({ ...APP, disabled_at: '2026-10-01T00:00:00Z' });
        const [off, on] = this.confirmed;

        assert.strictEqual(off.title, 'Turn off AppHelm?');
        assert.strictEqual(off.acceptButtonText, 'Turn off');
        assert.strictEqual(off.acceptButtonScheme, 'danger');
        assert.ok(off.body.includes('signed out'));
        assert.strictEqual(on.title, 'Turn AppHelm back on?');
        assert.strictEqual(on.acceptButtonText, 'Turn on');
        assert.strictEqual(on.acceptButtonScheme, 'primary');
        assert.strictEqual(on.body, 'People can authorize the app again.');

        const log = [];
        await off.confirm(MODAL(log));
        await on.confirm(MODAL(log));

        const posts = this.calls.filter(([method]) => method === 'post').map(([, path]) => path);
        assert.deepEqual(posts, ['oauth-server/apps/client_1/disable', 'oauth-server/apps/client_1/enable']);
        assert.strictEqual(this.calls.filter(([method, path]) => method === 'get' && path === 'oauth-server/apps').length, 3, 'the list reloads after each');
        assert.deepEqual(log, ['loading', 'done', 'loading', 'done']);
    });

    test('a refused toggle is reported and the modal still closes', async function (assert) {
        const captured = captureComponent(this.owner, 'configure/oauth-apps', ConfigureOauthAppsComponent);
        const failure = new Error('nope');
        this.handlers['post oauth-server/apps/client_1/disable'] = () => Promise.reject(failure);

        await render(hbs`<Configure::OauthApps />`);
        captured.instance.confirmToggle(APP);

        const log = [];
        await this.confirmed[0].confirm(MODAL(log));

        assert.deepEqual(this.serverErrors, [failure]);
        assert.deepEqual(log, ['loading', 'done']);
    });

    test('it lists who authorized an app and revokes one', async function (assert) {
        const captured = captureComponent(this.owner, 'configure/oauth-apps', ConfigureOauthAppsComponent);
        const grants = [
            { id: 'g1', user: { name: 'Olive', email: 'olive@example.com' }, organization: { name: 'Acme' } },
            { id: 'g2', user: { name: 'Pat', email: 'pat@example.com' }, organization: null },
        ];
        this.handlers['get oauth-server/apps/client_1/grants'] = () => Promise.resolve({ grants });

        await render(hbs`<Configure::OauthApps />`);
        await captured.instance.load.perform();
        const component = captured.instance;

        await component.showGrants.perform(APP);
        await settled();

        assert.strictEqual(component.grantsFor, APP);
        assert.deepEqual(component.grants, grants);
        assert.dom('[data-test-oauth-app-grants]').containsText('Olive');
        assert.dom('[data-test-oauth-app-grants]').containsText('Sign-in only');

        await component.revokeGrant.perform(grants[0]);

        assert.deepEqual(this.calls[this.calls.length - 1], ['delete', 'oauth-server/grants/g1', undefined]);
        assert.deepEqual(component.grants, [grants[1]]);
        assert.deepEqual(this.successes, ['Access revoked.']);

        component.hideGrants();
        assert.strictEqual(component.grantsFor, null);
        assert.deepEqual(component.grants, []);
    });

    test('an app nobody authorized, or a failed grants load, shows no grants', async function (assert) {
        const captured = captureComponent(this.owner, 'configure/oauth-apps', ConfigureOauthAppsComponent);
        this.handlers['get oauth-server/apps/client_1/grants'] = () => Promise.resolve({});

        await render(hbs`<Configure::OauthApps />`);
        await captured.instance.load.perform();
        const component = captured.instance;

        await component.showGrants.perform(APP);
        await settled();
        assert.deepEqual(component.grants, []);
        assert.dom('[data-test-oauth-app-grants]').containsText('Nobody has authorized this app yet.');

        const failure = new Error('down');
        this.handlers['get oauth-server/apps/client_1/grants'] = () => Promise.reject(failure);
        await component.showGrants.perform(APP);

        assert.deepEqual(component.grants, []);
        assert.deepEqual(this.serverErrors, [failure]);
    });

    test('a refused revoke keeps the grant listed', async function (assert) {
        const captured = captureComponent(this.owner, 'configure/oauth-apps', ConfigureOauthAppsComponent);
        const failure = new Error('nope');
        this.handlers['delete oauth-server/grants/g1'] = () => Promise.reject(failure);

        await render(hbs`<Configure::OauthApps />`);
        const component = captured.instance;
        component.grants = [{ id: 'g1' }];

        await component.revokeGrant.perform({ id: 'g1' });

        assert.deepEqual(component.grants, [{ id: 'g1' }]);
        assert.deepEqual(this.serverErrors, [failure]);
    });

    test('joined lists redirect URIs on one line, and tolerates none', async function (assert) {
        const captured = captureComponent(this.owner, 'configure/oauth-apps', ConfigureOauthAppsComponent);

        await render(hbs`<Configure::OauthApps />`);

        assert.strictEqual(captured.instance.joined(['a', 'b']), 'a b');
        assert.strictEqual(captured.instance.joined(null), '');
    });

    test('it starts with nothing loaded, open or revealed', function (assert) {
        // Tracked defaults run lazily on first read; read them fresh to pin them.
        const component = Object.create(ConfigureOauthAppsComponent.prototype);

        assert.deepEqual(component.apps, []);
        assert.deepEqual(component.scopes, []);
        assert.strictEqual(component.form, null);
        assert.strictEqual(component.editing, null);
        assert.strictEqual(component.revealedSecret, null);
        assert.strictEqual(component.grantsFor, null);
        assert.deepEqual(component.grants, []);
        assert.false(component.isUploadingLogo);
    });
});
