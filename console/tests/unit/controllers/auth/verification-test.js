import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';
import { cancel } from '@ember/runloop';

module('Unit | Controller | auth/verification', function (hooks) {
    setupTest(hooks);

    test('validateInput toggles isReadyToSubmit on input length', function (assert) {
        const controller = this.owner.lookup('controller:auth/verification');

        controller.validateInput({ target: { value: '123456' } });
        assert.true(controller.isReadyToSubmit);

        controller.validateInput({ target: { value: '123' } });
        assert.false(controller.isReadyToSubmit);
    });

    test('validateInitInput toggles isReadyToSubmit on element value length', function (assert) {
        const controller = this.owner.lookup('controller:auth/verification');

        controller.validateInitInput({ value: 'abcdef' });
        assert.true(controller.isReadyToSubmit);

        controller.validateInitInput({ value: 'ab' });
        assert.false(controller.isReadyToSubmit);
    });

    test('onDidntReceiveCode flags the controller as still waiting', function (assert) {
        const controller = this.owner.lookup('controller:auth/verification');
        assert.false(controller.stillWaiting);

        controller.onDidntReceiveCode();

        assert.true(controller.stillWaiting);
    });

    test('verifyCode authenticates and transitions to console when a token is returned', async function (assert) {
        class FetchStub extends Service {
            post() {
                return Promise.resolve({ status: 'ok', token: 'auth-token' });
            }
        }
        class SessionStub extends Service {
            manuallyAuthenticate(token) {
                this.token = token;
            }
        }
        class NotificationsStub extends Service {
            success() {}
            info() {}
            serverError() {}
        }
        class IntlStub extends Service {
            t() {
                return 'Fleetbase';
            }
        }
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:session', SessionStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.owner.register('service:intl', IntlStub);

        const controller = this.owner.lookup('controller:auth/verification');
        let transitioned;
        controller.router.transitionTo = (route) => {
            transitioned = route;
            return route;
        };

        await controller.verifyCode.perform();

        assert.strictEqual(this.owner.lookup('service:session').token, 'auth-token');
        assert.strictEqual(transitioned, 'console');
    });

    test('verifyCode transitions to login when no token is returned', async function (assert) {
        class FetchStub extends Service {
            post() {
                return Promise.resolve({ status: 'ok' });
            }
        }
        class NotificationsStub extends Service {
            success() {}
            info() {}
            serverError() {}
        }
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);

        const controller = this.owner.lookup('controller:auth/verification');
        let transitioned;
        controller.router.transitionTo = (route) => {
            transitioned = route;
            return route;
        };

        await controller.verifyCode.perform();

        assert.strictEqual(transitioned, 'auth.login');
    });
});

/**
 * The controller's constructor schedules a 75-second "still waiting" timer. willDestroy
 * cancels it at teardown, but nothing here may await settled() after the lookup or the run
 * loop would sit on that timer until the test times out.
 */
module('Unit | Controller | auth/verification | resend and verify', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.posted = [];
        this.postResponse = { status: 'ok', token: 'auth-token' };
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
            serverErrors = [];
            error(message) {
                this.errors.push(message);
            }
            success(message) {
                this.successes.push(message);
            }
            info(message) {
                this.infos.push(message);
            }
            serverError(error) {
                this.serverErrors.push(error);
            }
        }
        class SessionStub extends Service {
            authenticated = [];
            manuallyAuthenticate(token) {
                this.authenticated.push(token);
            }
        }
        class IntlStub extends Service {
            t() {
                return 'Fleetbase';
            }
        }
        class ModalsManagerStub extends Service {
            shown = [];
            show(name, options) {
                this.shown.push({ name, options });
            }
        }

        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.owner.register('service:session', SessionStub);
        this.owner.register('service:intl', IntlStub);
        this.owner.register('service:modals-manager', ModalsManagerStub);

        this.build = () => {
            const controller = this.owner.lookup('controller:auth/verification');
            this.transitions = [];
            Object.defineProperty(controller.router, 'transitionTo', {
                configurable: true,
                value: (routeName) => {
                    this.transitions.push(routeName);
                    return routeName;
                },
            });
            return controller;
        };
        this.notifications = () => this.owner.lookup('service:notifications');
        this.modal = (options = {}) => {
            const calls = [];
            return {
                calls,
                startLoading: () => calls.push('startLoading'),
                stopLoading: () => calls.push('stopLoading'),
                done: () => calls.push('done'),
                getOption: (key) => options[key],
            };
        };
    });

    test('verifyCode authenticates and lands in the console when a token comes back', async function (assert) {
        const controller = this.build();
        controller.token = 'tok';
        controller.code = '123456';
        controller.email = 'ron@fleetbase.io';

        await controller.verifyCode.perform();

        assert.deepEqual(this.posted, [{ path: 'auth/verify-email', payload: { token: 'tok', code: '123456', email: 'ron@fleetbase.io', authenticate: true } }]);
        assert.deepEqual(this.owner.lookup('service:session').authenticated, ['auth-token']);
        assert.deepEqual(this.transitions, ['console']);
        assert.deepEqual(this.notifications().successes, ['Email successfully verified!']);
        assert.deepEqual(this.notifications().infos, ['Welcome to Fleetbase']);
    });

    test('verifyCode sends the user to login when no token comes back', async function (assert) {
        this.postResponse = { status: 'ok' };
        const controller = this.build();

        await controller.verifyCode.perform();

        assert.deepEqual(this.transitions, ['auth.login']);
        assert.deepEqual(this.owner.lookup('service:session').authenticated, [], 'nothing to authenticate with');
    });

    test('verifyCode stays put on a non-ok status', async function (assert) {
        this.postResponse = { status: 'invalid' };
        const controller = this.build();

        assert.strictEqual(await controller.verifyCode.perform(), undefined);
        assert.deepEqual(this.transitions, []);
        assert.deepEqual(this.notifications().successes, [], 'nothing is reported as verified');
    });

    test('verifyCode reports a failed request as a server error', async function (assert) {
        const failure = new Error('verification service down');
        this.postRejectsWith = failure;
        const controller = this.build();

        await controller.verifyCode.perform();

        assert.deepEqual(this.notifications().serverErrors, [failure]);
    });

    test('resendBySms opens the phone modal and sends the code with the session', async function (assert) {
        const controller = this.build();
        controller.hello = 'session-token';

        controller.resendBySms();

        const { name, options } = this.owner.lookup('service:modals-manager').shown[0];
        assert.strictEqual(name, 'modals/verify-by-sms');
        assert.strictEqual(options.title, 'Verify Account by Phone');
        assert.strictEqual(options.phone, controller.currentUser.phone);

        const modal = this.modal({ phone: '+15550001111' });
        await options.confirm(modal);

        assert.deepEqual(this.posted.at(-1), { path: 'onboard/send-verification-sms', payload: { phone: '+15550001111', session: 'session-token' } });
        assert.deepEqual(modal.calls, ['startLoading', 'done']);
        assert.deepEqual(this.notifications().successes, ['Verification code SMS sent!']);
    });

    test('confirming the sms modal without a number reports it', async function (assert) {
        const controller = this.build();
        controller.resendBySms();

        await this.owner.lookup('service:modals-manager').shown[0].options.confirm(this.modal({ phone: '' }));

        assert.deepEqual(this.notifications().errors, ['No phone number provided.']);
    });

    test('a failed sms send leaves the modal open', async function (assert) {
        const failure = new Error('sms gateway down');
        this.postRejectsWith = failure;
        const controller = this.build();
        controller.resendBySms();

        const modal = this.modal({ phone: '+15550001111' });
        await this.owner.lookup('service:modals-manager').shown[0].options.confirm(modal);

        assert.deepEqual(this.notifications().serverErrors, [failure]);
        assert.deepEqual(modal.calls, ['startLoading', 'stopLoading'], 'the user can retry');
    });

    test('resendEmail opens the email modal and sends the code with the session', async function (assert) {
        const controller = this.build();
        controller.hello = 'session-token';

        controller.resendEmail();

        const { name, options } = this.owner.lookup('service:modals-manager').shown[0];
        assert.strictEqual(name, 'modals/resend-verification-email');
        assert.strictEqual(options.email, controller.currentUser.email);

        const modal = this.modal({ email: 'ron@fleetbase.io' });
        await options.confirm(modal);

        assert.deepEqual(this.posted.at(-1), { path: 'onboard/send-verification-email', payload: { email: 'ron@fleetbase.io', session: 'session-token' } });
        assert.deepEqual(modal.calls, ['startLoading', 'done']);
        assert.deepEqual(this.notifications().successes, ['Verification code email sent!']);
    });

    test('confirming the email modal without an address reports it', async function (assert) {
        const controller = this.build();
        controller.resendEmail();

        await this.owner.lookup('service:modals-manager').shown[0].options.confirm(this.modal({ email: '' }));

        assert.deepEqual(this.notifications().errors, ['No email number provided.']);
    });

    test('a failed email send leaves the modal open', async function (assert) {
        const failure = new Error('smtp unavailable');
        this.postRejectsWith = failure;
        const controller = this.build();
        controller.resendEmail();

        const modal = this.modal({ email: 'ron@fleetbase.io' });
        await this.owner.lookup('service:modals-manager').shown[0].options.confirm(modal);

        assert.deepEqual(this.notifications().serverErrors, [failure]);
        assert.deepEqual(modal.calls, ['startLoading', 'stopLoading']);
    });

    test('willDestroy cancels the still-waiting timer', function (assert) {
        const controller = this.build();
        assert.notStrictEqual(controller.stillWaitingTimer, undefined, 'a timer was scheduled on construction');

        controller.willDestroy();

        assert.false(controller.stillWaiting, 'the timer never fired, so the flag is untouched');
    });
});

module('Unit | Controller | auth/verification | still-waiting timer', function (hooks) {
    setupTest(hooks);

    test('the wait timer shows the "still waiting" prompt when it fires', function (assert) {
        // Looked up without settling: the constructor schedules this for waitTimeout ms,
        // which is far longer than a test may run, so the callback is driven directly.
        const controller = this.owner.lookup('controller:auth/verification');

        assert.false(controller.stillWaiting, 'nothing is shown while the code is still expected');

        controller.markStillWaiting();

        assert.true(controller.stillWaiting, 'the prompt appears once the code is overdue');
    });

    test('teardown with no pending timer is a no-op', function (assert) {
        const controller = this.owner.lookup('controller:auth/verification');
        // Cancel the real timer before clearing the handle: with nothing left to cancel,
        // teardown's settled() would otherwise wait out the whole waitTimeout.
        cancel(controller.stillWaitingTimer);
        controller.stillWaitingTimer = null;

        controller.willDestroy();

        assert.strictEqual(controller.stillWaitingTimer, null, 'there is nothing to cancel and nothing throws');
    });
});
