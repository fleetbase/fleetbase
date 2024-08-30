import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import '@fleetbase/leaflet-routing-machine';

export default class ConsoleRoute extends Route {
    @service store;
    @service session;

    /**
     * Require authentication to access all `console` routes.
     *
     * @param {Transition} transition
     * @return {Promise}
     * @memberof ConsoleRoute
     */
    @action async beforeModel(transition) {
        this.session.requireAuthentication(transition, 'auth.login');

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
