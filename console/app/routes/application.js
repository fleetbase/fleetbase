import Route from '@ember/routing/route';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import isElectron from '@fleetbase/ember-core/utils/is-electron';
import pathToRoute from '@fleetbase/ember-core/utils/path-to-route';

export default class ApplicationRoute extends Route {
    @service session;
    @service theme;
    @service fetch;
    @service urlSearchParams;
    @service modalsManager;
    @service intl;
    @service router;
    @tracked defaultTheme;

    /**
     * Check the installation status of Fleetbase and transition user accordingly.
     *
     * @return {void|Transition}
     * @memberof ApplicationRoute
     */
    // eslint-disable-next-line ember/classic-decorator-hooks
    async init() {
        super.init(...arguments);
        const { shouldInstall, shouldOnboard, defaultTheme } = await this.checkInstallationStatus();

        this.defaultTheme = defaultTheme;

        if (shouldInstall) {
            return this.router.transitionTo('install');
        }

        if (shouldOnboard) {
            return this.router.transitionTo('onboard');
        }
    }

    /**
     * Sets up session and handles redirects
     *
     * @param {Transition} transition
     * @return {Transition}
     * @memberof ApplicationRoute
     */
    async beforeModel() {
        await this.session.setup();

        const { isAuthenticated } = this.session;
        const shift = this.urlSearchParams.get('shift');

        if (isAuthenticated && shift) {
            return this.router.transitionTo(pathToRoute(shift));
        }
    }

    /**
     * On application route activation
     *
     * @memberof ApplicationRoute
     * @void
     */
    activate() {
        const bodyClassNames = [];

        if (isElectron()) {
            bodyClassNames.pushObject(['is-electron']);
        }

        this.theme.initialize({ bodyClassNames, theme: this.defaultTheme });
        this.intl.setLocale(['en-us']);
    }

    /**
     * Checks to determine if Fleetbase should be installed or user needs to onboard.
     *
     * @return {Promise}
     * @memberof ApplicationRoute
     */
    checkInstallationStatus() {
        return this.fetch.get('installer/initialize');
    }
}
