import { Widget } from '@fleetbase/ember-core/contracts';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { debug } from '@ember/debug';

/**
 * Register dashboard and widgets for FleetbaseConsole
 * Runs after extensions are loaded
 */
export function initialize(appInstance) {
    const universe = appInstance.lookup('service:universe');
    const widgetService = universe.getService('widget');
    const menuService = appInstance.lookup('service:universe/menu-service');

    debug('[Initializing Widgets] Registering console dashboard and widgets...');

    // Register the console dashboard
    widgetService.registerDashboard('dashboard');
    widgetService.registerDashboard('admin');

    // Wait for all extension to boot
    universe.onBoot(() => {
        // Create widget definitions
        const widgets = [
            new Widget({
                id: 'fleetbase-blog',
                name: 'Fleetbase Blog',
                description: 'Lists latest news and events from the Fleetbase official team.',
                icon: 'newspaper',
                component: 'fleetbase-blog',
                grid_options: { w: 7, h: 9, minW: 7, minH: 9 },
                default: true,
            }),
            new Widget({
                id: 'fleetbase-github-card',
                name: 'Github Card',
                description: 'Displays current Github stats from the official Fleetbase repo.',
                icon: faGithub,
                component: 'github-card',
                grid_options: { w: 5, h: 9, minW: 5, minH: 9 },
                default: true,
            }),
        ];

        const adminKpiTile = (id, name, description, icon, slug, options = {}) =>
            new Widget({
                id,
                name,
                description,
                icon,
                component: 'admin/widget/kpi-tile',
                category: 'KPI Tiles',
                options: { title: name, icon, slug, ...options },
                grid_options: { w: 3, h: 4, minW: 3, minH: 4 },
                default: true,
            });

        const registeredAdminWidgets = menuService.getMenuItems('console:admin:dashboard:widgets') || [];
        const normalizeAdminWidget = (widget) => {
            if (widget instanceof Widget) {
                return widget;
            }

            return new Widget({
                category: 'Extension Widgets',
                default: false,
                ...widget,
            });
        };

        const adminWidgets = [
            adminKpiTile('admin-kpi-users-total', 'Users', 'Total platform users with 30-day trend.', 'users', 'users-total'),
            adminKpiTile('admin-kpi-organizations-total', 'Organizations', 'Total organizations with 30-day trend.', 'building', 'organizations-total'),
            adminKpiTile('admin-kpi-active-admins', 'Active Admins', 'Active system administrators.', 'user-shield', 'active-admins', { footnote: 'admin access' }),
            adminKpiTile(
                'admin-kpi-organizations-attention',
                'Pending Attention',
                'Organizations with ownership, onboarding, or status concerns.',
                'building-circle-exclamation',
                'organizations-attention',
                {
                    footnote: 'needs review',
                }
            ),
            adminKpiTile('admin-kpi-new-users', 'New Users', 'Users created in the last 30 days.', 'user-plus', 'new-users'),
            adminKpiTile('admin-kpi-new-organizations', 'New Organizations', 'Organizations created in the last 30 days.', 'building-circle-check', 'new-organizations'),
            adminKpiTile('admin-kpi-failed-jobs', 'Failed Jobs', 'Failed queue jobs waiting for review.', 'triangle-exclamation', 'failed-jobs', { footnote: 'queue health' }),
            adminKpiTile('admin-kpi-suspicious-activity', 'Suspicious Activity', 'Recent sensitive admin or auth activity.', 'shield-halved', 'suspicious-activity', {
                footnote: 'last 30d',
            }),
            new Widget({
                id: 'admin-system-diagnostics',
                name: 'System Diagnostics',
                description: 'Configuration health for mail, queue, filesystem, socket, notifications, and scheduler.',
                icon: 'heart-pulse',
                component: 'admin/widget/list-panel',
                category: 'Diagnostics',
                options: { title: 'System Diagnostics', icon: 'heart-pulse', slug: 'system-diagnostics' },
                grid_options: { w: 6, h: 8, minW: 5, minH: 7 },
                default: true,
            }),
            new Widget({
                id: 'admin-activity',
                name: 'Admin Activity',
                description: 'Recent sensitive activity across admin-managed resources.',
                icon: 'clock-rotate-left',
                component: 'admin/widget/list-panel',
                category: 'Security',
                options: { title: 'Admin Activity', icon: 'clock-rotate-left', slug: 'admin-activity' },
                grid_options: { w: 6, h: 8, minW: 5, minH: 7 },
                default: true,
            }),
            new Widget({
                id: 'admin-organization-risk-queue',
                name: 'Organization Risk Queue',
                description: 'Organizations that need support, ownership, onboarding, or status review.',
                icon: 'building-shield',
                component: 'admin/widget/list-panel',
                category: 'Operations',
                options: { title: 'Organization Risk Queue', icon: 'building-shield', slug: 'organization-risk-queue' },
                grid_options: { w: 6, h: 8, minW: 5, minH: 7 },
                default: true,
            }),
            new Widget({
                id: 'admin-configuration-gaps',
                name: 'Configuration Gaps',
                description: 'Missing or risky system configuration detected by the console host.',
                icon: 'screwdriver-wrench',
                component: 'admin/widget/list-panel',
                category: 'Diagnostics',
                options: { title: 'Configuration Gaps', icon: 'screwdriver-wrench', slug: 'configuration-gaps' },
                grid_options: { w: 6, h: 8, minW: 5, minH: 7 },
                default: true,
            }),
            new Widget({
                id: 'admin-platform-growth-chart',
                name: 'Platform Growth Trend',
                description: 'User and organization creation trend for the current and previous 30-day windows.',
                icon: 'chart-line',
                component: 'admin/widget/chart-panel',
                category: 'Operations',
                options: { title: 'Platform Growth Trend', icon: 'chart-line', slug: 'platform-growth' },
                grid_options: { w: 6, h: 9, minW: 5, minH: 8 },
                default: false,
            }),
            ...registeredAdminWidgets.map(normalizeAdminWidget),
        ];

        // Register widgets
        widgetService.registerWidgets('dashboard', widgets);
        widgetService.registerWidgets('admin', adminWidgets);
    });
}

export default {
    name: 'initialize-widgets',
    after: 'load-extensions',
    initialize,
};
