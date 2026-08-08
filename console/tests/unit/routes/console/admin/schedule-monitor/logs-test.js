import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

module('Unit | Route | console/admin/schedule-monitor/logs', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        class FetchStub extends Service {
            requested = [];
            get(path) {
                this.requested.push(path);
                return Promise.resolve(path.endsWith('/logs') ? ['log-a', 'log-b'] : { id: 'task_1' });
            }
        }
        this.owner.register('service:fetch', FetchStub);
    });

    test('model loads the scheduled task by id', async function (assert) {
        const route = this.owner.lookup('route:console/admin/schedule-monitor/logs');

        assert.deepEqual(await route.model({ id: 'task_1' }), { id: 'task_1' });
        assert.deepEqual(route.fetch.requested, ['schedule-monitor/task_1']);
    });

    test('setupController loads the logs for the resolved task', async function (assert) {
        const route = this.owner.lookup('route:console/admin/schedule-monitor/logs');
        const controller = {};

        await route.setupController(controller, { id: 'task_1' });

        assert.deepEqual(controller.logs, ['log-a', 'log-b']);
        assert.deepEqual(route.fetch.requested, ['schedule-monitor/task_1/logs']);
    });
});
