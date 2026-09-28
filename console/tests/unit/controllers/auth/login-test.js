import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

class IntlStub extends Service {
    t(key) {
        return key;
    }
}

class NotificationsStub extends Service {
    warnings = [];
    errors = [];
    warning(m) {
        this.warnings.push(m);
    }
    error(m) {
        this.errors.push(m);
    }
    serverError(e) {
        this.errors.push(e);
    }
}

module('Unit | Controller | auth/login', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        const self = this;
        this.persisted = [];
        this.authenticateCalls = [];
        this.redirects = [];
        this.posted = [];

        // Defaults: no 2FA, the password is accepted and authentication succeeds.
        this.loginResult = () => Promise.resolve({ token: 'auth-token', type: 'user' });
        this.authenticateResult = () => Promise.resolve();
        this.isAuthenticated = true;

        class SessionStub extends Service {
            store = {
                persist(data) {
                    self.persisted.push(data);
                    return Promise.resolve();
                },
            };
            get isAuthenticated() {
                return self.isAuthenticated;
            }
            checkForTwoFactor() {
                self.twoFactorChecks = (self.twoFactorChecks ?? 0) + 1;
                return Promise.resolve({ isTwoFaEnabled: false });
            }
            authenticate(...args) {
                self.authenticateCalls.push(args);
                return self.authenticateResult();
            }
            setRedirect(route) {
                self.redirects.push(route);
            }
        }
        class UrlSearchParamsStub extends Service {
            params = {};
            get(key) {
                return this.params[key];
            }
        }
        class FetchStub extends Service {
            post(path, payload) {
                self.posted.push({ path, payload });
                if (path === 'auth/login') {
                    return self.loginResult(payload);
                }
                return Promise.resolve({ token: 'verify-token', session: 'sess_1' });
            }
        }

        this.owner.register('service:intl', IntlStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.owner.register('service:session', SessionStub);
        this.owner.register('service:url-search-params', UrlSearchParamsStub);
        this.owner.register('service:fetch', FetchStub);

        this.controller = this.owner.lookup('controller:auth/login');
        this.notifications = this.owner.lookup('service:notifications');
        this.urlParams = this.owner.lookup('service:url-search-params');

        this.transitions = [];
        Object.defineProperty(this.controller.router, 'transitionTo', {
            configurable: true,
            value: (...args) => {
                this.transitions.push(args);
                return Promise.resolve();
            },
        });

        this.submit = () => this.controller.login({ preventDefault() {} });
    });

    test('login refuses to submit without an identity or password', async function (assert) {
        await this.submit();
        assert.strictEqual(this.notifications.warnings.length, 1, 'a missing identity is refused');

        this.controller.identity = 'ron@fleetbase.io';
        await this.submit();
        assert.strictEqual(this.notifications.warnings.length, 2, 'a missing password is refused');

        assert.deepEqual(this.posted, [], 'nothing is submitted');
        assert.deepEqual(this.authenticateCalls, [], 'nothing is submitted');
    });

    test('login checks the password then authenticates with the issued token and clears the form', async function (assert) {
        this.controller.identity = 'ron@fleetbase.io';
        this.controller.password = 'hunter2';
        this.controller.rememberMe = true;

        await this.submit();

        assert.deepEqual(this.posted, [{ path: 'auth/login', payload: { identity: 'ron@fleetbase.io', password: 'hunter2', remember: true } }]);
        assert.deepEqual(
            this.authenticateCalls,
            [['authenticator:fleetbase', { identity: 'ron@fleetbase.io', authToken: 'auth-token' }, true]],
            'the session is established with the issued token, not by sending the password again'
        );
        assert.strictEqual(this.twoFactorChecks, undefined, 'the identity-only two-factor check is never called');
        assert.strictEqual(this.controller.identity, null, 'the form is cleared on success');
        assert.strictEqual(this.controller.password, null);
        assert.false(this.controller.isLoading);
    });

    test('login leaves the form alone when the session does not become authenticated', async function (assert) {
        this.isAuthenticated = false;
        this.controller.identity = 'ron@fleetbase.io';
        this.controller.password = 'hunter2';

        await this.submit();

        assert.strictEqual(this.controller.identity, 'ron@fleetbase.io', 'no success reset');
    });

    test('login diverts to two-factor only after the password is accepted', async function (assert) {
        this.loginResult = () => Promise.resolve({ isEnabled: true, twoFaSession: 'two-fa-token' });
        this.controller.identity = 'ron@fleetbase.io';
        this.controller.password = 'hunter2';

        await this.submit();

        assert.deepEqual(this.posted.at(0), { path: 'auth/login', payload: { identity: 'ron@fleetbase.io', password: 'hunter2', remember: false } }, 'the password is checked first');
        assert.deepEqual(this.persisted.at(-1), { identity: 'ron@fleetbase.io' }, 'the identity is persisted for the 2FA step');
        assert.deepEqual(this.transitions.at(-1), ['auth.two-fa', { queryParams: { token: 'two-fa-token' } }]);
        assert.deepEqual(this.authenticateCalls, [], 'no session is established until the code is verified');
        assert.strictEqual(this.twoFactorChecks, undefined, 'the identity-only two-factor check is never called');
    });

    test('a wrong password never reaches two-factor', async function (assert) {
        this.loginResult = () => Promise.reject(new Error('These credentials do not match our records.'));
        this.controller.identity = 'ron@fleetbase.io';
        this.controller.password = 'wrong';

        await this.submit();

        assert.strictEqual(this.controller.failedAttempts, 1, 'the attempt is counted');
        assert.strictEqual(this.notifications.errors.length, 1, 'the error is surfaced');
        assert.deepEqual(this.transitions, [], 'the user is not sent to the 2FA step');
        assert.deepEqual(this.persisted, []);
        assert.deepEqual(this.authenticateCalls, []);
    });

    test('a failure during the two-factor handoff is reported', async function (assert) {
        this.loginResult = () => Promise.resolve({ isEnabled: true, twoFaSession: 'two-fa-token' });
        Object.defineProperty(this.controller.router, 'transitionTo', {
            configurable: true,
            value: () => Promise.reject(new Error('cannot route')),
        });
        this.controller.identity = 'ron@fleetbase.io';
        this.controller.password = 'hunter2';

        await assert.rejects(this.submit(), /cannot route/, 'the error propagates after being reported');
        assert.strictEqual(this.notifications.errors.length, 1);
        assert.strictEqual(this.controller.password, null, 'the password is cleared on error');
    });

    test('an unverified account is sent to email verification', async function (assert) {
        this.loginResult = () => Promise.reject(new Error('account not verified'));
        this.controller.identity = 'ron@fleetbase.io';
        this.controller.password = 'hunter2';

        await this.submit();

        assert.strictEqual(this.controller.failedAttempts, 1, 'the attempt is counted');
        assert.deepEqual(this.posted.at(-1), { path: 'auth/create-verification-session', payload: { email: 'ron@fleetbase.io', send: true } });
        assert.deepEqual(this.transitions.at(-1), ['auth.verification', { queryParams: { token: 'verify-token', hello: 'sess_1' } }]);
    });

    test('an account needing a reset is sent to forgot-password', async function (assert) {
        this.loginResult = () => Promise.reject(new Error('password reset required'));
        this.controller.identity = 'ron@fleetbase.io';
        this.controller.password = 'hunter2';

        await this.submit();

        assert.deepEqual(this.transitions.at(-1), ['auth.forgot-password', { queryParams: { email: 'ron@fleetbase.io' } }]);
        assert.strictEqual(this.notifications.warnings.at(-1), this.controller.intl.t('auth.login.password-reset-required'));
    });

    test('any other authentication error is surfaced and clears the password', async function (assert) {
        this.loginResult = () => Promise.reject(new Error('bad credentials'));
        this.controller.identity = 'ron@fleetbase.io';
        this.controller.password = 'hunter2';

        await this.submit();

        assert.strictEqual(this.notifications.errors.length, 1);
        assert.strictEqual(this.controller.password, null);
        assert.strictEqual(this.controller.identity, 'ron@fleetbase.io', 'the identity is kept so the user can retry');
    });

    test('a failure establishing the session after the password is accepted is surfaced', async function (assert) {
        this.authenticateResult = () => Promise.reject(new Error('session could not be restored'));
        this.controller.identity = 'ron@fleetbase.io';
        this.controller.password = 'hunter2';

        await this.submit();

        assert.strictEqual(this.controller.failedAttempts, 1);
        assert.strictEqual(this.notifications.errors.length, 1);
        assert.strictEqual(this.controller.password, null);
    });

    test('setRedirect stores a redirect only when a shift param is present', async function (assert) {
        this.controller.setRedirect();
        assert.deepEqual(this.redirects, [], 'no shift means no redirect');

        this.urlParams.params = { shift: '/console/orders' };
        this.controller.setRedirect();
        assert.strictEqual(this.redirects.length, 1, 'the shift path is converted to a route');
    });

    test('transitionToOnboard and forgotPassword route away', async function (assert) {
        await this.controller.transitionToOnboard();
        assert.deepEqual(this.transitions.at(-1), ['onboard']);

        await this.controller.forgotPassword();
        assert.deepEqual(this.transitions.at(-1), ['auth.forgot-password']);
    });

    test('forgotPassword carries a known email across to that controller', async function (assert) {
        this.controller.email = 'ron@fleetbase.io';

        await this.controller.forgotPassword();

        assert.strictEqual(this.controller.forgotPasswordController.email, 'ron@fleetbase.io');
    });

    test('slowConnection reports the slow connection message', function (assert) {
        this.controller.slowConnection();

        assert.deepEqual(this.notifications.errors, [this.controller.intl.t('auth.login.slow-connection-message')]);
    });

    test('reset clears loading always, and the form according to the outcome', function (assert) {
        const controller = this.controller;

        Object.assign(controller, { isLoading: true, isSlowConnection: true, identity: 'a', password: 'b', isValidating: true });
        controller.reset('success');
        assert.false(controller.isLoading);
        assert.false(controller.isSlowConnection);
        assert.strictEqual(controller.identity, null);
        assert.strictEqual(controller.password, null);
        assert.false(controller.isValidating);

        Object.assign(controller, { identity: 'a', password: 'b' });
        controller.reset('error');
        assert.strictEqual(controller.password, null, 'errors clear only the password');
        assert.strictEqual(controller.identity, 'a');

        Object.assign(controller, { password: 'b' });
        controller.reset('fail');
        assert.strictEqual(controller.password, null, 'fail behaves like error');

        Object.assign(controller, { identity: 'a', password: 'b' });
        controller.reset('anything-else');
        assert.strictEqual(controller.password, 'b', 'an unknown outcome leaves the form alone');
    });

    test('continuing with a provider starts the server-side handshake', async function (assert) {
        const controller = this.owner.lookup('controller:auth/login');
        const started = [];

        controller.oauth.startAuthorization = (id, options) => started.push([id, options]);

        controller.continueWithProvider({ id: 'google', label: 'Google' });

        assert.deepEqual(started, [['google', { intent: 'login', returnTo: null }]]);
        // Nothing is posted from here: the server enforces 2FA when the handshake returns.
        assert.deepEqual(this.posted, []);
        assert.deepEqual(this.authenticateCalls, []);
    });

    test('it carries an intended destination into the handshake', async function (assert) {
        const controller = this.owner.lookup('controller:auth/login');
        const started = [];

        controller.oauth.startAuthorization = (id, options) => started.push([id, options]);
        controller.urlSearchParams.get = (key) => (key === 'shift' ? '/console/orders' : null);

        controller.continueWithProvider({ id: 'google' });

        assert.deepEqual(started, [['google', { intent: 'login', returnTo: '/console/orders' }]]);
    });

    test('it refuses to forward a destination that is not console-relative', async function (assert) {
        const controller = this.owner.lookup('controller:auth/login');
        const started = [];

        controller.oauth.startAuthorization = (id, options) => started.push([id, options]);
        controller.urlSearchParams.get = (key) => (key === 'shift' ? 'https://evil.tld/x' : null);

        controller.continueWithProvider({ id: 'google' });

        assert.deepEqual(started, [['google', { intent: 'login', returnTo: null }]]);
    });

    test('it ignores a provider click while a sign-in is already running', async function (assert) {
        const controller = this.owner.lookup('controller:auth/login');
        const started = [];

        controller.oauth.startAuthorization = (id, options) => started.push([id, options]);
        controller.set('isLoading', true);

        controller.continueWithProvider({ id: 'google' });
        controller.continueWithProvider({});

        assert.deepEqual(started, [], 'no handshake is started');
    });
});
