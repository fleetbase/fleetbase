import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class AuthLoginRoute extends Route {
    @service session;
    @service universe;
    @service router; // Inject the router service
    /**
     * If user is authentication redirect to console.
     *
     * @memberof AuthLoginRoute
     * @void
     */
    beforeModel(transition) {
        // Check if already authenticated before showing login
        if (this.session.isAuthenticated) {
            return this.router.transitionTo('console.fleet-ops');
        }
        // Only check prohibition if not already authenticated
        this.session.prohibitAuthentication('console');
        return this.universe.virtualRouteRedirect(transition, 'auth:login', 'virtual', { restoreQueryParams: true });
    }
}
