import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class AuthLoginRoute extends Route {
    @service session;
    @service universe;

    /**
     * If user is authentication redirect to console.
     *
     * @memberof AuthLoginRoute
     * @void
     */
    beforeModel(transition) {
        this.session.prohibitAuthentication('console');
        return this.universe.virtualRouteRedirect(transition, 'auth:login', 'virtual', { restoreQueryParams: true });
    }
}
