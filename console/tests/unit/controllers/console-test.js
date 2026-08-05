import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Controller | console', function (hooks) {
    setupTest(hooks);

    test('onAction dispatches to a matching method with its params', function (assert) {
        const controller = this.owner.lookup('controller:console');
        const calls = [];
        controller.ping = (...args) => calls.push(args);

        controller.onAction('ping', 1, 'two');

        assert.deepEqual(calls, [[1, 'two']], 'the named method receives the params');
    });

    test('onAction ignores an unknown action name', function (assert) {
        const controller = this.owner.lookup('controller:console');

        controller.onAction('doesNotExist');

        assert.ok(true, 'no error is thrown for a missing method');
    });

    test('currentRouteClass dasherizes the current route name', function (assert) {
        const controller = this.owner.lookup('controller:console');
        Object.defineProperty(controller.router, 'currentRouteName', { value: 'console.admin.index', configurable: true });

        assert.strictEqual(controller.currentRouteClass, 'console-admin-index');
    });
});
