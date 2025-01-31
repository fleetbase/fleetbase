export default function getMountedEngineRoutePrefix(defaultName, fleetbase = {}) {
    let mountedEngineRoutePrefix = defaultName;
    if (fleetbase && typeof fleetbase.route === 'string') {
        mountedEngineRoutePrefix = fleetbase.route;
    }

    return `console.${mountedEngineRoutePrefix}.`;
}
