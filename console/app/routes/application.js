import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import isElectron from '@fleetbase/ember-core/utils/is-electron';
import pathToRoute from '@fleetbase/ember-core/utils/path-to-route';
import removeBootLoader from '../utils/remove-boot-loader';

export default class ApplicationRoute extends Route {
    @service('universe/hook-service') hookService;
    @service('universe/extension-manager') extensionManager;
    @service session;
    @service theme;
    @service urlSearchParams;
    @service modalsManager;
    @service intl;
    @service currentUser;
    @service router;
    @service installation;

    /**
     * Handle the transition into the application.
     *
     * @memberof ApplicationRoute
     */
    @action willTransition(transition) {
        this.hookService.execute('application:will-transition', this.session, this.router, transition);
    }

    /**
     * On application route activation
     *
     * @memberof ApplicationRoute
     * @void
     */
    @action activate() {
        this.initializeTheme();
        this.initializeLocale();
    }

    /**
     * The application loading event.
     * Here will just run extension hooks.
     *
     * @memberof ApplicationRoute
     */
    @action loading(transition) {
        this.hookService.execute('application:loading', this.session, this.router, transition);
    }

    /**
     * Handle application-level route errors.
     *
     * @param {Error|Object} error
     * @return {boolean}
     * @memberof ApplicationRoute
     */
    @action error(error) {
        if (this.installation.handleError(error)) {
            return false;
        }

        return true;
    }

    /**
     * Sets up session and handles redirects
     *
     * @param {Transition} transition
     * @return {Transition}
     * @memberof ApplicationRoute
     */
    async beforeModel(transition) {
        await this.session.setup();
        await this.extensionManager.waitForBoot();

        this.hookService.execute('application:before-model', this.session, this.router, transition);

        const shift = this.urlSearchParams.get('shift');
        if (this.session.isAuthenticated && shift) {
            return this.router.transitionTo(pathToRoute(shift));
        }
    }

    /**
     * Remove boot loader if not authenticated.
     *
     * @memberof ApplicationRoute
     */
    afterModel() {
        if (!this.session.isAuthenticated) removeBootLoader();
    }

    /**
     * Initializes the application's theme settings, applying necessary class names and default theme configurations.
     *
     * This method prepares the theme by setting up an array of class names that should be applied to the
     * application's body element. If the application is running inside an Electron environment, it adds the
     * `'is-electron'` class to the array. It then calls the `initialize` method of the `theme` service.
     */
    initializeTheme() {
        const bodyClassNames = [];

        if (isElectron()) {
            bodyClassNames.pushObject(['is-electron']);
        }

        this.theme.initialize({ bodyClassNames });
    }

    /**
     * Initializes the application's locale settings based on the current user's preferences.
     *
     * This method retrieves the user's preferred locale using the `getOption` method from the `currentUser` service.
     * If no locale is set by the user, it defaults to `'en-US'`. It then sets the application's locale by calling
     * the `setLocale` method of the `intl` service with the retrieved locale.
     */
    initializeLocale() {
        const locale = this.currentUser.getOption('locale', 'en-US');
        this.intl.setLocale([locale]);
    }
}
