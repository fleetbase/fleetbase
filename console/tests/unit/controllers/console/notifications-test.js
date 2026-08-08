import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Controller | console/notifications', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        // The controller's constructor subscribes to the universe event bus; the real
        // singleton can't be swapped via owner.register, so neutralize .on on the instance.
        this.owner.lookup('service:universe').on = () => {};
    });

    test('selectNotification toggles a notification in the selection', function (assert) {
        const controller = this.owner.lookup('controller:console/notifications');
        const a = { id: '1' };

        controller.selectNotification(a);
        assert.deepEqual(controller.selected, [a], 'adds when not selected');

        controller.selectNotification(a);
        assert.deepEqual(controller.selected, [], 'removes when already selected');
    });

    test('selectAll selects every model row then clears on a second call', function (assert) {
        const controller = this.owner.lookup('controller:console/notifications');
        const a = { id: '1' };
        const b = { id: '2' };
        controller.model = { length: 2, toArray: () => [a, b] };

        controller.selectAll();
        assert.deepEqual(controller.selected, [a, b], 'selects all rows');

        controller.selectAll();
        assert.deepEqual(controller.selected, [], 'clears when all are already selected');
    });
});
