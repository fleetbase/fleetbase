import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

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

    test('didntReceiveCode marks the service waiting', function (assert) {
        const service = this.owner.lookup('service:user-verification');
        assert.false(service.waiting);
        service.didntReceiveCode();
        assert.true(service.waiting);
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
    });

    test('verifyCode transitions to login when no token is returned', async function (assert) {
        let transitioned;
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

        const service = this.owner.lookup('service:user-verification');
        service.router.transitionTo = (r) => {
            transitioned = r;
            return r;
        };

        await service.verifyCode.perform();

        assert.strictEqual(transitioned, 'auth.login');
    });
});
