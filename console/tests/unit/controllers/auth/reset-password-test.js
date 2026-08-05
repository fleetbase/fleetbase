import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

module('Unit | Controller | auth/reset-password', function (hooks) {
    setupTest(hooks);

    test('resetPassword posts the reset and transitions to login', async function (assert) {
        class FetchStub extends Service {
            post(path, body) {
                this.posted = { path, body };
                return Promise.resolve();
            }
        }
        class NotificationsStub extends Service {
            success() {
                this.succeeded = true;
            }
            serverError() {}
        }
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);

        const controller = this.owner.lookup('controller:auth/reset-password');
        let transitioned;
        controller.router.transitionTo = (route) => {
            transitioned = route;
            return Promise.resolve();
        };
        controller.model = { id: 'link_1' };
        controller.code = '123456';
        controller.password = 'newpass';
        controller.password_confirmation = 'newpass';

        await controller.resetPassword.perform({ preventDefault() {} });

        assert.deepEqual(this.owner.lookup('service:fetch').posted.body, {
            link: 'link_1',
            code: '123456',
            password: 'newpass',
            password_confirmation: 'newpass',
        });
        assert.true(this.owner.lookup('service:notifications').succeeded);
        assert.strictEqual(transitioned, 'auth.login');
    });

    test('resetPassword reports a server error and does not transition', async function (assert) {
        class FetchStub extends Service {
            post() {
                return Promise.reject(new Error('bad code'));
            }
        }
        class NotificationsStub extends Service {
            success() {}
            serverError() {
                this.errored = true;
            }
        }
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);

        const controller = this.owner.lookup('controller:auth/reset-password');
        let transitioned = false;
        controller.router.transitionTo = () => {
            transitioned = true;
            return Promise.resolve();
        };
        controller.model = { id: 'link_1' };

        await controller.resetPassword.perform({ preventDefault() {} });

        assert.true(this.owner.lookup('service:notifications').errored);
        assert.false(transitioned, 'stays on the reset screen on error');
    });
});
