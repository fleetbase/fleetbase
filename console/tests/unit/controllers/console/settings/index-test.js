import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import { settled } from '@ember/test-helpers';
import Service from '@ember/service';

module('Unit | Controller | console/settings/index', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        // The constructor auto-performs loadTimezones; stub fetch so lookup resolves deterministically.
        class FetchStub extends Service {
            get() {
                return Promise.resolve(['UTC', 'America/New_York']);
            }
        }
        this.owner.register('service:fetch', FetchStub);
    });

    test('loadTimezones populates the timezones list on construction', async function (assert) {
        const controller = this.owner.lookup('controller:console/settings/index');
        await settled();

        assert.deepEqual(controller.timezones, ['UTC', 'America/New_York']);
    });

    test('saveSettings persists the model and notifies success', async function (assert) {
        class NotificationsStub extends Service {
            success() {
                this.succeeded = true;
            }
        }
        this.owner.register('service:notifications', NotificationsStub);

        const controller = this.owner.lookup('controller:console/settings/index');
        let saved = false;
        controller.model = {
            save() {
                saved = true;
                return Promise.resolve();
            },
        };

        await controller.saveSettings.perform();

        assert.true(saved, 'model is saved');
        assert.true(this.owner.lookup('service:notifications').succeeded);
    });
});
