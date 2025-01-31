import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { computed } from '@ember/object';
import { dasherize } from '@ember/string';
import { isArray } from '@ember/array';
import { getOwner } from '@ember/application';

export default class ThemeService extends Service {
    /**
     * Lookup the correct router for the engine and or console.
     *
     * @readonly
     * @memberof ThemeService
     */
    get router() {
        const owner = getOwner(this);
        const router = owner.lookup('router:main');

        return router;
    }

    /**
     * Inject the current user service
     *
     * @var {Service}
     */
    @service currentUser;

    /**
     * The current active theme, uses the system preffered mode to set default
     * refers to the theme in headData service
     *
     * @var {String}
     */
    @computed('currentTheme', 'initialTheme') get activeTheme() {
        const userSetTheme = this.currentUser.getOption(`theme`);

        if (userSetTheme) {
            return userSetTheme;
        }

        if (this.initialTheme) {
            return this.initialTheme;
        }

        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }

        // default to dark theme
        return this.currentTheme;
    }

    /**
     * Set the activeTheme in the headData service
     */
    set activeTheme(theme) {
        document.body.dataset.theme = theme;
        this.currentTheme = theme;
    }

    /**
     * Current theme, defaults to dark, active theme represents the theme set by user OS
     *
     * @var {String}
     */
    @tracked currentTheme = 'dark';

    /**
     * The initially set theme
     *
     * @var {String}
     */
    @tracked initialTheme;

    /**
     * The current route name as style class
     *
     * @var {String}
     */
    get routeClassName() {
        return dasherize(typeof this.router.currentRouteName === 'string' ? this.router.currentRouteName.replace(/\./g, ' ') : 'fleetbase-console');
    }

    /**
     * The current route
     *
     * @var {Route}
     */
    get currentRoute() {
        return getOwner(this).lookup(`route:${this.router.currentRouteName}`);
    }

    /**
     * The current route
     *
     * @var {Route}
     */
    get currentRouteBodyClasses() {
        if (this.currentRoute && this.currentRoute.bodyClassNames && isArray(this.currentRoute.bodyClassNames)) {
            return this.currentRoute.bodyClassNames;
        }
        return [];
    }

    /**
     * Hook for handling when route does change
     *
     * @void
     */
    routeDidChange() {
        this.setRoutebodyClassNames(this.currentRouteBodyClasses);
    }

    /**
     * Hook for handling when route does change
     *
     * @void
     */
    routeWillChange() {
        this.removeRoutebodyClassNames(this.currentRouteBodyClasses);
    }

    /**
     * Initialize theme configurations
     *
     * @void
     */
    initialize(options = {}) {
        this.initialTheme = options?.theme;
        this.setTheme(this.activeTheme);
        this.setEnvironment();
        this.resetScroll();
        this.setRoutebodyClassNames(options.bodyClassNames && isArray(options.bodyClassNames) ? options.bodyClassNames : []);
        // on every subsequent transition set the body class
        this.router.on('routeDidChange', this.routeDidChange.bind(this));
        // remove route class as exiting
        this.router.on('routeWillChange', this.routeWillChange.bind(this));
        // remove console-loader
        this.removeConsoleLoader();
        // run a `onInit` callback if provided
        if (typeof options.onInit === 'function') {
            options.onInit(this);
        }
    }

    /**
     * Remove the console-loader
     *
     * @memberof ThemeService
     */
    removeConsoleLoader() {
        const consoleLoader = document.getElementById(`console-loader`);
        if (consoleLoader) {
            consoleLoader.remove();
        }
    }

    /**
     * Resets window scroll
     *
     * @void
     */
    resetScroll() {
        window.scrollTo(0, 0);
    }

    /**
     * Appends the current route name to body
     *
     * @void
     */
    setRoutebodyClassNames(classes = []) {
        document.body.classList.add(...[this.routeClassName, `${this.currentTheme}-theme`, ...classes]);
    }

    /**
     * Remove thes current route name from body
     *
     * @void
     */
    removeRoutebodyClassNames(classes = []) {
        document.body.classList.remove(...[this.routeClassName, `${this.currentTheme}-theme`, ...classes]);
    }

    /**
     * Toggle the activeTheme between light and dark, and returns the toggled them
     *
     * @return string
     */
    toggleTheme() {
        const nextTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(nextTheme);
        return nextTheme;
    }

    /**
     * Set the theme to the headData
     *
     * @void
     */
    setTheme(theme = 'light') {
        document.body.classList.remove(`${this.currentTheme}-theme`);
        document.body.classList.add(`${theme}-theme`);
        this.currentUser.setOption('theme', theme);
        this.activeTheme = theme;
    }

    /**
     * Set the theme to the headData
     *
     * @void
     */
    setEnvironment() {
        const isSandbox = this.currentUser.getOption('sandbox', false);

        if (isSandbox) {
            document.body.classList.add('sandbox-console');
        } else {
            document.body.classList.remove('sandbox-console');
        }
    }
}
