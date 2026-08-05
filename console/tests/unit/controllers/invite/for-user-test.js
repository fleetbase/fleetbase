import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import { settled } from '@ember/test-helpers';
import Service from '@ember/service';

module('Unit | Controller | invite/for-user', function (hooks) {
    setupTest(hooks);

    test('acceptInvite authenticates the session and transitions to the console', async function (assert) {
        class FetchStub extends Service {
            post() {
                return Promise.resolve({ token: 'invite-token', needs_password: false });
            }
        }
        class SessionStub extends Service {
            manuallyAuthenticate(token) {
                this.token = token;
            }
        }
        class NotificationsStub extends Service {
            success() {}
            serverError() {}
        }
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:session', SessionStub);
        this.owner.register('service:notifications', NotificationsStub);

        const controller = this.owner.lookup('controller:invite/for-user');
        let transitioned;
        controller.router.transitionTo = (route) => {
            transitioned = route;
            return Promise.resolve();
        };
        controller.code = 'invite-code';

        controller.acceptInvite();
        await settled();

        assert.strictEqual(this.owner.lookup('service:session').token, 'invite-token', 'authenticated with the returned token');
        assert.strictEqual(transitioned, 'console');
        assert.notOk(controller.isLoading, 'loading flag is reset');
    });
});
