import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';
import window from 'ember-window-mock';

const ADMIN_MENU_ITEMS = [
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

const ADMIN_MENU_PANELS = [
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

class IntlStub extends Service {
    translations = {
        'console.admin.menu.overview': 'Overview',
        'console.admin.menu.organizations': 'Organizations',
        'console.admin.menu.branding': 'Branding',
        'console.admin.menu.2fa-config': '2FA Config',
        'console.admin.menu.platform-api-token': 'Platform API Token',
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
        // ember-intl's service overrides cleanly via owner.register.
        this.owner.register('service:intl', IntlStub);

        // The universe service (and its universe/menu-service alias) is a pre-resolved
        // singleton that owner.register can't swap, and it boots real extension menus.
        // adminMenuItems/adminMenuPanels are @computed getters and transitionMenuItem is an
        // @action getter, so shadow each with an own value property on the injected instance.
        const seedMenus = (service) => {
            Object.defineProperty(service, 'adminMenuItems', { configurable: true, value: ADMIN_MENU_ITEMS });
            Object.defineProperty(service, 'adminMenuPanels', { configurable: true, value: ADMIN_MENU_PANELS });
        };
        seedMenus(this.owner.lookup('service:universe/menu-service'));

        const universe = this.owner.lookup('service:universe');
        seedMenus(universe);
        universe.transitions = [];
        Object.defineProperty(universe, 'transitionMenuItem', {
            configurable: true,
            value: (route, menuItem) => {
                universe.transitions.push({ route, menuItem });
            },
        });
    });

    test('it exists', function (assert) {
        let controller = this.owner.lookup('controller:console/admin');
        assert.ok(controller);
    });

    test('it builds core admin navigator items first', function (assert) {
        const controller = this.owner.lookup('controller:console/admin');
        const items = controller.navigationItems;

        assert.deepEqual(
            items.slice(0, 6).map((item) => item.label),
            ['Overview', 'Organizations', 'Branding', '2FA Config', 'Platform API Token', 'Schedule Monitor'],
            'core admin items retain their current order'
        );
        assert.deepEqual(
            items.slice(0, 6).map((item) => item.route),
            [
                'console.admin.index',
                'console.admin.organizations',
                'console.admin.branding',
                'console.admin.two-fa-settings',
                'console.admin.platform-api-token',
                'console.admin.schedule-monitor',
            ],
            'core admin items retain their routes'
        );
        assert.deepEqual(
            items.slice(0, 6).map((item) => item.icon),
            ['rectangle-list', 'building', 'palette', 'shield-halved', 'key', 'calendar-check'],
            'core admin items retain their icons'
        );
    });

    test('it converts loose registry admin menu items into root navigator items', function (assert) {
        const controller = this.owner.lookup('controller:console/admin');
        const registryItem = controller.navigationItems[6];

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
        const panel = controller.navigationItems[7];

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
        // keywords = [slug, view, section, title, label, description, ...tags].filter(Boolean);
        // this fixture item has no section/label, so those drop out.
        assert.deepEqual(panel.children[0].keywords, ['fleet-ops', 'navigator-app', 'Navigator App', 'Configure the navigator app.']);
        assert.true(panel.children[0]._virtual, 'panel children keep virtual metadata');
        assert.strictEqual(panel.children[0].slug, 'fleet-ops', 'panel child slug remains the panel slug for /admin/<panel>');
        assert.strictEqual(panel.children[0].view, 'navigator-app', 'panel child view remains the child slug for ?view=<item>');
        assert.strictEqual(typeof panel.children[0].activeWhen, 'function', 'panel children can report active state');
    });

    test('it marks virtual registry items active from the current admin virtual URL', function (assert) {
        const controller = this.owner.lookup('controller:console/admin');
        const rootRegistryItem = controller.navigationItems[6];
        const navigatorAppItem = controller.navigationItems[7].children[0];
        const mapItem = controller.navigationItems[7].children[1];

        // activeWhen delegates to ember-ui's isMenuItemActive, which reads location.pathname
        // through ember-window-mock — but its collaborator getUrlParam has no such import and
        // reads location.search off the real global window. The two therefore disagree unless
        // both are pointed at the URL under test, so this sets each of them.
        const originalUrl = globalThis.location.href;
        const visit = (url) => {
            window.location.href = url;
            globalThis.history.replaceState(null, '', url);
        };

        try {
            visit('/admin/fleet-ops?view=navigator-app');

            assert.true(navigatorAppItem.activeWhen(), 'matching panel child is active for /admin/<panel>?view=<item>');
            assert.false(mapItem.activeWhen(), 'sibling panel child is not active for a different view');
            assert.false(rootRegistryItem.activeWhen(), 'loose registry item is not active for a panel child URL');

            visit('/admin/registry-config');

            assert.true(rootRegistryItem.activeWhen(), 'loose registry item is active for /admin/<slug>');
            assert.false(navigatorAppItem.activeWhen(), 'panel child is not active for loose registry URL');
        } finally {
            globalThis.history.replaceState(null, '', originalUrl);
        }
    });

    test('it transitions registry items through the admin virtual route', function (assert) {
        const controller = this.owner.lookup('controller:console/admin');
        const universe = this.owner.lookup('service:universe');
        const rootRegistryItem = controller.navigationItems[6];
        const panelRegistryItem = controller.navigationItems[7].children[0];

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
        const systemConfig = controller.navigationItems[8];

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

/**
 * Registry-supplied menus are third-party data: panels and items arrive with whatever keys
 * the extension chose to set, so every read has a fallback. This drives those fallbacks.
 */
module('Unit | Controller | console/admin | registry fallbacks', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('service:intl', IntlStub);

        this.seed = (adminMenuItems, adminMenuPanels) => {
            const apply = (service) => {
                Object.defineProperty(service, 'adminMenuItems', { configurable: true, value: adminMenuItems });
                Object.defineProperty(service, 'adminMenuPanels', { configurable: true, value: adminMenuPanels });
            };
            apply(this.owner.lookup('service:universe/menu-service'));
            apply(this.owner.lookup('service:universe'));

            return this.owner.lookup('controller:console/admin');
        };
    });

    test('an extension registry that has registered nothing yields no registry entries', function (assert) {
        const controller = this.seed(undefined, undefined);

        assert.deepEqual(controller.registryNavigationItems, [], 'no navigation items');
        assert.deepEqual(controller.registryPanelItems, [], 'no panels');
    });

    test('a panel with only a title and slug is given a description and an icon', function (assert) {
        const controller = this.seed([], [{ title: 'Billing Config', slug: 'billing' }]);

        const [panel] = controller.registryPanelItems;
        assert.strictEqual(panel.id, 'billing');
        assert.strictEqual(panel.label, 'Billing Config');
        assert.strictEqual(panel.description, 'Billing Config admin controls.', 'a description is generated from the title');
        assert.strictEqual(panel.icon, 'folder', 'and a neutral icon stands in');
        assert.deepEqual(panel.keywords, ['billing', 'Billing Config'], 'the absent description is filtered out of the keywords');
        assert.deepEqual(panel.children, [], 'a panel with no items has no children');
    });

    test('a panel item with no slug is identified by its title', function (assert) {
        const controller = this.seed([], [{ title: 'Billing Config', slug: 'billing', items: [{ title: 'Invoices' }] }]);

        const [child] = controller.registryPanelItems[0].children;
        assert.strictEqual(child.id, 'billing:Invoices:index', 'the title stands in for the slug, and the view defaults to index');
        assert.strictEqual(child.label, 'Invoices', 'the title also stands in for the label');
    });
});
