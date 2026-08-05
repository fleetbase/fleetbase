import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

module('Unit | Controller | auth/login', function (hooks) {
    setupTest(hooks);

    test("reset('success') clears the form and loading flags", function (assert) {
        const controller = this.owner.lookup('controller:auth/login');
        controller.isLoading = true;
        controller.isSlowConnection = true;
        controller.identity = 'ron@fleetbase.io';
        controller.password = 'secret';
        controller.isValidating = true;

        controller.reset('success');

        assert.false(controller.isLoading);
        assert.false(controller.isSlowConnection);
        assert.strictEqual(controller.identity, null);
        assert.strictEqual(controller.password, null);
        assert.false(controller.isValidating);
    });

    test("reset('error') clears only the password and keeps the identity", function (assert) {
        const controller = this.owner.lookup('controller:auth/login');
        controller.identity = 'ron@fleetbase.io';
        controller.password = 'secret';

        controller.reset('error');

        assert.strictEqual(controller.password, null);
        assert.strictEqual(controller.identity, 'ron@fleetbase.io', 'identity is preserved on error');
    });

    test('login warns and stops when no identity is provided', async function (assert) {
        class NotificationsStub extends Service {
            warning() {
                this.warned = true;
            }
        }
        this.owner.register('service:notifications', NotificationsStub);

        const controller = this.owner.lookup('controller:auth/login');
        controller.identity = null;

        await controller.login({ preventDefault() {} });

        assert.true(this.owner.lookup('service:notifications').warned, 'warns about the missing identity');
        assert.false(controller.isLoading, 'never enters the loading state');
    });
});
