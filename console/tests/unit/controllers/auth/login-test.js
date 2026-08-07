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

        // Defaults: no 2FA, authentication succeeds.
        this.twoFactor = () => Promise.resolve({ isTwoFaEnabled: false });
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
            checkForTwoFactor(identity) {
                return self.twoFactor(identity);
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

        assert.deepEqual(this.authenticateCalls, [], 'nothing is submitted');
    });

    test('login authenticates and clears the form on success', async function (assert) {
        this.controller.identity = 'ron@fleetbase.io';
        this.controller.password = 'hunter2';
        this.controller.rememberMe = true;

        await this.submit();

        assert.deepEqual(this.authenticateCalls.at(-1), ['authenticator:fleetbase', { identity: 'ron@fleetbase.io', password: 'hunter2' }, true]);
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

    test('login diverts to two-factor when the identity requires it', async function (assert) {
        this.twoFactor = () => Promise.resolve({ isTwoFaEnabled: true, twoFaSession: 'two-fa-token' });
        this.controller.identity = 'ron@fleetbase.io';
        this.controller.password = 'hunter2';

        await this.submit();

        assert.deepEqual(this.persisted.at(-1), { identity: 'ron@fleetbase.io' }, 'the identity is persisted for the 2FA step');
        assert.deepEqual(this.transitions.at(-1), ['auth.two-fa', { queryParams: { token: 'two-fa-token' } }]);
        assert.deepEqual(this.authenticateCalls, [], 'the password is never submitted when 2FA is required');
    });

    test('a failure during the two-factor handoff is reported', async function (assert) {
        this.twoFactor = () => Promise.resolve({ isTwoFaEnabled: true, twoFaSession: 'two-fa-token' });
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

    test('a failing two-factor check is reported and stops the login', async function (assert) {
        this.twoFactor = () => Promise.reject(new Error('2fa lookup failed'));
        this.controller.identity = 'ron@fleetbase.io';
        this.controller.password = 'hunter2';

        await this.submit();

        assert.strictEqual(this.notifications.errors.length, 1);
        assert.deepEqual(this.authenticateCalls, [], 'authentication is not attempted');
    });

    test('an unverified account is sent to email verification', async function (assert) {
        this.authenticateResult = () => Promise.reject(new Error('account not verified'));
        this.controller.identity = 'ron@fleetbase.io';
        this.controller.password = 'hunter2';

        await this.submit();

        assert.strictEqual(this.controller.failedAttempts, 1, 'the attempt is counted');
        assert.deepEqual(this.posted.at(-1), { path: 'auth/create-verification-session', payload: { email: 'ron@fleetbase.io', send: true } });
        assert.deepEqual(this.transitions.at(-1), ['auth.verification', { queryParams: { token: 'verify-token', hello: 'sess_1' } }]);
    });

    test('an account needing a reset is sent to forgot-password', async function (assert) {
        this.authenticateResult = () => Promise.reject(new Error('password reset required'));
        this.controller.identity = 'ron@fleetbase.io';
        this.controller.password = 'hunter2';

        await this.submit();

        assert.deepEqual(this.transitions.at(-1), ['auth.forgot-password', { queryParams: { email: 'ron@fleetbase.io' } }]);
        assert.strictEqual(this.notifications.warnings.at(-1), 'auth.login.password-reset-required');
    });

    test('any other authentication error is surfaced and clears the password', async function (assert) {
        this.authenticateResult = () => Promise.reject(new Error('bad credentials'));
        this.controller.identity = 'ron@fleetbase.io';
        this.controller.password = 'hunter2';

        await this.submit();

        assert.strictEqual(this.notifications.errors.length, 1);
        assert.strictEqual(this.controller.password, null);
        assert.strictEqual(this.controller.identity, 'ron@fleetbase.io', 'the identity is kept so the user can retry');
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

        assert.deepEqual(this.notifications.errors, ['auth.login.slow-connection-message']);
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
});
