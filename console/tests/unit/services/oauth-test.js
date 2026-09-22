import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';
import window from 'ember-window-mock';
import config from '@fleetbase/console/config/environment';

module('Unit | Service | oauth', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        const self = this;
        this.getCalls = [];
        this.getResult = () => Promise.resolve({ providers: [{ id: 'google', label: 'Google', icon: 'google' }] });

        class FetchStub extends Service {
            get(path) {
                self.getCalls.push(path);
                return self.getResult();
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
});
