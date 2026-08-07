import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

module('Unit | Route | console/admin/schedule-monitor', function (hooks) {
    setupTest(hooks);

    test('model loads the scheduled task list', async function (assert) {
        let requested;
        class FetchStub extends Service {
            get(path) {
                requested = path;
                return Promise.resolve(['task-a']);
            }
        }
        this.owner.register('service:fetch', FetchStub);

        const route = this.owner.lookup('route:console/admin/schedule-monitor');

        assert.deepEqual(await route.model(), ['task-a']);
        assert.strictEqual(requested, 'schedule-monitor/tasks');
    });
});
