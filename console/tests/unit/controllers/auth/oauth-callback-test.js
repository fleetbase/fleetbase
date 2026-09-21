import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

module('Unit | Controller | auth/oauth-callback', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        const self = this;
        this.posted = [];
        this.transitions = [];
        this.manualTokens = [];
        this.redirects = [];
        this.notified = { errors: [], info: [] };
        this.exchangeResult = () => Promise.resolve({ token: 'sanctum-token', type: 'user' });

        class FetchStub extends Service {
            post(path, body, options) {
                self.posted.push({ path, body, options });
                return self.exchangeResult();
            }
        }

        class SessionStub extends Service {
            manuallyAuthenticate(token) {
                self.manualTokens.push(token);
            }
            setRedirect(route) {
                self.redirects.push(route);
            }
        }

        class NotificationsStub extends Service {
            error(m) {
                self.notified.errors.push(m);
            }
            info(m) {
                self.notified.info.push(m);
            }
            success(m) {
                self.notified.info.push(m);
            }
        }

        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:session', SessionStub);
        this.owner.register('service:notifications', NotificationsStub);

        this.controller = this.owner.lookup('controller:auth/oauth-callback');

        // Patch intl on the instance rather than registering a stub: ember-intl's own
        // initializer resolves service:intl during container boot, so an owner.register
        // here wins or loses depending on which other test files ran first. Asserting
        // on the key keeps these tests independent of the English copy.
        Object.defineProperty(this.controller.intl, 't', {
            configurable: true,
            value: (key) => key,
        });

        // The router service cannot be replaced with owner.register — Ember resolves
        // its own before a unit test gets the chance — so patch the instance, the
        // same way tests/unit/controllers/auth/login-test.js does.
        Object.defineProperty(this.controller.router, 'transitionTo', {
            configurable: true,
            value: (...args) => {
                self.transitions.push(args);
                return Promise.resolve();
            },
        });
    });

    test('it exchanges the handoff code and establishes the session', async function (assert) {
        const controller = this.controller;

        await controller.start({ handoff: 'handoff-code', returnTo: null });

        assert.deepEqual(this.posted, [{ path: 'auth/oauth/exchange', body: { code: 'handoff-code' }, options: { rawError: true } }]);
        assert.deepEqual(this.manualTokens, ['sanctum-token']);
        // The session service performs the transition itself from handleAuthentication().
        assert.deepEqual(this.transitions, []);
    });

    test('it points the post-login transition at the requested page', async function (assert) {
        const controller = this.controller;

        await controller.start({ handoff: 'handoff-code', returnTo: '/console/orders' });

        assert.strictEqual(this.redirects.length, 1, 'a redirect target was set');
        assert.deepEqual(this.manualTokens, ['sanctum-token']);
    });

    test('it ignores a return path that is not console-relative', async function (assert) {
        const controller = this.controller;

        // The server already rejects these, so reaching here means something is
        // wrong; the console refuses to act on it rather than trusting the echo.
        await controller.start({ handoff: 'handoff-code', returnTo: 'https://evil.tld/x' });

        assert.deepEqual(this.redirects, []);
        assert.deepEqual(this.manualTokens, ['sanctum-token']);
    });

    test('it sends a two factor challenge to the two-fa route without a session', async function (assert) {
        this.exchangeResult = () => Promise.resolve({ isEnabled: true, twoFaSession: 'two-fa-token' });
        const controller = this.controller;

        await controller.start({ handoff: 'handoff-code' });

        // Signing in through a provider does not waive the second factor.
        assert.deepEqual(this.transitions, [['auth.two-fa', { queryParams: { token: 'two-fa-token' } }]]);
        assert.deepEqual(this.manualTokens, [], 'no session is established yet');
    });

    test('it hands a registration intent to the onboarding flow', async function (assert) {
        this.exchangeResult = () =>
            Promise.resolve({
                status: 'registration_required',
                intent: 'rti_abc',
                prefill: { name: 'Ada', email: 'ada@example.com', email_verified: true },
            });
        const controller = this.controller;

        await controller.start({ handoff: 'handoff-code' });

        const oauth = this.owner.lookup('service:oauth');

        assert.strictEqual(oauth.registration.intent, 'rti_abc');
        assert.strictEqual(oauth.registration.prefill.email, 'ada@example.com');
        assert.deepEqual(this.transitions, [['onboard']]);
        assert.deepEqual(this.manualTokens, []);
    });

    test('it reports a provider failure carried in the fragment and returns to sign in', async function (assert) {
        const controller = this.controller;

        await controller.start({ error: 'access_denied' });

        assert.deepEqual(this.posted, [], 'no exchange is attempted');
        assert.deepEqual(this.notified.errors, ['auth.login.oauth.errors.access-denied']);
        assert.deepEqual(this.transitions, [['auth.login']]);
    });

    test('it treats a missing handoff code as an invalid state', async function (assert) {
        const controller = this.controller;

        await controller.start({});

        assert.deepEqual(this.posted, []);
        assert.deepEqual(this.notified.errors, ['auth.login.oauth.errors.invalid-state']);
    });

    test('it maps server error codes to copy and never renders a raw server string', async function (assert) {
        const cases = [
            ['invalid_exchange_code', 'auth.login.oauth.errors.expired'],
            ['link_required', 'auth.login.oauth.errors.link-required'],
            ['registration_disabled', 'auth.login.oauth.errors.registration-disabled'],
            ['not_verified', 'auth.login.oauth.errors.not-verified'],
            ['customer_login_not_allowed', 'auth.login.oauth.errors.customer-account'],
            ['rate_limited', 'auth.login.oauth.errors.rate-limited'],
            ['something_new_from_the_server', 'auth.login.oauth.errors.generic'],
        ];

        for (const [code, key] of cases) {
            this.notified.errors = [];
            this.exchangeResult = () => Promise.reject({ code, errors: ['raw server text that must not be shown'] });

            const controller = this.controller;
            await controller.start({ handoff: 'handoff-code' });

            assert.deepEqual(this.notified.errors, [key], `${code} maps to ${key}`);
        }
    });

    test('an exchange with no token and no known outcome fails closed', async function (assert) {
        this.exchangeResult = () => Promise.resolve({ unexpected: true });
        const controller = this.controller;

        await controller.start({ handoff: 'handoff-code' });

        assert.deepEqual(this.manualTokens, []);
        assert.deepEqual(this.notified.errors, ['auth.login.oauth.errors.exchange-failed']);
        assert.deepEqual(this.transitions, [['auth.login']]);
    });

    test('a link handoff is completed through the protected endpoint, never the public exchange', async function (assert) {
        const controller = this.controller;
        const completed = [];
        controller.oauth.completeLink = (code) => {
            completed.push(code);
            return Promise.resolve({ identities: [] });
        };

        await controller.start({ handoff: 'link-code', intent: 'link' });

        assert.deepEqual(completed, ['link-code'], 'completed as a link');
        assert.deepEqual(this.posted, [], 'the public exchange is never called');
        assert.deepEqual(this.manualTokens, [], 'no session is created — the user is already signed in');
        assert.deepEqual(this.transitions, [['console.account.auth']]);
    });

    test('a refused link returns the user to their account page with a message', async function (assert) {
        const controller = this.controller;
        controller.oauth.completeLink = () => Promise.reject({ code: 'identity_already_linked' });

        await controller.start({ handoff: 'link-code', intent: 'link' });

        assert.deepEqual(this.notified.errors, ['auth.login.oauth.errors.identity-already-linked']);
        assert.deepEqual(this.transitions, [['console.account.auth']]);
    });

    test('a link rejected as invalid shows a generic link failure', async function (assert) {
        const controller = this.controller;
        // Includes the account-linking CSRF case, which the API reports exactly like an
        // expired code on purpose.
        controller.oauth.completeLink = () => Promise.reject({ code: 'invalid_exchange_code' });

        await controller.start({ handoff: 'link-code', intent: 'link' });

        assert.deepEqual(this.notified.errors, ['auth.login.oauth.errors.link-failed']);
    });

    test('a link cancelled at the provider returns to the account page without calling the API', async function (assert) {
        const controller = this.controller;
        let called = false;
        controller.oauth.completeLink = () => {
            called = true;
            return Promise.resolve();
        };

        await controller.start({ error: 'access_denied', intent: 'link' });

        assert.false(called);
        assert.deepEqual(this.notified.errors, ['auth.login.oauth.errors.access-denied']);
        assert.deepEqual(this.transitions, [['console.account.auth']]);
    });
});
