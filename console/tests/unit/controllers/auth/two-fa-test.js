import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

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
