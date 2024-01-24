import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import '@fleetbase/leaflet-routing-machine';

export default class ConsoleRoute extends Route {
    /**
     * Inject the `store` service
     *
     * @var {Service}
     */
    @service store;

    /**
     * Inject the `fetch` service
     *
     * @var {Service}
     */
    @service fetch;

    /**
     * Inject the `session` service
     *
     * @var {Service}
     */
    @service session;

    /**
     * Inject the `intl` service
     *
     * @var {Service}
     */
    @service intl;

    /**
     * Inject the `currentUser` service
     *
     * @var {Service}
     */
    @service currentUser;

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

    /**
     * We will use this hook to preload engines
     *
     * @void
     */
    @action afterModel() {
        this.fetchSessionInfo();
    }

    /**
     * We will use this hook to setup controller and more
     *
     * @void
     */
    @action setupController(controller, model) {
        super.setupController(controller, model);

        // Get and set user locale
        this.fetch.get('users/locale').then(({ locale }) => {
            this.intl.setLocale(locale);
        });

        // Get user organizations
        this.fetch.get('auth/organizations').then((organizations) => {
            this.currentUser.setOption('organizations', organizations);
            controller.organizations = organizations;
        });
    }

    /**
     * Use this hook to fetch user related queries
     *
     * @void
     */
    @action fetchSessionInfo() {
        this.fetch.shouldResetCache();
        this.fetch
            .cachedGet(
                'lookup/whois',
                {},
                {
                    expirationInterval: 60,
                    expirationIntervalUnit: 'minutes',
                }
            )
            .then((whois) => {
                this.currentUser.setOption('whois', whois);
            });
    }
}
