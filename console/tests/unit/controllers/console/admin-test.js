import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import window from 'ember-window-mock';

class MenuServiceStub {
    adminMenuItems = [
        {
            title: 'Registry Config',
            label: 'Registry Config',
            description: 'Configure the registry bridge.',
            icon: 'gear',
            slug: 'registry-config',
            view: null,
            tags: ['extensions'],
        },
    ];

    adminMenuPanels = [
        {
            title: 'Fleet-Ops Config',
            slug: 'fleet-ops',
            icon: 'truck',
            items: [
                {
                    title: 'Navigator App',
                    icon: 'location-arrow',
                    slug: 'fleet-ops',
                    view: 'navigator-app',
                    description: 'Configure the navigator app.',
                },
                {
                    title: 'Map',
                    icon: 'map',
                    slug: 'fleet-ops',
                    view: 'map',
                },
            ],
        },
    ];
}

class UniverseStub {
    transitions = [];

    transitionMenuItem(route, menuItem) {
        this.transitions.push({ route, menuItem });
    }
}

class IntlStub {
    translations = {
        'console.admin.menu.overview': 'Overview',
        'console.admin.menu.organizations': 'Organizations',
        'console.admin.menu.branding': 'Branding',
        'console.admin.menu.2fa-config': '2FA Config',
        'console.admin.schedule-monitor.schedule-monitor': 'Schedule Monitor',
        'console.admin.menu.services': 'Services',
        'console.admin.menu.mail': 'Mail',
        'console.admin.menu.filesystem': 'Filesystem',
        'console.admin.menu.queue': 'Queue',
        'console.admin.menu.socket': 'Socket',
        'console.admin.menu.push-notifications': 'Push Notifications',
    };

    t(key) {
        return this.translations[key] ?? key;
    }
}

module('Unit | Controller | console/admin', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('service:universe/menu-service', MenuServiceStub);
        this.owner.register('service:universe', UniverseStub);
        this.owner.register('service:intl', IntlStub);
    });

    test('it exists', function (assert) {
        let controller = this.owner.lookup('controller:console/admin');
        assert.ok(controller);
    });

    test('it builds core admin navigator items first', function (assert) {
        const controller = this.owner.lookup('controller:console/admin');
        const items = controller.navigationItems;

        assert.deepEqual(
            items.slice(0, 5).map((item) => item.label),
            ['Overview', 'Organizations', 'Branding', '2FA Config', 'Schedule Monitor'],
            'core admin items retain their current order'
        );
        assert.deepEqual(
            items.slice(0, 5).map((item) => item.route),
            ['console.admin.index', 'console.admin.organizations', 'console.admin.branding', 'console.admin.two-fa-settings', 'console.admin.schedule-monitor'],
            'core admin items retain their routes'
        );
        assert.deepEqual(
            items.slice(0, 5).map((item) => item.icon),
            ['rectangle-list', 'building', 'palette', 'shield-halved', 'calendar-check'],
            'core admin items retain their icons'
        );
    });

    test('it converts loose registry admin menu items into root navigator items', function (assert) {
        const controller = this.owner.lookup('controller:console/admin');
        const registryItem = controller.navigationItems[5];

        assert.strictEqual(registryItem.label, 'Registry Config');
        assert.strictEqual(registryItem.icon, 'gear');
        assert.true(registryItem._virtual, 'loose registry items keep virtual metadata');
        assert.strictEqual(registryItem.slug, 'registry-config');
        assert.strictEqual(registryItem.view, null);
        assert.deepEqual(registryItem.keywords, ['registry-config', 'Registry Config', 'Registry Config', 'Configure the registry bridge.', 'extensions']);
        assert.strictEqual(typeof registryItem.activeWhen, 'function', 'registry items can report active state');
        assert.strictEqual(typeof registryItem.onClick, 'function', 'registry items keep click handlers');
    });

    test('it converts registry admin panels into nested navigator branches', function (assert) {
        const controller = this.owner.lookup('controller:console/admin');
        const panel = controller.navigationItems[6];

        assert.strictEqual(panel.label, 'Fleet-Ops Config');
        assert.strictEqual(panel.icon, 'truck');
        assert.deepEqual(
            panel.children.map((item) => item.label),
            ['Navigator App', 'Map'],
            'panel children preserve registered order'
        );
        assert.deepEqual(
            panel.children.map((item) => item.icon),
            ['location-arrow', 'map'],
            'panel children preserve icons'
        );
        assert.deepEqual(panel.children[0].keywords, ['fleet-ops', 'navigator-app', 'Navigator App', 'Navigator App', 'Configure the navigator app.']);
        assert.true(panel.children[0]._virtual, 'panel children keep virtual metadata');
        assert.strictEqual(panel.children[0].slug, 'fleet-ops', 'panel child slug remains the panel slug for /admin/<panel>');
        assert.strictEqual(panel.children[0].view, 'navigator-app', 'panel child view remains the child slug for ?view=<item>');
        assert.strictEqual(typeof panel.children[0].activeWhen, 'function', 'panel children can report active state');
    });

    test('it marks virtual registry items active from the current admin virtual URL', function (assert) {
        const controller = this.owner.lookup('controller:console/admin');
        const rootRegistryItem = controller.navigationItems[5];
        const navigatorAppItem = controller.navigationItems[6].children[0];
        const mapItem = controller.navigationItems[6].children[1];

        window.location.href = '/admin/fleet-ops?view=navigator-app';

        assert.true(navigatorAppItem.activeWhen(), 'matching panel child is active for /admin/<panel>?view=<item>');
        assert.false(mapItem.activeWhen(), 'sibling panel child is not active for a different view');
        assert.false(rootRegistryItem.activeWhen(), 'loose registry item is not active for a panel child URL');

        window.location.href = '/admin/registry-config';

        assert.true(rootRegistryItem.activeWhen(), 'loose registry item is active for /admin/<slug>');
        assert.false(navigatorAppItem.activeWhen(), 'panel child is not active for loose registry URL');
    });

    test('it transitions registry items through the admin virtual route', function (assert) {
        const controller = this.owner.lookup('controller:console/admin');
        const universe = this.owner.lookup('service:universe');
        const rootRegistryItem = controller.navigationItems[5];
        const panelRegistryItem = controller.navigationItems[6].children[0];

        rootRegistryItem.onClick();
        panelRegistryItem.onClick();

        assert.deepEqual(
            universe.transitions.map((transition) => transition.route),
            ['console.admin.virtual', 'console.admin.virtual'],
            'registry items use the admin virtual route'
        );
        assert.strictEqual(universe.transitions[0].menuItem.slug, 'registry-config');
        assert.true(universe.transitions[0].menuItem._virtual, 'root registry click passes virtual-enriched item');
        assert.strictEqual(universe.transitions[1].menuItem.slug, 'fleet-ops');
        assert.strictEqual(universe.transitions[1].menuItem.view, 'navigator-app', 'panel item view is preserved for query param routing');
        assert.true(universe.transitions[1].menuItem._virtual, 'panel registry click passes virtual-enriched item');
    });

    test('it adds system config as a nested navigator branch', function (assert) {
        const controller = this.owner.lookup('controller:console/admin');
        const systemConfig = controller.navigationItems[7];

        assert.strictEqual(systemConfig.label, 'System Config');
        assert.deepEqual(
            systemConfig.children.map((item) => item.label),
            ['Services', 'Mail', 'Filesystem', 'Queue', 'Socket', 'Push Notifications'],
            'system config children retain their current order'
        );
        assert.deepEqual(
            systemConfig.children.map((item) => item.route),
            [
                'console.admin.config.services',
                'console.admin.config.mail',
                'console.admin.config.filesystem',
                'console.admin.config.queue',
                'console.admin.config.socket',
                'console.admin.config.notification-channels',
            ],
            'system config children retain their routes'
        );
    });
});
