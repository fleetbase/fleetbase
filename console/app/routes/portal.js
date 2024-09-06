import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class PortalRoute extends Route {
    @service store;
    @service session;
    @service theme;

    /**
     * Require authentication to access all `portal` routes.
     *
     * @param {Transition} transition
     * @return {Promise}
     * @memberof PortalRoute
     */
    async beforeModel(transition) {
        this.session.requireAuthentication(transition, 'auth.portal-login');

        return this.session.promiseCurrentUser(transition);
    }

    /**
     * Get the branding settings.
     *
     * @return {BrandModel}
     * @memberof PortalRoute
     */
    model() {
        return this.store.findRecord('brand', 1);
    }

    /**
     * Add the fleetbase-portal body class.
     *
     * @memberof PortalRoute
     */
    activate() {
        this.theme.setRoutebodyClassNames(['fleetbase-portal']);
    }
}
