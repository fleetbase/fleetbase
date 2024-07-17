export function initialize (owner) {
    const universe = owner.lookup('service:universe');
    if (universe) {
        universe.bootEngines(owner);
    }
}

export default {
    initialize,
};
