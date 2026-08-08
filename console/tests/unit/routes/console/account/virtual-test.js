import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Route | console/account/virtual', function (hooks) {
    setupTest(hooks);

    test('the view query param refreshes the model', function (assert) {
        assert.true(this.owner.lookup('route:console/account/virtual').queryParams.view.refreshModel);
    });

    test('model looks up the console:account menu item for the slug and view', function (assert) {
        const route = this.owner.lookup('route:console/account/virtual');
        const transition = { to: { queryParams: { view: 'profile' } } };

        route.universe.getViewFromTransition = (t) => t.to.queryParams.view;

        let lookedUp;
        route.menuService.lookupMenuItem = (...args) => {
            lookedUp = args;
            return 'menu-item';
        };

        assert.strictEqual(route.model({ slug: 'auth' }, transition), 'menu-item');
        assert.deepEqual(lookedUp, ['console:account', 'auth', 'profile']);
    });
});
