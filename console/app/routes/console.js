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
        // Normalize icon URL to use local icon if it's from S3
        if (model?.icon_url && model.icon_url.includes('flb-assets.s3.ap-southeast-1.amazonaws.com')) {
            model.set('icon_url', '/images/icon.png');
        }
        
        this.hookService.execute('console:after-model', this.session, this.router, model, transition);
        removeBootLoader();
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
