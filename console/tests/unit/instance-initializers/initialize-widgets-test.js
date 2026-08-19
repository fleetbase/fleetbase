import { module, test } from 'qunit';
import { initialize } from '@fleetbase/console/instance-initializers/initialize-widgets';
import { Widget } from '@fleetbase/ember-core/contracts';

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

/**
 * Extensions can contribute admin widgets through the menu registry. Whatever they hand
 * over has to end up as a Widget, and an extension that registers nothing at all must not
 * break the boot.
 */
module('Unit | Instance Initializer | initialize-widgets | extension widgets', function () {
    function appInstanceWithRegistry(widgetService, onBoot, registered) {
        const universe = { getService: () => widgetService, onBoot };

        return {
            lookup(name) {
                return name === 'service:universe' ? universe : { getMenuItems: () => registered };
            },
        };
    }

    function bootWith(registered) {
        const widgetService = widgetServiceStub();
        let bootCallback;

        initialize(appInstanceWithRegistry(widgetService, (callback) => (bootCallback = callback), registered));
        bootCallback();

        return widgetService.registeredByDashboard.admin;
    }

    test('a registry that has never been written to contributes no extension widgets', function (assert) {
        const admin = bootWith(undefined);

        assert.ok(Array.isArray(admin), 'the core admin widgets are still registered');
        assert.deepEqual(
            admin.filter((widget) => widget.category === 'Extension Widgets'),
            [],
            'and nothing is added on top of them'
        );
    });

    test('a plain object from an extension is wrapped as a Widget, an existing Widget is left alone', function (assert) {
        const alreadyAWidget = new Widget({ id: 'ext-prebuilt', name: 'Prebuilt', component: 'ext/prebuilt', category: 'Prebuilt Category' });
        const admin = bootWith([alreadyAWidget, { id: 'ext-raw', name: 'Raw', component: 'ext/raw' }]);

        const prebuilt = admin.find((widget) => widget.id === 'ext-prebuilt');
        assert.strictEqual(prebuilt, alreadyAWidget, 'an extension that built its own Widget keeps it');
        assert.strictEqual(prebuilt.category, 'Prebuilt Category', 'including its own category');

        const raw = admin.find((widget) => widget.id === 'ext-raw');
        assert.ok(raw instanceof Widget, 'a plain object is promoted to a Widget');
        assert.strictEqual(raw.name, 'Raw', 'its own fields survive');
        assert.strictEqual(raw.category, 'Extension Widgets', 'and it is filed under the extension category');
        assert.strictEqual(raw.component, 'ext/raw', 'and still points at the extension component');
    });
});
