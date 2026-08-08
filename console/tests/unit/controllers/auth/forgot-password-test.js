import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

module('Unit | Controller | auth/forgot-password', function (hooks) {
    setupTest(hooks);

    test('sendSecureLink posts the email and flags the link as sent', async function (assert) {
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

        const controller = this.owner.lookup('controller:auth/forgot-password');
        controller.email = 'ron@fleetbase.io';

        await controller.sendSecureLink.perform({ preventDefault() {} });

        assert.deepEqual(this.owner.lookup('service:fetch').posted, { path: 'auth/get-magic-reset-link', body: { email: 'ron@fleetbase.io' } });
        assert.true(this.owner.lookup('service:notifications').succeeded);
        assert.true(controller.isSent);
    });

    test('sendSecureLink surfaces a server error and stays unsent', async function (assert) {
        class FetchStub extends Service {
            post() {
                return Promise.reject(new Error('nope'));
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

        const controller = this.owner.lookup('controller:auth/forgot-password');

        await controller.sendSecureLink.perform({ preventDefault() {} });

        assert.true(this.owner.lookup('service:notifications').errored);
        assert.false(controller.isSent);
    });
});
