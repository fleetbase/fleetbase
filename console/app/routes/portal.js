import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class PortalRoute extends Route {
    @service store;
    @service session;

    /**
     * Require authentication to access all `portal` routes.
     *
     * @param {Transition} transition
     * @return {Promise}
     * @memberof ConsoleRoute
     */
    async beforeModel(transition) {
        this.session.requireAuthentication(transition, 'auth.portal-login');

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
