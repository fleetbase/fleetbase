/**
 * Create console-specific registries
 * Runs after extensions are loaded
 */
export function initialize(appInstance) {
    const registryService = appInstance.lookup('service:universe/registry-service');

    console.log('[initialize-registries] Creating console registries...');
    
    // Create console-specific registries
    registryService.createRegistries(['@fleetbase/console', 'auth:login']);
}

export default {
    name: 'initialize-registries',
    after: 'load-extensions',
    initialize
};
