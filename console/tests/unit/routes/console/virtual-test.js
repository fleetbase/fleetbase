import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Route | console/virtual', function (hooks) {
    setupTest(hooks);

    test('the view query param refreshes the model', function (assert) {
        const route = this.owner.lookup('route:console/virtual');

        assert.true(route.queryParams.view.refreshModel);
    });

    test('model resolves the menu item for the slug and the transition view', function (assert) {
        const route = this.owner.lookup('route:console/virtual');
        const transition = { to: { queryParams: { view: 'settings' } } };

        // universe and universe/menu-service are pre-resolved singletons that owner.register
        // cannot swap, so patch the methods on the injected instances.
        route.universe.getViewFromTransition = (t) => t.to.queryParams.view;

        let lookedUp;
        route.menuService.lookupMenuItem = (...args) => {
            lookedUp = args;
            return 'menu-item';
        };

        assert.strictEqual(route.model({ slug: 'reports' }, transition), 'menu-item');
        assert.deepEqual(lookedUp, ['console', 'reports', 'settings']);
    });

    test('activate disables the sidebar and deactivate re-enables it', function (assert) {
        const route = this.owner.lookup('route:console/virtual');

        // enable/disable are @action, which are exposed as getters — shadow with values.
        const calls = [];
        Object.defineProperty(route.sidebar, 'disable', { configurable: true, value: () => calls.push('disable') });
        Object.defineProperty(route.sidebar, 'enable', { configurable: true, value: () => calls.push('enable') });

        route.activate();
        route.deactivate();

        assert.deepEqual(calls, ['disable', 'enable']);
    });
});
