export function initialize(application) {
    const universe = application.lookup('service:universe');

    const availableWidgets = [
        {
            name: 'Fleetbase Blog',
            component: 'fleetbase-blog',
            grid_options: { w: 8, h: 3 },
            options: {
                title: 'Fleetbase Blog',
            },
        },
        {
            name: 'Github Card',
            component: 'github-card',
            grid_options: { w: 4, h: 3 },
            options: {
                title: 'Github Card',
            },
        },
        {
            name: 'Fleet-Ops Metrics',
            component: 'dashboard/metric',
            grid_options: { w: 12, h: 4 },
            options: {
                title: 'Fleet-Ops Metrics',
                endpoint: 'int/v1/fleet-ops/dashboard',
            },
        },
        {
            name: 'Identity & Access Management Metrics',
            component: 'dashboard/metric',
            grid_options: { w: 12, h: 3 },
            options: {
                title: 'Identity & Access Management Metrics',
                endpoint: 'int/v1/metrics/iam-dashboard',
            },
        },
        {
            name: 'Storefront Metrics',
            component: 'dashboard/metric',
            grid_options: { w: 12, h: 3 },
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
