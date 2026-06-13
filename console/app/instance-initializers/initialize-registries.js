import { debug } from '@ember/debug';

/**
 * Create console-specific registries
 * Runs after extensions are loaded
 */
export function initialize(appInstance) {
    const registryService = appInstance.lookup('service:universe/registry-service');

    debug('[Initializing Registries] Creating console registries...');

    // Create console-specific registries
    registryService.createRegistries([
        '@fleetbase/console',
        'auth:login',
        'console:home:before-dashboard',
        'console:home:after-dashboard',
        'console:admin:dashboard:widgets',
        'console:admin:organization:tabs',
        'console:admin:organization:actions',
        'console:admin:organization:overview-panels',
        'console:admin:organization:settings-panels',
        'console:admin:organization:extensions',
        'console:admin:organization:activity',
    ]);
}

export default {
    name: 'initialize-registries',
    after: 'load-extensions',
    initialize,
};
