import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import removeBootLoader from '../utils/remove-boot-loader';
import '@fleetbase/leaflet-routing-machine';

export default class ConsoleRoute extends Route {
    @service('universe/hook-service') hookService;
    @service store;
    @service session;
    @service router;
    @service currentUser;
    @service intl;
    @service oauthAuthorization;

    /**
     * Require authentication to access all `console` routes.
     *
     * @param {Transition} transition
     * @return {Promise}
     * @memberof ConsoleRoute
     */
    async beforeModel(transition) {
        await this.session.requireAuthentication(transition, 'auth.login');

        this.hookService.execute('console:before-model', this.session, this.router, transition);

        if (this.session.isAuthenticated) {
            return this.session.promiseCurrentUser(transition);
        }
    }

    /**
     * Register after model hook.
     *
     * @param {DS.Model} model
     * @param {Transition} transition
     * @memberof ConsoleRoute
     */
    async afterModel(model, transition) {
        this.hookService.execute('console:after-model', this.session, this.router, model, transition);
        removeBootLoader();

        // An app's "Continue with Fleetbase" request was waiting for the user to sign in (or sign
        // up). Unless a hook already sent them elsewhere (e.g. to finish onboarding), go back to it.
        if (!transition.isAborted) {
            this.oauthAuthorization.resume();
        }
    }

    /**
     * Route did complete transition.
     *
     * @memberof ConsoleRoute
     */
    @action didTransition() {
        this.hookService.execute('console:did-transition', this.session, this.router);
    }

    /**
     * Get the branding settings.
     *
     * @return {BrandModel}
     * @memberof ConsoleRoute
     */
    model() {
        return this.store.findRecord('brand', 1);
    }
}
