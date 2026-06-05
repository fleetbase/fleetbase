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

    debug('[Initializing Widgets] Registering console dashboard and widgets...');

    // Register the console dashboard
    widgetService.registerDashboard('dashboard');

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

        // Register widgets
        widgetService.registerWidgets('dashboard', widgets);
    });
}

export default {
    name: 'initialize-widgets',
    after: 'load-extensions',
    initialize,
};
