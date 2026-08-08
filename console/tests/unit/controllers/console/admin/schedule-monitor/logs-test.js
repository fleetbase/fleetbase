import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

module('Unit | Controller | console/admin/schedule-monitor/logs', function (hooks) {
    setupTest(hooks);

    test('setOverlayContext stores the overlay context api', function (assert) {
        const controller = this.owner.lookup('controller:console/admin/schedule-monitor/logs');
        const api = { close() {} };

        controller.setOverlayContext(api);

        assert.strictEqual(controller.contextApi, api);
    });

    test('onPressClose closes the overlay and returns to the schedule monitor', function (assert) {
        const controller = this.owner.lookup('controller:console/admin/schedule-monitor/logs');
        let closed = false;
        let transitioned;
        controller.setOverlayContext({
            close() {
                closed = true;
            },
        });
        controller.router.transitionTo = (route) => {
            transitioned = route;
            return Promise.resolve();
        };

        controller.onPressClose();

        assert.true(closed, 'overlay is closed');
        assert.strictEqual(transitioned, 'console.admin.schedule-monitor');
    });

    test('onPressClose still transitions when no overlay context is set', function (assert) {
        const controller = this.owner.lookup('controller:console/admin/schedule-monitor/logs');
        let transitioned;
        controller.router.transitionTo = (route) => {
            transitioned = route;
            return Promise.resolve();
        };

        controller.onPressClose();

        assert.strictEqual(transitioned, 'console.admin.schedule-monitor');
    });

    test('reload loads logs for the given task', async function (assert) {
        class FetchStub extends Service {
            get(path) {
                this.path = path;
                return Promise.resolve([{ id: 'log_1' }]);
            }
        }
        this.owner.register('service:fetch', FetchStub);

        const controller = this.owner.lookup('controller:console/admin/schedule-monitor/logs');
        await controller.reload.perform({ id: 'task_1' });

        assert.strictEqual(this.owner.lookup('service:fetch').path, 'schedule-monitor/task_1/logs');
        assert.deepEqual(controller.logs, [{ id: 'log_1' }]);
    });
});
