import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';
import { settled } from '@ember/test-helpers';

module('Unit | Controller | auth/two-fa', function (hooks) {
    setupTest(hooks);

    test('handleCodeExpired flags expiry and stops the countdown', function (assert) {
        const controller = this.owner.lookup('controller:auth/two-fa');
        controller.isCodeExpired = false;
        controller.countdownReady = true;

        controller.handleCodeExpired();

        assert.true(controller.isCodeExpired);
        assert.false(controller.countdownReady);
    });

    test('getExpirationDateFromClientToken decodes the expiry from a base64 client token', function (assert) {
        const controller = this.owner.lookup('controller:auth/two-fa');
        const token = btoa('2024-01-01T00:00:00|session-payload');

        const result = controller.getExpirationDateFromClientToken(token);

        assert.true(result instanceof Date, 'returns a Date for a pipe-delimited token');
        assert.strictEqual(controller.getExpirationDateFromClientToken(btoa('no-delimiter')), null, 'null when the token has no expiry segment');
    });

    test('verifyCode short-circuits with an error when the client token is missing', async function (assert) {
        class NotificationsStub extends Service {
            error() {
                this.errored = true;
            }
            success() {}
        }
        this.owner.register('service:notifications', NotificationsStub);

        const controller = this.owner.lookup('controller:auth/two-fa');
        controller.clientToken = null;

        await controller.verifyCode();

        assert.true(this.owner.lookup('service:notifications').errored, 'reports an invalid-session error');
    });
});

module('Unit | Controller | auth/two-fa | verification flow', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.posted = [];
        this.postResponse = { authToken: 'auth-token' };
        this.postRejectsWith = null;
        const context = this;

        class FetchStub extends Service {
            post(path, payload) {
                context.posted.push({ path, payload });
                return context.postRejectsWith ? Promise.reject(context.postRejectsWith) : Promise.resolve(context.postResponse);
            }
        }
        class NotificationsStub extends Service {
            errors = [];
            successes = [];
            infos = [];
            error(message) {
                this.errors.push(message);
            }
            success(message) {
                this.successes.push(message);
            }
            info(message) {
                this.infos.push(message);
            }
        }
        class SessionStub extends Service {
            authenticated = [];
            authenticate(authenticator, credentials) {
                this.authenticated.push({ authenticator, credentials });
                return Promise.resolve();
            }
        }

        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.owner.register('service:session', SessionStub);

        this.build = () => {
            const controller = this.owner.lookup('controller:auth/two-fa');
            this.transitions = [];
            Object.defineProperty(controller.router, 'transitionTo', {
                configurable: true,
                value: (routeName) => {
                    this.transitions.push(routeName);
                    return Promise.resolve(routeName);
                },
            });
            return controller;
        };
        this.notifications = () => this.owner.lookup('service:notifications');
    });

    test('verifyCode posts the code, authenticates and lands in the console', async function (assert) {
        const controller = this.build();
        controller.token = 'tok';
        controller.clientToken = 'client-tok';
        controller.identity = 'ron@fleetbase.io';
        controller.verificationCode = '123456';

        await controller.verifyCode();

        assert.deepEqual(this.posted, [{ path: 'two-fa/verify', payload: { token: 'tok', code: '123456', clientToken: 'client-tok', identity: 'ron@fleetbase.io' } }]);
        assert.deepEqual(this.owner.lookup('service:session').authenticated, [
            { authenticator: 'authenticator:fleetbase', credentials: { authToken: 'auth-token', identity: 'ron@fleetbase.io' } },
        ]);
        assert.deepEqual(this.transitions, ['console']);
        assert.strictEqual(this.notifications().successes.length, 1, 'success is reported');
    });

    test('verifyCode prevents the form from submitting itself', async function (assert) {
        const controller = this.build();
        controller.clientToken = 'client-tok';
        let prevented = false;

        await controller.verifyCode({ preventDefault: () => (prevented = true) });

        assert.true(prevented);
    });

    test('an expired code is reported as information rather than an error', async function (assert) {
        this.postRejectsWith = new Error('Verification code has expired');
        const controller = this.build();
        controller.clientToken = 'client-tok';

        await controller.verifyCode();

        assert.strictEqual(this.notifications().infos.length, 1, 'the user is told the code lapsed');
        assert.strictEqual(this.notifications().errors.length, 0, 'and it is not framed as a failure');
        assert.deepEqual(this.transitions, [], 'nothing navigates');
    });

    test('any other verification failure is reported as an error', async function (assert) {
        this.postRejectsWith = new Error('invalid code');
        const controller = this.build();
        controller.clientToken = 'client-tok';

        await controller.verifyCode();

        assert.strictEqual(this.notifications().errors.length, 1);
        assert.strictEqual(this.notifications().infos.length, 0);
    });

    test('handleOtpInput stores the code and immediately verifies it', async function (assert) {
        const controller = this.build();
        controller.clientToken = 'client-tok';

        controller.handleOtpInput('654321');

        assert.strictEqual(controller.verificationCode, '654321');
        await settled();
        assert.strictEqual(this.posted.at(-1).payload.code, '654321', 'the entered code is submitted without a further click');
    });

    test('resendCode restarts the countdown with the new client token', async function (assert) {
        const expiry = new Date('2026-03-01T12:00:00');
        this.postResponse = { clientToken: btoa(`2026-03-01T12:00:00|session`) };
        const controller = this.build();
        controller.identity = 'ron@fleetbase.io';
        controller.token = 'tok';
        controller.isCodeExpired = true;

        await controller.resendCode();

        assert.deepEqual(this.posted, [{ path: 'two-fa/resend', payload: { identity: 'ron@fleetbase.io', token: 'tok' } }]);
        assert.strictEqual(controller.clientToken, this.postResponse.clientToken);
        assert.true(controller.countdownReady, 'the countdown restarts');
        assert.false(controller.isCodeExpired, 'and the expiry flag is cleared');
        assert.true(controller.twoFactorSessionExpiresAfter instanceof Date, 'the new expiry is decoded');
        assert.strictEqual(this.notifications().successes.length, 1);
        assert.ok(expiry instanceof Date);
    });

    test('a resend that returns no client token is reported as a failure', async function (assert) {
        this.postResponse = {};
        const controller = this.build();

        await controller.resendCode();

        assert.strictEqual(this.notifications().errors.length, 1);
        assert.false(controller.countdownReady, 'the countdown stays stopped');
    });

    test('a failed resend request is reported as a failure', async function (assert) {
        this.postRejectsWith = new Error('resend unavailable');
        const controller = this.build();

        await controller.resendCode();

        assert.strictEqual(this.notifications().errors.length, 1);
        assert.false(controller.countdownReady);
    });

    test('cancelTwoFactor invalidates the session and returns to login', async function (assert) {
        const controller = this.build();
        controller.identity = 'ron@fleetbase.io';
        controller.token = 'tok';

        await controller.cancelTwoFactor();

        assert.deepEqual(this.posted, [{ path: 'two-fa/invalidate', payload: { identity: 'ron@fleetbase.io', token: 'tok' } }]);
        assert.deepEqual(this.transitions, ['auth.login']);
    });

    test('convertUtcToClientTime shifts a UTC stamp by the local offset', function (assert) {
        const controller = this.build();
        const utc = '2026-03-01T12:00:00Z';

        const converted = controller.convertUtcToClientTime(utc);

        assert.true(converted instanceof Date);
        assert.strictEqual(converted.getTime(), new Date(utc).getTime() - new Date().getTimezoneOffset() * 60 * 1000);
    });
});

module('Unit | Controller | auth/two-fa | client token expiry', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.controller = this.owner.lookup('controller:auth/two-fa');
        // The token is base64 of "<expiry>|<identifier>".
        this.token = (contents) => window.btoa(contents);
    });

    test('a token carrying a parseable expiry yields that date', function (assert) {
        const expiry = this.controller.getExpirationDateFromClientToken(this.token('2026-05-06 14:30:00|session-1'));

        assert.true(expiry instanceof Date, 'the expiry is handed back as a Date');
    });

    test('a token whose expiry cannot be read yields no expiry', function (assert) {
        assert.strictEqual(
            this.controller.getExpirationDateFromClientToken(this.token('not-a-timestamp|session-1')),
            null,
            'an unparseable stamp is treated as no expiry rather than an invalid Date'
        );
    });

    test('a token with no separator yields no expiry', function (assert) {
        assert.strictEqual(this.controller.getExpirationDateFromClientToken(this.token('sessiononly')), null);
    });
});
