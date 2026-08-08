import { module, test } from 'qunit';
import { initialize } from '@fleetbase/console/instance-initializers/initialize-widgets';

function widgetServiceStub() {
    return {
        dashboards: [],
        slots: [],
        // registerWidgets(dashboardId, widgets)
        registeredByDashboard: {},
        registerDashboard(id) {
            this.dashboards.push(id);
        },
        registerDashboardForSlot(slot, dashboard, options) {
            this.slots.push({ slot, dashboard, options });
        },
        registerWidgets(dashboardId, widgets) {
            this.registeredByDashboard[dashboardId] = widgets;
        },
    };
}

function appInstanceStub(widgetService, onBoot) {
    const universe = {
        getService: () => widgetService,
        onBoot,
    };

    return {
        lookup(name) {
            return name === 'service:universe' ? universe : { getMenuItems: () => [] };
        },
    };
}

module('Unit | Instance Initializer | initialize-widgets', function () {
    test('it registers the console dashboards and the default home slot', function (assert) {
        const widgetService = widgetServiceStub();

        initialize(appInstanceStub(widgetService, () => {}));

        assert.deepEqual(widgetService.dashboards, ['dashboard', 'admin'], 'both dashboards are registered');
        assert.strictEqual(widgetService.slots.length, 1);
        assert.deepEqual(widgetService.slots[0].slot, 'console.home');
        assert.deepEqual(widgetService.slots[0].dashboard, 'dashboard');
        assert.strictEqual(widgetService.slots[0].options.extension, 'core');
    });

    test('the widgets are registered once the universe boots', function (assert) {
        const widgetService = widgetServiceStub();
        let bootCallback;

        initialize(appInstanceStub(widgetService, (callback) => (bootCallback = callback)));

        assert.strictEqual(typeof bootCallback, 'function', 'registration waits for the boot hook');
        assert.deepEqual(widgetService.registeredByDashboard, {}, 'nothing is registered before boot');

        bootCallback();

        const ids = (widgetService.registeredByDashboard.dashboard ?? []).map((widget) => widget.id);
        assert.ok(ids.includes('fleetbase-blog'), 'the blog widget is registered on the dashboard');
        assert.ok(ids.includes('fleetbase-github-card'), 'the github card widget is registered on the dashboard');
        assert.ok(Array.isArray(widgetService.registeredByDashboard.admin), 'admin widgets are registered too');
    });
});
