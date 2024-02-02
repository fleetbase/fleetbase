import { faGithub } from '@fortawesome/free-brands-svg-icons';

export function initialize(application) {
    const universe = application.lookup('service:universe');
    const defaultWidgets = [
        {
            did: 'fleetbase-blog',
            name: 'Fleetbase Blog',
            description: 'Lists latest news and events from the Fleetbase official team.',
            icon: 'newspaper',
            component: 'fleetbase-blog',
            grid_options: { w: 8, h: 9 },
            options: {
                title: 'Fleetbase Blog',
            },
        },
        {
            did: 'github-card',
            name: 'Github Card',
            description: 'Displays current Github stats from the official Fleetbase repo.',
            icon: faGithub,
            component: 'github-card',
            grid_options: { w: 4, h: 8 },
            options: {
                title: 'Github Card',
            },
        },
    ];

    universe.registerDefaultDashboardWidgets(defaultWidgets);
    universe.registerDashboardWidgets(defaultWidgets);
}

export default {
    initialize,
};
