import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

module('Unit | Controller | onboard/verify-email', function (hooks) {
    setupTest(hooks);

    test('verifyCode authenticates and transitions to console when a token is returned', async function (assert) {
        class FetchStub extends Service {
            post(path, body) {
                this.request = { path, body };
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
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:session', SessionStub);
        this.owner.register('service:notifications', NotificationsStub);

        const controller = this.owner.lookup('controller:onboard/verify-email');
        controller.hello = 'session-1';
        controller.code = '654321';
        let transitioned;
        controller.router.transitionTo = (route) => {
            transitioned = route;
            return route;
        };

        await controller.verifyCode.perform();

        assert.strictEqual(this.owner.lookup('service:fetch').request.path, 'onboard/verify-email');
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

        const controller = this.owner.lookup('controller:onboard/verify-email');
        let transitioned;
        controller.router.transitionTo = (route) => {
            transitioned = route;
            return route;
        };

        await controller.verifyCode.perform();

        assert.strictEqual(transitioned, 'auth.login');
    });
});

module('Unit | Controller | onboard/verify-email | failure', function (hooks) {
    setupTest(hooks);

    test('a failed verification is reported as a server error', async function (assert) {
        const failure = new Error('verification service down');
        class FetchStub extends Service {
            post() {
                return Promise.reject(failure);
            }
        }
        class NotificationsStub extends Service {
            serverErrors = [];
            success() {}
            info() {}
            serverError(error) {
                this.serverErrors.push(error);
            }
        }
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);

        const controller = this.owner.lookup('controller:onboard/verify-email');
        let transitioned = false;
        Object.defineProperty(controller.router, 'transitionTo', { configurable: true, value: () => (transitioned = true) });

        await controller.verifyCode.perform();

        assert.deepEqual(this.owner.lookup('service:notifications').serverErrors, [failure]);
        assert.false(transitioned, 'the user stays on the verification screen');
    });
});

module('Unit | Controller | onboard/verify-email | rejected codes', function (hooks) {
    setupTest(hooks);

    test('a status other than ok leaves the user on the form with nothing reported as verified', async function (assert) {
        const notified = [];

        class FetchStub extends Service {
            post() {
                return Promise.resolve({ status: 'invalid' });
            }
        }
        class NotificationsStub extends Service {
            success(message) {
                notified.push(message);
            }
            info(message) {
                notified.push(message);
            }
            serverError() {}
        }
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);

        const controller = this.owner.lookup('controller:onboard/verify-email');
        controller.transitions = [];
        Object.defineProperty(controller.router, 'transitionTo', {
            configurable: true,
            value: (route) => controller.transitions.push(route),
        });

        assert.strictEqual(await controller.verifyCode.perform(), undefined, 'nothing is returned to act on');
        assert.deepEqual(notified, [], 'no success or welcome message');
        assert.deepEqual(controller.transitions, [], 'and no navigation');
    });
});
