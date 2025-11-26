export function initialize(application) {
    const universe = application.lookup('service:universe');
    if (universe) {
        universe.createRegistries(['@fleetbase/console', 'auth:login']);
        universe.bootEngines(application);
    }
}

export default {
    initialize,
};
