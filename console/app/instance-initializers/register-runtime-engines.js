import { registerRuntimeEngines } from '@fleetbase/ember-core/utils/runtime-engines';

/**
 * Register Runtime Engines Instance Initializer
 *
 * Registers the runtime engines prepared before boot (see the
 * load-runtime-engines initializer) with this instance: their bundles go into
 * the asset loader's manifest (after load-asset-manifest has read the build's
 * own), their translations into ember-intl, and their extension loaders into
 * the extension manager's fallback, before load-extensions runs.
 *
 * @export
 * @param {ApplicationInstance} appInstance
 */
export function initialize(appInstance) {
    try {
        registerRuntimeEngines(appInstance);
    } catch (error) {
        console.error('[Runtime Engines] Failed to register runtime engines:', error);
    }
}

export default {
    name: 'register-runtime-engines',
    after: 'load-asset-manifest',
    before: 'load-extensions',
    initialize,
};
