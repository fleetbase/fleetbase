import applyRouterFix from '@fleetbase/console/utils/router-refresh-patch';
import { debug } from '@ember/debug';

/**
 * Apply Router Fix Instance Initializer
 *
 * Applies the Fleetbase router refresh bug fix patch.
 * This patches the Ember router to handle dynamic segments correctly
 * when refreshing routes with query parameters.
 *
 * Runs as an instance-initializer because it needs access to the
 * application instance and router service.
 *
 * Bug: https://github.com/emberjs/ember.js/issues/19260
 *
 * @export
 * @param {ApplicationInstance} appInstance
 */
export function initialize(appInstance) {
    const startTime = performance.now();
    debug('[Initializing Router Patch] Applying router refresh bug fix...');

    try {
        applyRouterFix(appInstance);

        const endTime = performance.now();
        debug(`[Initializing Router Patch] Router fix applied in ${(endTime - startTime).toFixed(2)}ms`);
    } catch (error) {
        console.error('[Initializing Router Patch] Failed to apply router fix:', error);
    }
}

export default {
    name: 'apply-router-fix',
    initialize,
    // Run before extension loading to ensure router is patched early
    before: 'load-extensions',
};
