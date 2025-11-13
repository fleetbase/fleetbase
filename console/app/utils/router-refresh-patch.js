import { debug } from '@ember/debug';
/**
 * Fleetbase Router Refresh Bug Fix Utility
 *
 * This utility patches the Ember.js router refresh bug that causes
 * "missing params" errors when transitioning to nested routes with
 * dynamic segments while query parameters with refreshModel: true
 * are present.
 *
 * Bug: https://github.com/emberjs/ember.js/issues/19260
 *
 * @author Fleetbase Pte Ltd <hello@fleetbase.io>
 * @version 1.0.0
 */

/**
 * Applies the router refresh bug fix patch
 * @param {Application} application - The Ember application instance
 */
export function patchRouterRefresh(application) {
    if (!application || typeof application.lookup !== 'function') {
        debug('[Fleetbase Router Patch] Invalid application instance provided');
        return;
    }

    try {
        const router = application.lookup('router:main');

        if (!router || !router._routerMicrolib) {
            debug('[Fleetbase Router Patch] Router not found or invalid');
            return;
        }

        // Check if already patched
        if (router._routerMicrolib._fleetbaseRefreshPatched) {
            debug('[Fleetbase Router Patch] Already applied, skipping');
            return;
        }

        const originalRefresh = router._routerMicrolib.refresh.bind(router._routerMicrolib);

        router._routerMicrolib.refresh = function (pivotRoute) {
            const previousTransition = this.activeTransition;
            const state = previousTransition ? previousTransition[this.constructor.STATE_SYMBOL] : this.state;
            const routeInfos = state.routeInfos;

            if (pivotRoute === undefined) {
                pivotRoute = routeInfos[0].route;
            }

            const name = routeInfos[routeInfos.length - 1].name;
            const currentRouteInfo = routeInfos[routeInfos.length - 1];

            // Extract current dynamic segment parameters
            const contexts = [];
            if (currentRouteInfo && currentRouteInfo.params) {
                const handlers = this.recognizer.handlersFor(name);
                const targetHandler = handlers[handlers.length - 1];

                if (targetHandler && targetHandler.names && targetHandler.names.length > 0) {
                    targetHandler.names.forEach((paramName) => {
                        if (currentRouteInfo.params[paramName] !== undefined) {
                            contexts.push(currentRouteInfo.params[paramName]);
                        }
                    });
                }
            }

            const NamedTransitionIntent = this.constructor.NamedTransitionIntent;
            const intent = new NamedTransitionIntent(
                this,
                name,
                pivotRoute,
                contexts, // Preserve dynamic segments instead of empty array
                this._changedQueryParams || state.queryParams
            );

            const newTransition = this.transitionByIntent(intent, false);

            if (previousTransition && previousTransition.urlMethod === 'replace') {
                newTransition.method(previousTransition.urlMethod);
            }

            return newTransition;
        };

        // Mark as patched
        router._routerMicrolib._fleetbaseRefreshPatched = true;

        debug('[Fleetbase Router Patch] Successfully applied router refresh bug fix');
    } catch (error) {
        debug('[Fleetbase Router Patch] Failed to apply patch: ' + error.message);
    }
}

/**
 * Alternative error suppression approach for cases where patching fails
 * @param {Application} application - The Ember application instance
 */
export function suppressRouterRefreshErrors(application) {
    if (!application) {
        debug('[Fleetbase Router Patch] Invalid application instance for error suppression');
        return;
    }

    try {
        // Global error handler for unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            const error = event.reason;
            if (error?.message?.includes("You didn't provide enough string/numeric parameters to satisfy all of the dynamic segments")) {
                debug('[Fleetbase Router Patch] Suppressed known Ember route refresh bug:', error.message);
                event.preventDefault(); // Prevent the error from being logged
            }
        });

        // Ember.js error handler
        if (window.Ember) {
            const originalEmberError = window.Ember.onerror;

            window.Ember.onerror = function (error) {
                if (error?.message?.includes("You didn't provide enough string/numeric parameters to satisfy all of the dynamic segments")) {
                    debug('[Fleetbase Router Patch] Suppressed known Ember route refresh bug:', error.message);
                    return; // Suppress the error
                }

                // Let other errors through
                if (originalEmberError) {
                    return originalEmberError(error);
                }
                throw error;
            };
        }

        debug('[Fleetbase Router Patch] Error suppression handlers installed');
    } catch (error) {
        debug('[Fleetbase Router Patch] Failed to install error suppression: ' + error.message);
    }
}

/**
 * Main function to apply the complete router fix
 * @param {Application} application - The Ember application instance
 * @param {Object} options - Configuration options
 * @param {boolean} options.suppressErrors - Whether to also install error suppression (default: true)
 */
export default function applyRouterFix(application, options = {}) {
    const { suppressErrors = true } = options;

    debug('[Fleetbase Router Patch] Applying Ember router refresh bug fix...');

    // Apply the main patch
    patchRouterRefresh(application);

    // Optionally install error suppression as fallback
    if (suppressErrors) {
        suppressRouterRefreshErrors(application);
    }

    debug('[Fleetbase Router Patch] Router fix application complete');
}
