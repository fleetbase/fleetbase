import DashboardCountComponent from '../components/dashboard/count';
import FleetbaseBlogComponent from '../components/fleetbase-blog';
import GithubCardComponent from '../components/github-card';

export function initialize(application) {
    const universe = application.lookup('service:universe');

    const fleetOpsWidgets = [
        {
            name: 'Open Issues',
            component: DashboardCountComponent,
            gridOptions: { w: 2, h: 2 },
            options: {},
        },
    ];

    const storefrontWidgets = [
        {
            name: 'Total Products',
            component: DashboardCountComponent,
            gridOptions: { w: 2, h: 2 },
            options: {},
        },
    ];

    const iamWidgets = [
        {
            name: 'User count',
            component: DashboardCountComponent,
            gridOptions: { w: 2, h: 2 },
            options: {},
        },
        {
            name: 'Group count',
            component: DashboardCountComponent,
            gridOptions: { w: 2, h: 2 },
            options: {},
        },
    ];

    const availableWidgets = [
        {
            name: 'Fleetbase Blog',
            component: FleetbaseBlogComponent,
            gridOptions: { w: 8, h: 3 },
            options: {},
        },
        {
            name: 'Github Card',
            component: GithubCardComponent,
            gridOptions: { w: 4, h: 3 },
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
