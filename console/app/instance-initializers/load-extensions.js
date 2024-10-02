export function initialize(owner) {
    const universe = owner.lookup('service:universe');
    if (universe) {
        universe.createRegistries(['@fleetbase/console', 'auth:login']);
        universe.bootEngines(owner);
    }
}

export default {
    initialize,
};
