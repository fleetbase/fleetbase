export function initialize(application) {
    const universe = application.lookup('service:universe');

    const fleetOpsWidgets = [
        {
            name: 'Open Issues',
            component: 'dashboard/count',
            grid_options: { w: 2, h: 2 },
            options: {},
        },
    ];

    const storefrontWidgets = [
        {
            name: 'Total Products',
            component: 'dashboard/count',
            grid_options: { w: 2, h: 2 },
            options: {},
        },
    ];

    const iamWidgets = [
        {
            name: 'User count',
            component: 'dashboard/count',
            grid_options: { w: 2, h: 2 },
            options: {},
        },
        {
            name: 'Group count',
            component: 'dashboard/count',
            grid_options: { w: 2, h: 2 },
            options: {},
        },
    ];

    const availableWidgets = [
        {
            name: 'Fleetbase Blog',
            component: 'fleetbase-blog',
            grid_options: { w: 8, h: 3 },
            options: {},
        },
        {
            name: 'Github Card',
            component: 'github-card',
            grid_options: { w: 4, h: 3 },
            options: {},
        },
        ...fleetOpsWidgets,
        ...storefrontWidgets,
        ...iamWidgets,
    ];

    universe.registerWidgets(availableWidgets);
}

export default {
    initialize,
};
