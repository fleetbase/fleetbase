import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Controller | console/admin/organizations/index/users', function (hooks) {
    setupTest(hooks);

    test('search updates the query and resets to the first page', function (assert) {
        const controller = this.owner.lookup('controller:console/admin/organizations/index/users');
        controller.nestedPage = 5;

        controller.search({ target: { value: 'ron' } });

        assert.strictEqual(controller.nestedQuery, 'ron');
        assert.strictEqual(controller.nestedPage, 1);
    });

    test('search coerces a missing value to an empty query', function (assert) {
        const controller = this.owner.lookup('controller:console/admin/organizations/index/users');

        controller.search({ target: {} });

        assert.strictEqual(controller.nestedQuery, '');
    });

    test('setOverlayContext stores the overlay context api', function (assert) {
        const controller = this.owner.lookup('controller:console/admin/organizations/index/users');
        const api = { close() {} };

        controller.setOverlayContext(api);

        assert.strictEqual(controller.contextApi, api);
    });

    test('onPressClose closes the overlay and returns to the organizations index', function (assert) {
        const controller = this.owner.lookup('controller:console/admin/organizations/index/users');
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

        assert.true(closed);
        assert.strictEqual(transitioned, 'console.admin.organizations.index');
    });
});
