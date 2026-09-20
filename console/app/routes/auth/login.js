import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import removeBootLoader from '../../utils/remove-boot-loader';

export default class AuthLoginRoute extends Route {
    @service session;
    @service universe;
    @service installation;
    @service router;
    @service oauth;

    @action activate() {
        removeBootLoader();
    }

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

        // Which providers to offer is a server-side decision an administrator makes at
        // runtime, so it cannot come from the build-time config. Not awaited as a
        // blocking step of sign-in: a failure here leaves the list empty and the form
        // renders email/password exactly as it did before OAuth existed.
        this.oauth.loadProviders();

        return this.universe.virtualRouteRedirect(transition, 'auth:login', 'virtual', { restoreQueryParams: true });
    }
}
