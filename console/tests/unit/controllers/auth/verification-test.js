import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

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
