import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import { settled } from '@ember/test-helpers';
import { cancel } from '@ember/runloop';
import Service from '@ember/service';

class NotificationsStub extends Service {
    successes = [];
    infos = [];
    errors = [];
    serverErrors = [];

    success(message) {
        this.successes.push(message);
    }
    info(message) {
        this.infos.push(message);
    }
    error(message) {
        this.errors.push(message);
    }
    serverError(error) {
        this.serverErrors.push(error);
    }
}

class ModalsManagerStub extends Service {
    shown = [];

    show(name, options) {
        this.shown.push({ name, options });
    }
}

/**
 * Stands in for the modal instance the confirm() callback is handed, recording the
 * lifecycle calls it makes so the tests can assert the loading/done sequence.
 */
function fakeModal(options = {}) {
    const calls = [];

    return {
        calls,
        startLoading() {
            calls.push('startLoading');
        },
        stopLoading() {
            calls.push('stopLoading');
        },
        done() {
            calls.push('done');
        },
        getOption(key) {
            return options[key];
        },
    };
}

module('Unit | Service | user-verification', function (hooks) {
    setupTest(hooks);

    test('validateInput sets ready only when the value is longer than 5 chars', function (assert) {
        const service = this.owner.lookup('service:user-verification');
        service.validateInput({ target: { value: '123456' } });
        assert.true(service.ready);
        service.validateInput({ target: { value: '12345' } });
        assert.false(service.ready);
        service.validateInput({});
        assert.false(service.ready, 'missing value is treated as empty');
    });

    test('validateInput reads the value straight off a DOM element', function (assert) {
        const service = this.owner.lookup('service:user-verification');
        const input = document.createElement('input');

        input.value = '123456';
        service.validateInput(input);
        assert.true(service.ready, 'an element is read via its own value property, not event.target');

        input.value = '123';
        service.validateInput(input);
        assert.false(service.ready);
    });

    test('didntReceiveCode marks the service waiting', function (assert) {
        const service = this.owner.lookup('service:user-verification');
        assert.false(service.waiting);
        service.didntReceiveCode();
        assert.true(service.waiting);
    });

    test('start flips the service into waiting once the timeout elapses', async function (assert) {
        const service = this.owner.lookup('service:user-verification');
        assert.false(service.waiting, 'precondition: not waiting yet');

        service.start({ timeout: 1 });
        await settled();

        assert.true(service.waiting, 'the resend options are offered once the wait is up');
    });

    test('start schedules the default wait when no timeout is given', async function (assert) {
        const service = this.owner.lookup('service:user-verification');

        // The default is 75 seconds, so this timer has to be cancelled rather than waited
        // out — left running it fires long after the test container is gone.
        const timer = service.start();

        assert.ok(timer, 'a timer is returned so the caller can cancel it');
        assert.false(service.waiting, 'the default wait has not elapsed');

        cancel(timer);
        await settled();

        assert.false(service.waiting, 'a cancelled wait never fires');
    });

    test('setToken and setCode store their values', function (assert) {
        const service = this.owner.lookup('service:user-verification');
        service.setToken('tok');
        service.setCode('123456');
        assert.strictEqual(service.token, 'tok');
        assert.strictEqual(service.code, '123456');
    });

    test('verifyCode authenticates and transitions to console when a token is returned', async function (assert) {
        let authenticated, transitioned;
        class FetchStub extends Service {
            post() {
                return Promise.resolve({ status: 'ok', token: 'auth-token' });
            }
        }
        class SessionStub extends Service {
            manuallyAuthenticate(t) {
                authenticated = t;
            }
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

        const service = this.owner.lookup('service:user-verification');
        // Ember's built-in RouterService can't be overridden via owner.register in setupTest,
        // so spy on transitionTo on the injected instance the task actually calls.
        service.router.transitionTo = (r) => {
            transitioned = r;
            return r;
        };

        await service.verifyCode.perform();

        assert.strictEqual(authenticated, 'auth-token');
        assert.strictEqual(transitioned, 'console');

        const notifications = this.owner.lookup('service:notifications');
        assert.deepEqual(notifications.successes, ['Email successfully verified!']);
        assert.deepEqual(notifications.infos, ['Welcome to Fleetbase']);
    });

    test('verifyCode transitions to login when no token is returned', async function (assert) {
        let transitioned;
        class FetchStub extends Service {
            post() {
                return Promise.resolve({ status: 'ok' });
            }
        }
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);

        const service = this.owner.lookup('service:user-verification');
        service.router.transitionTo = (r) => {
            transitioned = r;
            return r;
        };

        await service.verifyCode.perform();

        assert.strictEqual(transitioned, 'auth.login');
    });

    test('verifyCode sends the stored token and code and stays put on a non-ok status', async function (assert) {
        let payload;
        class FetchStub extends Service {
            post(path, body) {
                payload = { path, body };
                return Promise.resolve({ status: 'invalid' });
            }
        }
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);

        const service = this.owner.lookup('service:user-verification');
        let transitioned = false;
        service.router.transitionTo = () => (transitioned = true);

        service.setToken('tok');
        service.setCode('123456');
        const result = await service.verifyCode.perform();

        assert.strictEqual(payload.path, 'auth/verify-email');
        assert.strictEqual(payload.body.token, 'tok');
        assert.strictEqual(payload.body.code, '123456');
        assert.true(payload.body.authenticate);
        assert.strictEqual(result, undefined, 'nothing is returned for an unverified code');
        assert.false(transitioned, 'and the user is left on the verification screen');
        assert.deepEqual(this.owner.lookup('service:notifications').successes, [], 'no success is reported');
    });

    test('verifyCode reports a failed request as a server error', async function (assert) {
        const failure = new Error('gateway timeout');
        class FetchStub extends Service {
            post() {
                return Promise.reject(failure);
            }
        }
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);

        const service = this.owner.lookup('service:user-verification');

        await service.verifyCode.perform();

        assert.deepEqual(this.owner.lookup('service:notifications').serverErrors, [failure]);
    });

    test('resendBySms opens the phone modal seeded with the current user phone', function (assert) {
        this.owner.register('service:modals-manager', ModalsManagerStub);
        const service = this.owner.lookup('service:user-verification');

        service.resendBySms();

        const { name, options } = this.owner.lookup('service:modals-manager').shown[0];
        assert.strictEqual(name, 'modals/verify-by-sms');
        assert.strictEqual(options.title, 'Verify Account by Phone');
        assert.strictEqual(options.acceptButtonText, 'Send');
        assert.strictEqual(options.phone, service.currentUser.phone, 'the modal is seeded from the signed-in user');
    });

    test('confirming the sms modal sends the code and closes the modal', async function (assert) {
        let request;
        class FetchStub extends Service {
            post(path, body) {
                request = { path, body };
                return Promise.resolve({});
            }
        }
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.owner.register('service:modals-manager', ModalsManagerStub);

        const service = this.owner.lookup('service:user-verification');
        service.setSession('sess_abc');
        service.resendBySms();

        const modal = fakeModal({ phone: '+15550001111' });
        await this.owner.lookup('service:modals-manager').shown[0].options.confirm(modal);

        assert.strictEqual(request.path, 'onboard/send-verification-sms');
        assert.strictEqual(request.body.phone, '+15550001111');
        assert.strictEqual(request.body.session, 'sess_abc', 'the resent code is tied to the session in progress');
        assert.deepEqual(modal.calls, ['startLoading', 'done']);
        assert.deepEqual(this.owner.lookup('service:notifications').successes, ['Verification code SMS sent!']);
    });

    test('confirming the sms modal without a phone number reports the omission', async function (assert) {
        let posted = false;
        class FetchStub extends Service {
            post() {
                posted = true;
                return Promise.resolve({});
            }
        }
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.owner.register('service:modals-manager', ModalsManagerStub);

        const service = this.owner.lookup('service:user-verification');
        service.resendBySms();

        const modal = fakeModal({ phone: '' });
        await this.owner.lookup('service:modals-manager').shown[0].options.confirm(modal);

        assert.deepEqual(this.owner.lookup('service:notifications').errors, ['No phone number provided.']);
        assert.false(posted, 'nothing is sent without a number to send it to');
        assert.deepEqual(modal.calls, ['startLoading', 'stopLoading'], 'the modal stops spinning so the user can correct it');
    });

    test('a failed sms send is surfaced and the modal is left open', async function (assert) {
        const failure = new Error('sms gateway down');
        class FetchStub extends Service {
            post() {
                return Promise.reject(failure);
            }
        }
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.owner.register('service:modals-manager', ModalsManagerStub);

        const service = this.owner.lookup('service:user-verification');
        service.resendBySms();

        const modal = fakeModal({ phone: '+15550001111' });
        await this.owner.lookup('service:modals-manager').shown[0].options.confirm(modal);

        assert.deepEqual(this.owner.lookup('service:notifications').serverErrors, [failure]);
        assert.deepEqual(modal.calls, ['startLoading', 'stopLoading'], 'the modal stays open so the user can retry');
    });

    test('resendEmail opens the email modal seeded with the current user email', function (assert) {
        this.owner.register('service:modals-manager', ModalsManagerStub);
        const service = this.owner.lookup('service:user-verification');

        service.resendEmail();

        const { name, options } = this.owner.lookup('service:modals-manager').shown[0];
        assert.strictEqual(name, 'modals/resend-verification-email');
        assert.strictEqual(options.title, 'Resend Verification Code');
        assert.strictEqual(options.acceptButtonText, 'Send');
        assert.strictEqual(options.email, service.currentUser.email);
    });

    test('confirming the email modal sends the code and closes the modal', async function (assert) {
        let request;
        class FetchStub extends Service {
            post(path, body) {
                request = { path, body };
                return Promise.resolve({});
            }
        }
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.owner.register('service:modals-manager', ModalsManagerStub);

        const service = this.owner.lookup('service:user-verification');
        service.resendEmail();

        const modal = fakeModal({ email: 'ron@fleetbase.io' });
        await this.owner.lookup('service:modals-manager').shown[0].options.confirm(modal);

        assert.strictEqual(request.path, 'onboard/send-verification-email');
        assert.strictEqual(request.body.email, 'ron@fleetbase.io');
        assert.deepEqual(modal.calls, ['startLoading', 'done']);
        assert.deepEqual(this.owner.lookup('service:notifications').successes, ['Verification code email sent!']);
    });

    test('confirming the email modal without an address reports the omission', async function (assert) {
        let posted = false;
        class FetchStub extends Service {
            post() {
                posted = true;
                return Promise.resolve({});
            }
        }
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.owner.register('service:modals-manager', ModalsManagerStub);

        const service = this.owner.lookup('service:user-verification');
        service.resendEmail();

        const modal = fakeModal({ email: '' });
        await this.owner.lookup('service:modals-manager').shown[0].options.confirm(modal);

        assert.deepEqual(this.owner.lookup('service:notifications').errors, ['No email address provided.']);
        assert.false(posted, 'nothing is sent without an address to send it to');
        assert.deepEqual(modal.calls, ['startLoading', 'stopLoading'], 'the modal stops spinning so the user can correct it');
    });

    test('a failed email send is surfaced and the modal is left open', async function (assert) {
        const failure = new Error('smtp unavailable');
        class FetchStub extends Service {
            post() {
                return Promise.reject(failure);
            }
        }
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.owner.register('service:modals-manager', ModalsManagerStub);

        const service = this.owner.lookup('service:user-verification');
        service.resendEmail();

        const modal = fakeModal({ email: 'ron@fleetbase.io' });
        await this.owner.lookup('service:modals-manager').shown[0].options.confirm(modal);

        assert.deepEqual(this.owner.lookup('service:notifications').serverErrors, [failure]);
        assert.deepEqual(modal.calls, ['startLoading', 'stopLoading']);
    });
});

module('Unit | Service | user-verification | session', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.service = this.owner.lookup('service:user-verification');
    });

    hooks.afterEach(function () {
        cancel(this.timer);
    });

    test('start records the session the verification was issued against', function (assert) {
        assert.strictEqual(this.service.hello, undefined, 'nothing is assumed before a caller supplies one');

        this.timer = this.service.start({ session: 'sess_from_caller' });

        assert.strictEqual(this.service.hello, 'sess_from_caller');
    });

    test('start without a session leaves any previously recorded one alone', function (assert) {
        this.service.setSession('sess_existing');

        this.timer = this.service.start();

        assert.strictEqual(this.service.hello, 'sess_existing', 'a bare start() does not wipe the session');
    });

    test('an explicitly empty session is recorded as given', function (assert) {
        this.service.setSession('sess_existing');

        this.timer = this.service.start({ session: null });

        assert.strictEqual(this.service.hello, null, 'the caller is trusted over the previous value');
    });
});
