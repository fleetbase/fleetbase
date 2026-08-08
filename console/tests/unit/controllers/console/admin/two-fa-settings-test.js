import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import { settled } from '@ember/test-helpers';
import Service from '@ember/service';

module('Unit | Controller | console/admin/two-fa-settings', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        // Constructor auto-loads the system config; stub fetch so lookup settles deterministically.
        class FetchStub extends Service {
            get() {
                return Promise.resolve({});
            }
        }
        this.owner.register('service:fetch', FetchStub);
    });

    test('the toggle actions immutably patch twoFaSettings', async function (assert) {
        const controller = this.owner.lookup('controller:console/admin/two-fa-settings');
        await settled();

        controller.onTwoFaToggled(true);
        assert.true(controller.twoFaSettings.enabled);

        controller.onTwoFaMethodSelected('authenticator');
        assert.strictEqual(controller.twoFaSettings.method, 'authenticator');
        assert.true(controller.twoFaSettings.enabled, 'previous keys are preserved');

        controller.onTwoFaEnforceToggled(true);
        assert.true(controller.twoFaSettings.enforced);
    });
});
