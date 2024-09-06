import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import '@fleetbase/leaflet-routing-machine';

export default class ConsoleRoute extends Route {
    @service store;
    @service session;
    @service router;

    /**
     * Require authentication to access all `console` routes.
     *
     * @param {Transition} transition
     * @return {Promise}
     * @memberof ConsoleRoute
     */
    async beforeModel(transition) {
        this.session.requireAuthentication(transition, 'auth.login');

        if (this.session.data.authenticated.type === 'customer') {
            return this.router.transitionTo('portal');
        }

        return this.session.promiseCurrentUser(transition);
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
