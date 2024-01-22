import FleetbaseBlogComponent from '../components/fleetbase-blog';

export function initialize(application) {
    const universe = application.lookup('service:universe');

    universe.registerWidget({
        name: 'Fleetbase Blog',
        position: {},
        options: { component: FleetbaseBlogComponent },
    });
}

export default {
    initialize,
};
