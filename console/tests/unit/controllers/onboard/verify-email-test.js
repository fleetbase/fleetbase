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
