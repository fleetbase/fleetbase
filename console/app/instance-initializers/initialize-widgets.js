export function initialize(application) {
    const universe = application.lookup('service:universe');

    const fleetOpsWidgetConfigs = [
        { name: 'Earnings', format: 'money', currency: 'USD' },
        { name: 'Fuel costs', format: 'money', currency: 'USD' },
        { name: 'Total distance traveled', format: 'meters' },
        { name: 'Orders canceled' },
        { name: 'Orders completed' },
        { name: 'Orders in progress' },
        { name: 'Orders scheduled' },
        { name: 'Drivers online' },
        { name: 'Total drivers' },
        { name: 'Open Issues' },
        { name: 'Total customers' },
        { name: 'Open Issues' },
        { name: 'Resolved Issues' },
    ];

    const storefrontWidgetConfigs = [
        { name: 'Total Products' },
        { name: 'Total Stores' },
        { name: 'Total Networks' },
        { name: 'Ordser in progress' },
        { name: 'Orders completed' },
        { name: 'Orders canceled' },
    ];

    const iamWidgetConfigs = [{ name: 'User count' }, { name: 'Group count' }, { name: 'Policy count' }, { name: 'Role count' }];

    const createWidgets = (configs) => configs.map(({ name, format, currency }) => createWidget(name, format, currency));

    const createWidget = (name, format, currency) => ({
        name,
        component: 'dashboard/count',
        grid_options: { w: 2, h: 2 },
        options: {
            title: name,
            value: 0,
            ...(format && { format }),
            ...(currency && { currency }),
        },
    });

    const fleetOpsWidgets = createWidgets(fleetOpsWidgetConfigs);
    const storefrontWidgets = createWidgets(storefrontWidgetConfigs);
    const iamWidgets = createWidgets(iamWidgetConfigs);

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
