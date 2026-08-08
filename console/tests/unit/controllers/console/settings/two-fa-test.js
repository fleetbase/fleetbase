import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import { settled } from '@ember/test-helpers';
import Service from '@ember/service';

module('Unit | Controller | console/settings/two-fa', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        // Constructor auto-loads system/company/user 2FA settings; stub fetch so lookup settles.
        class FetchStub extends Service {
            get() {
                return Promise.resolve({});
            }
        }
        this.owner.register('service:fetch', FetchStub);
    });

    test('the toggle actions immutably patch twoFaSettings', async function (assert) {
        const controller = this.owner.lookup('controller:console/settings/two-fa');
        await settled();

        controller.onTwoFaToggled(true);
        assert.true(controller.twoFaSettings.enabled);

        controller.onTwoFaMethodSelected('sms');
        assert.strictEqual(controller.twoFaSettings.method, 'sms');
        assert.true(controller.twoFaSettings.enabled, 'previous keys are preserved');

        controller.onTwoFaEnforceToggled(true);
        assert.true(controller.twoFaSettings.enforced);
    });
});
