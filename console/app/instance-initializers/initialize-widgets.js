import { faGithub } from '@fortawesome/free-brands-svg-icons';

export function initialize(application) {
    const universe = application.lookup('service:universe');

    const availableWidgets = [
        {
            name: 'Fleetbase Blog',
            icon: 'newspaper',
            component: 'fleetbase-blog',
            grid_options: { w: 8, h: 9 },
            options: {
                title: 'Fleetbase Blog',
            },
        },
        {
            name: 'Github Card',
            icon: faGithub,
            component: 'github-card',
            grid_options: { w: 4, h: 8 },
            options: {
                title: 'Github Card',
            },
        },
        {
            name: 'Fleet-Ops Metrics',
            icon: 'route',
            component: 'dashboard/metric',
            grid_options: { w: 12, h: 12 },
            options: {
                title: 'Fleet-Ops Metrics',
                endpoint: 'int/v1/fleet-ops/dashboard',
            },
        },
        {
            name: 'IAM Metrics',
            icon: 'shield-halved',
            component: 'dashboard/metric',
            grid_options: { w: 12, h: 7 },
            options: {
                title: 'IAM Metrics',
                endpoint: 'int/v1/metrics/iam-dashboard',
            },
        },
        {
            name: 'Storefront Metrics',
            icon: 'store',
            component: 'dashboard/metric',
            grid_options: { w: 12, h: 8 },
            options: {
                title: 'Storefront Metrics',
                endpoint: 'storefront/int/v1/dashboard',
            },
        },
    ];

    universe.registerWidgets(availableWidgets);
}

export default {
    initialize,
};
