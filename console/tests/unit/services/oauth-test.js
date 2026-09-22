import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';
import window from 'ember-window-mock';
import config from '@fleetbase/console/config/environment';
import OauthService from '@fleetbase/console/services/oauth';

module('Unit | Service | oauth', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        const self = this;
        this.getCalls = [];
        this.getResult = () => Promise.resolve({ providers: [{ id: 'google', label: 'Google', icon: 'google' }] });

        this.requests = [];

        class FetchStub extends Service {
            get(path) {
                self.getCalls.push(path);
                return self.getResult();
            }
            post(path, body, options) {
                self.requests.push(['post', path, body, options]);
                return Promise.resolve(path.endsWith('/link') ? { redirect_url: 'https://accounts.google.com/o/oauth2/auth?state=abc' } : { identities: [] });
            }
            delete(path, body, options) {
                self.requests.push(['delete', path, body, options]);
                return Promise.resolve({ identities: [] });
            }
        }

        this.owner.register('service:fetch', FetchStub);
    });

    test('it loads enabled providers from the api', async function (assert) {
        const service = this.owner.lookup('service:oauth');

        assert.false(service.isEnabled, 'nothing is offered before the list loads');

        const providers = await service.loadProviders();

        assert.deepEqual(this.getCalls, ['auth/oauth/providers']);
        assert.deepEqual(providers, [{ id: 'google', label: 'Google', icon: 'google' }]);
        assert.true(service.isEnabled);
    });

    test('it offers sign-up buttons only when sign-ups are open', async function (assert) {
        const service = this.owner.lookup('service:oauth');

        this.getResult = () => Promise.resolve({ providers: [{ id: 'google', label: 'Google', icon: 'google' }], allow_registration: true });
        await service.loadProviders();
        assert.true(service.canSignUp);

        this.getResult = () => Promise.resolve({ providers: [{ id: 'google', label: 'Google', icon: 'google' }], allow_registration: false });
        await service.loadProviders();
        assert.false(service.canSignUp, 'closed sign-ups hide them');

        this.getResult = () => Promise.resolve({ providers: [], allow_registration: true });
        await service.loadProviders();
        assert.false(service.canSignUp, 'no provider, nothing to offer');
    });

    test('an api that does not say treats sign-ups as closed', async function (assert) {
        this.getResult = () => Promise.resolve({ providers: [{ id: 'google', label: 'Google', icon: 'google' }] });
        const service = this.owner.lookup('service:oauth');

        await service.loadProviders();

        // An older API: the login page still offers the provider, the sign-up page doesn't.
        assert.true(service.isEnabled);
        assert.false(service.canSignUp);
    });

    test('an unreachable endpoint leaves sign-in working without oauth', async function (assert) {
        this.getResult = () => Promise.reject(new Error('network down'));
        const service = this.owner.lookup('service:oauth');

        await service.loadProviders();

        // A console that cannot reach the endpoint must still render the
        // email/password form rather than erroring out of beforeModel.
        assert.deepEqual(service.providers, []);
        assert.false(service.isEnabled);
    });

    test('a malformed payload is treated as no providers', async function (assert) {
        this.getResult = () => Promise.resolve({ providers: 'not-an-array' });
        const service = this.owner.lookup('service:oauth');

        await service.loadProviders();

        assert.deepEqual(service.providers, []);
    });

    test('it builds the authorization url against the api host', function (assert) {
        const service = this.owner.lookup('service:oauth');
        const url = new URL(service.authorizationUrl('google', { intent: 'login' }));

        assert.strictEqual(url.origin, new URL(service.apiHost).origin);
        assert.true(url.pathname.endsWith(`${config.API.namespace}/auth/oauth/google/redirect`));
        assert.strictEqual(url.searchParams.get('intent'), 'login');
        assert.strictEqual(url.searchParams.get('return_to'), null, 'omitted when not supplied');
    });

    test('it passes a return path through and escapes the provider id', function (assert) {
        const service = this.owner.lookup('service:oauth');

        const withReturn = new URL(service.authorizationUrl('google', { intent: 'signup', returnTo: '/orders?status=open' }));
        assert.strictEqual(withReturn.searchParams.get('return_to'), '/orders?status=open');
        assert.strictEqual(withReturn.searchParams.get('intent'), 'signup');

        assert.true(service.authorizationUrl('../evil').includes('..%2Fevil'), 'provider id is encoded, not interpolated raw');
    });

    test('starting authorization navigates rather than fetching', function (assert) {
        const service = this.owner.lookup('service:oauth');

        service.startAuthorization('google', { intent: 'login', returnTo: '/dashboard' });

        // Must be a top-level navigation: the endpoint answers 302 to the provider,
        // and an XHR would follow that cross-origin and fail CORS instead.
        assert.true(String(window.location.href).includes('auth/oauth/google/redirect'));
        assert.deepEqual(this.getCalls, [], 'no XHR is issued');
    });

    test('it holds a registration intent in memory only', function (assert) {
        const service = this.owner.lookup('service:oauth');

        service.setRegistration({ intent: 'rti_abc', prefill: { email: 'ada@example.com' } });
        assert.strictEqual(service.registration.intent, 'rti_abc');

        // The intent is a bearer credential; it must not outlive the tab.
        assert.strictEqual(window.localStorage.getItem('oauth:registration'), null);

        service.clearRegistration();
        assert.strictEqual(service.registration, null);
    });

    test('a second load while one is in flight reuses it instead of fetching again', async function (assert) {
        let release;
        this.getResult = () => new Promise((resolve) => (release = () => resolve({ providers: [{ id: 'google' }], allow_registration: true })));
        const service = this.owner.lookup('service:oauth');

        const first = service.loadProviders();
        const second = await service.loadProviders();

        assert.deepEqual(second, [], 'the second call returns what is loaded so far');
        release();
        await first;
        assert.deepEqual(this.getCalls, ['auth/oauth/providers'], 'only one request was made');
        assert.deepEqual(service.providers, [{ id: 'google' }]);
    });

    test('with no configured API host it uses the page origin', function (assert) {
        const service = this.owner.lookup('service:oauth');
        const host = config.API.host;

        try {
            config.API.host = '';
            assert.strictEqual(service.apiHost, `${window.location.protocol}//${window.location.host}`);
        } finally {
            config.API.host = host;
        }
    });

    test('it loads the signed-in user identities', async function (assert) {
        this.getResult = () => Promise.resolve({ identities: [], available: [], has_password: true });
        const service = this.owner.lookup('service:oauth');

        assert.deepEqual(await service.loadIdentities(), { identities: [], available: [], has_password: true });
        assert.deepEqual(this.getCalls, ['auth/oauth/identities']);
    });

    test('starting a link asks the API for the provider URL and navigates to it', async function (assert) {
        const service = this.owner.lookup('service:oauth');

        await service.startLink('google');

        // The endpoint needs the bearer token, so it is fetched rather than navigated to.
        assert.deepEqual(this.requests, [['post', 'auth/oauth/google/link', {}, { rawError: true }]]);
        assert.strictEqual(String(window.location.href), 'https://accounts.google.com/o/oauth2/auth?state=abc');
    });

    test('completing a link sends the handoff code to the protected endpoint', async function (assert) {
        const service = this.owner.lookup('service:oauth');

        await service.completeLink('handoff-code');

        assert.deepEqual(this.requests, [['post', 'auth/oauth/link/complete', { code: 'handoff-code' }, { rawError: true }]]);
    });

    test('unlinking deletes the provider, with its id escaped', async function (assert) {
        const service = this.owner.lookup('service:oauth');

        await service.unlink('../evil');

        assert.deepEqual(this.requests, [['delete', 'auth/oauth/..%2Fevil/unlink', {}, { rawError: true }]]);
    });

    test('it starts with no providers, sign-ups closed and nothing in flight', function (assert) {
        // Tracked defaults run lazily on first read. Each of these is assigned before it is
        // ever read in normal use, so read them fresh here to pin the defaults.
        const service = Object.create(OauthService.prototype);

        assert.deepEqual(service.providers, []);
        assert.false(service.allowsRegistration);
        assert.false(service.isLoading);
        assert.strictEqual(service.registration, null);
    });
});
