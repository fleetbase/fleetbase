import Controller from '@ember/controller';
import { inject as service } from '@ember/service';

export default class ConsoleAdminController extends Controller {
    @service('universe/menu-service') menuService;
    @service universe;
    @service intl;

    get navigationItems() {
        return [...this.coreNavigationItems, ...this.registryNavigationItems, ...this.registryPanelItems, this.systemConfigNavigationItem];
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
                label: this.intl.t('console.admin.menu.2fa-config'),
                description: 'Configure administrator two-factor authentication policy.',
                icon: 'shield-halved',
                route: 'console.admin.two-fa-settings',
                keywords: ['two factor', '2fa', 'security', 'mfa'],
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
        return {
            id: `${panel?.slug ?? 'admin'}:${menuItem.slug ?? menuItem.title}:${menuItem.view ?? 'index'}`,
            label: menuItem.label ?? menuItem.title,
            description: menuItem.description,
            icon: menuItem.icon,
            iconPrefix: menuItem.iconPrefix,
            keywords: [menuItem.slug, menuItem.view, menuItem.section, menuItem.title, menuItem.label, menuItem.description, ...(menuItem.tags ?? [])].filter(Boolean),
            onClick: () => this.universe.transitionMenuItem('console.admin.virtual', menuItem),
        };
    }
}
