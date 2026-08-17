import loadRuntimeConfig from '@fleetbase/console/utils/runtime-config';
import { debug } from '@ember/debug';

/**
 * Load Runtime Config Initializer
 *
 * Loads runtime configuration from fleetbase.config.json before the application boots.
 * This must run first to ensure all config is available for other initializers.
 *
 * Uses `before` to ensure it runs before any other initializers.
 *
 * @export
 * @param {Application} application
 */
export function initialize(application) {
    const startTime = performance.now();
    debug('[Runtime Config] Loading runtime configuration...');

    // Defer readiness until config is loaded
    application.deferReadiness();
    (async () => {
        try {
            await loadRuntimeConfig();
            const endTime = performance.now();
            debug(`[Runtime Config] Runtime config loaded in ${(endTime - startTime).toFixed(2)}ms`);
            application.advanceReadiness();
        } catch (error) {
            console.error('[Runtime Config] Failed to load runtime config:', error);
            // Still advance readiness to prevent hanging
            application.advanceReadiness();
        }
    })();
}

export default {
    name: 'load-runtime-config',
    initialize,
    // Run after intl polyfills are loaded, before socketcluster
    after: 'load-intl-polyfills',
    before: 'load-socketcluster-client',
};
