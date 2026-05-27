import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class AuthLoginRoute extends Route {
    @service session;
    @service universe;
    @service installation;
    @service router;

    /**
     * If user is authentication redirect to console.
     *
     * @memberof AuthLoginRoute
     * @void
     */
    async beforeModel(transition) {
        const { notConfigured, shouldOnboard, transition: installTransition } = await this.installation.checkOnboarding();

        if (notConfigured) {
            return installTransition;
        }

        if (shouldOnboard) {
            return this.router.transitionTo('onboard');
        }

        this.session.prohibitAuthentication('console');
        return this.universe.virtualRouteRedirect(transition, 'auth:login', 'virtual', { restoreQueryParams: true });
    }
}
