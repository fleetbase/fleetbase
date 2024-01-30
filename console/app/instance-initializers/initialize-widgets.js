export function initialize(application) {
    const universe = application.lookup('service:universe');

    const fleetOpsWidgets = [
        {
            name: 'Open Issues',
            component: 'dashboard/count',
            grid_options: { w: 2, h: 2 },
            options: {
                title: 'Open Issues',
                value: 0,
            },
        },
    ];

    const storefrontWidgets = [
        {
            name: 'Total Products',
            component: 'dashboard/count',
            grid_options: { w: 2, h: 2 },
            options: {
                title: 'Total Products',
                value: 0,
            },
        },
    ];

    const iamWidgets = [
        {
            name: 'User count',
            component: 'dashboard/count',
            grid_options: { w: 2, h: 2 },
            options: {
                title: 'User count',
                value: 0,
            },
        },
        {
            name: 'Group count',
            component: 'dashboard/count',
            grid_options: { w: 2, h: 2 },
            options: {
                title: 'Group count',
                value: 0,
            },
        },
    ];

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
        ...fleetOpsWidgets,
        ...storefrontWidgets,
        ...iamWidgets,
    ];

    universe.registerWidgets(availableWidgets);
}

export default {
    initialize,
};
