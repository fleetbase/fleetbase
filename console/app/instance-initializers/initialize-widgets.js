import { Widget } from '@fleetbase/ember-core/contracts';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { debug } from '@ember/debug';

/**
 * Register dashboard and widgets for FleetbaseConsole
 * Runs after extensions are loaded
 */
export function initialize(appInstance) {
    const widgetService = appInstance.lookup('service:universe/widget-service');

    debug('[Initializing Widgets] Registering console dashboard and widgets...');

    // Register the console dashboard
    widgetService.registerDashboard('dashboard');

    // Create widget definitions
    const widgets = [
        new Widget({
            id: 'fleetbase-blog',
            name: 'Fleetbase Blog',
            description: 'Lists latest news and events from the Fleetbase official team.',
            icon: 'newspaper',
            component: 'fleetbase-blog',
            grid_options: { w: 8, h: 9, minW: 8, minH: 9 },
            default: true,
        }),
        new Widget({
            id: 'fleetbase-github-card',
            name: 'Github Card',
            description: 'Displays current Github stats from the official Fleetbase repo.',
            icon: faGithub,
            component: 'github-card',
            grid_options: { w: 4, h: 8, minW: 4, minH: 8 },
            default: true,
        }),
    ];

    // Register widgets
    widgetService.registerWidgets('dashboard', widgets);
}

export default {
    name: 'initialize-widgets',
    after: 'load-extensions',
    initialize,
};
