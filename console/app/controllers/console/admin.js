import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import isMenuItemActive from '@fleetbase/ember-ui/utils/is-menu-item-active';

export default class ConsoleAdminController extends Controller {
    @service('universe/menu-service') menuService;
    @service universe;
    @service intl;

    get navigationItems() {
        return [
            ...this.coreNavigationItems,
            ...this.registryNavigationItems,
            ...this.registryPanelItems,
            this.apiTrafficNavigationItem,
            this.databaseBackupsNavigationItem,
            this.authConfigNavigationItem,
            this.systemConfigNavigationItem,
        ];
    }

    get coreNavigationItems() {
        return [
            {
                label: this.intl.t('console.admin.menu.overview'),
                description: 'Review admin dashboard metrics and platform health.',
                icon: 'rectangle-list',
                route: 'console.admin.index',
                keywords: ['admin', 'overview', 'dashboard'],
            },
            {
                label: this.intl.t('console.admin.menu.organizations'),
                description: 'Manage organizations, users, extensions, activity, and settings.',
                icon: 'building',
                route: 'console.admin.organizations',
                keywords: ['companies', 'organizations', 'tenants'],
            },
            {
                label: this.intl.t('console.admin.menu.branding'),
                description: 'Configure console branding, logos, colors, and theme defaults.',
                icon: 'palette',
                route: 'console.admin.branding',
                keywords: ['brand', 'logo', 'theme', 'colors'],
            },
            {
                label: this.intl.t('console.admin.menu.platform-api-token'),
                description: 'Manage the platform API token used by trusted platform integrations.',
                icon: 'key',
                route: 'console.admin.platform-api-token',
                keywords: ['platform', 'api', 'token', 'security', 'organizations'],
            },
            {
                label: this.intl.t('console.admin.schedule-monitor.schedule-monitor'),
                description: 'Review scheduled tasks and their recent execution logs.',
                icon: 'calendar-check',
                route: 'console.admin.schedule-monitor',
                keywords: ['scheduler', 'cron', 'tasks', 'logs'],
            },
        ];
    }

    get registryNavigationItems() {
        return (this.menuService.adminMenuItems ?? []).map((menuItem) => this.buildRegistryItem(menuItem));
    }

    get registryPanelItems() {
        return (this.menuService.adminMenuPanels ?? []).map((panel) => {
            return {
                id: panel.slug,
                label: panel.title,
                description: panel.description ?? `${panel.title} admin controls.`,
                icon: panel.icon ?? 'folder',
                keywords: [panel.slug, panel.title, panel.description].filter(Boolean),
                children: (panel.items ?? []).map((menuItem) => this.buildRegistryItem(menuItem, panel)),
            };
        });
    }

    /**
     * Who is calling the public API and how hard, and the limits that keep one busy
     * consumer from starving the rest of the platform.
     */
    get apiTrafficNavigationItem() {
        return {
            label: 'API Traffic',
            description: 'Monitor API consumers and configure rate limiting.',
            icon: 'gauge-high',
            keywords: ['api', 'traffic', 'rate limit', 'throttle', 'requests'],
            children: [
                {
                    label: 'API Consumers',
                    description: 'See which API keys, users and addresses drive traffic or are being throttled.',
                    icon: 'chart-column',
                    route: 'console.admin.api-consumers',
                    keywords: ['api', 'consumers', 'usage', 'requests', 'throttled', '429'],
                },
                {
                    label: 'Rate Limits',
                    description: 'Configure API rate limits and per-organization overrides.',
                    icon: 'gauge',
                    route: 'console.admin.rate-limits',
                    keywords: ['rate limit', 'throttle', 'requests per minute', '429', 'overrides'],
                },
            ],
        };
    }

    /**
     * Scheduled database dumps to a filesystem disk, with retention and failure alerts.
     */
    get databaseBackupsNavigationItem() {
        return {
            label: 'Database Backups',
            description: 'Schedule database backups, choose where they are stored, and review recent runs.',
            icon: 'database',
            route: 'console.admin.database-backups',
            keywords: ['database', 'backup', 'backups', 'dump', 'mysql', 'retention', 's3', 'restore'],
        };
    }

    /**
     * How people sign in — kept apart from System Config, which is infrastructure
     * (mail, storage, queues). Grouping only affects the sidebar: each child keeps its
     * own route, so existing links to the 2FA page are unaffected.
     */
    get authConfigNavigationItem() {
        return {
            label: 'Auth Config',
            description: 'Configure how people sign in: OAuth providers and two-factor authentication.',
            icon: 'user-shield',
            keywords: ['auth', 'authentication', 'sign in', 'login', 'security'],
            children: [
                {
                    label: this.intl.t('console.admin.menu.oauth'),
                    description: 'Configure sign-in with Google, Microsoft, GitHub and Apple.',
                    icon: 'right-to-bracket',
                    route: 'console.admin.oauth-settings',
                    keywords: ['oauth', 'sso', 'sign in', 'login', 'google', 'microsoft', 'github', 'apple'],
                },
                {
                    label: this.intl.t('console.admin.menu.2fa-config'),
                    description: 'Configure administrator two-factor authentication policy.',
                    icon: 'shield-halved',
                    route: 'console.admin.two-fa-settings',
                    keywords: ['two factor', '2fa', 'security', 'mfa'],
                },
            ],
        };
    }

    get systemConfigNavigationItem() {
        return {
            label: 'System Config',
            description: 'Configure core platform services, mail, storage, queues, sockets, and notifications.',
            icon: 'sliders',
            keywords: ['system', 'config', 'configuration', 'services'],
            children: [
                {
                    label: this.intl.t('console.admin.menu.services'),
                    description: 'Configure platform service providers.',
                    icon: 'bell-concierge',
                    route: 'console.admin.config.services',
                    keywords: ['services', 'providers'],
                },
                {
                    label: this.intl.t('console.admin.menu.mail'),
                    description: 'Configure mail delivery.',
                    icon: 'envelope',
                    route: 'console.admin.config.mail',
                    keywords: ['mail', 'email', 'smtp'],
                },
                {
                    label: this.intl.t('console.admin.menu.filesystem'),
                    description: 'Configure file storage.',
                    icon: 'hard-drive',
                    route: 'console.admin.config.filesystem',
                    keywords: ['filesystem', 'files', 'storage'],
                },
                {
                    label: this.intl.t('console.admin.menu.queue'),
                    description: 'Configure background queue workers.',
                    icon: 'layer-group',
                    route: 'console.admin.config.queue',
                    keywords: ['queue', 'workers', 'jobs'],
                },
                {
                    label: this.intl.t('console.admin.menu.socket'),
                    description: 'Configure realtime socket settings.',
                    icon: 'plug',
                    route: 'console.admin.config.socket',
                    keywords: ['socket', 'realtime', 'websocket'],
                },
                {
                    label: this.intl.t('console.admin.menu.push-notifications'),
                    description: 'Configure notification channels.',
                    icon: 'tower-broadcast',
                    route: 'console.admin.config.notification-channels',
                    keywords: ['push notifications', 'notifications', 'channels'],
                },
            ],
        };
    }

    buildRegistryItem(menuItem, panel = null) {
        const registryItem = {
            ...menuItem,
            id: `${panel?.slug ?? 'admin'}:${menuItem.slug ?? menuItem.title}:${menuItem.view ?? 'index'}`,
            _virtual: true,
            label: menuItem.label ?? menuItem.title,
            description: menuItem.description,
            icon: menuItem.icon,
            iconPrefix: menuItem.iconPrefix,
            priority: menuItem.priority,
            slug: menuItem.slug,
            view: menuItem.view,
            section: menuItem.section,
            _isPanelItem: menuItem._isPanelItem,
            _panelSlug: menuItem._panelSlug,
            component: menuItem.component,
            componentParams: menuItem.componentParams,
            permission: menuItem.permission,
            visible: menuItem.visible,
            keywords: [menuItem.slug, menuItem.view, menuItem.section, menuItem.title, menuItem.label, menuItem.description, ...(menuItem.tags ?? [])].filter(Boolean),
            activeWhen: () => isMenuItemActive(menuItem.section, menuItem.slug, menuItem.view),
        };

        registryItem.onClick = () => this.universe.transitionMenuItem('console.admin.virtual', registryItem);

        return registryItem;
    }
}
