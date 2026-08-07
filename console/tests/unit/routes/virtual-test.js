import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Route | virtual', function (hooks) {
    setupTest(hooks);

    test('the view query param refreshes the model', function (assert) {
        const route = this.owner.lookup('route:virtual');

        assert.true(route.queryParams.view.refreshModel);
    });

    test('model resolves the auth:login menu item for the slug and transition view', function (assert) {
        const route = this.owner.lookup('route:virtual');
        const transition = { to: { queryParams: { view: 'signup' } } };

        route.universe.getViewFromTransition = (t) => t.to.queryParams.view;

        let lookedUp;
        route.menuService.lookupMenuItem = (...args) => {
            lookedUp = args;
            return 'menu-item';
        };

        assert.strictEqual(route.model({ slug: 'welcome' }, transition), 'menu-item');
        assert.deepEqual(lookedUp, ['auth:login', 'welcome', 'signup']);
    });

    test('beforeModel and afterModel fire their universe hooks', async function (assert) {
        const route = this.owner.lookup('route:virtual');
        const transition = { to: { queryParams: {} } };

        const executed = [];
        route.hookService.execute = (name) => executed.push(name);

        await route.beforeModel(transition);
        await route.afterModel({}, transition);

        assert.deepEqual(executed, ['virtual:before-model', 'virtual:after-model']);
    });
});
