import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import { settled } from '@ember/test-helpers';
import Service from '@ember/service';

module('Unit | Controller | console/settings/notifications', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        // Constructor auto-performs getSettings; stub fetch so lookup settles deterministically.
        class FetchStub extends Service {
            get() {
                return Promise.resolve({ notificationSettings: {} });
            }
        }
        this.owner.register('service:fetch', FetchStub);
    });

    test('onSelectNotifiable records notifiables and derives transport methods', async function (assert) {
        const controller = this.owner.lookup('controller:console/settings/notifications');
        await settled();

        controller.onSelectNotifiable({ definition: 'order.created', name: 'Order Created' }, [{ value: 'user_1' }]);

        const settings = controller.notificationSettings;
        const keys = Object.keys(settings);
        assert.strictEqual(keys.length, 1, 'one notification key is recorded');

        const entry = settings[keys[0]];
        assert.deepEqual(entry.notifiables, [{ value: 'user_1' }]);
        assert.strictEqual(entry.definition, 'order.created');
        assert.deepEqual(entry.via, [{ identifier: 'user_1', methods: ['email', 'sms'] }], 'each notifiable gets the default transport methods');
    });

    test('mutateNotificationSettings merges into the existing settings', async function (assert) {
        const controller = this.owner.lookup('controller:console/settings/notifications');
        await settled();

        controller.notificationSettings = { a: 1 };
        controller.mutateNotificationSettings({ b: 2 });

        assert.deepEqual(controller.notificationSettings, { a: 1, b: 2 });
    });
});
