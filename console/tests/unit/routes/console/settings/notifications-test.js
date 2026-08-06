import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

module('Unit | Route | console/settings/notifications', function (hooks) {
    setupTest(hooks);

    test('model fetches the notification registry and notifiables', async function (assert) {
        class FetchStub extends Service {
            get(path) {
                return Promise.resolve(`${path}-result`);
            }
        }
        this.owner.register('service:fetch', FetchStub);

        const route = this.owner.lookup('route:console/settings/notifications');
        const model = await route.model();

        assert.strictEqual(model.registry, 'notifications/registry-result');
        assert.strictEqual(model.notifiables, 'notifications/notifiables-result');
    });

    test('setupController groups the registry by package and loads the company', async function (assert) {
        const route = this.owner.lookup('route:console/settings/notifications');
        route.currentUser.loadCompany = () => Promise.resolve('acme');

        const controller = {};
        const registry = [
            { package: 'core', name: 'a' },
            { package: 'core', name: 'b' },
            { package: 'fleet-ops', name: 'c' },
        ];

        await route.setupController(controller, { registry, notifiables: ['user'] });

        assert.deepEqual(Object.keys(controller.groupedNotifications), ['core', 'fleet-ops']);
        assert.strictEqual(controller.groupedNotifications.core.length, 2);
        assert.deepEqual(controller.notifiables, ['user']);
        assert.strictEqual(controller.company, 'acme');
    });
});
