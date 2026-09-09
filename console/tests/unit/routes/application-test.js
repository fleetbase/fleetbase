import { module, test } from 'qunit';
import Service from '@ember/service';
import { setupTest } from '@fleetbase/console/tests/helpers';

/**
 * Every hook on the application route delegates straight to one of its nine injected
 * services, so each test patches only the members under test on the instances the route
 * actually holds. Going through the instance is deliberate: `universe/hook-service`,
 * `session` and `intl` are resolved before the route is built (so owner.register no
 * longer swaps them), and the hooks themselves are `@action` getters, which cannot be
 * assigned over. defineProperty shadows both cases.
 */
function patch(target, name, value) {
    Object.defineProperty(target, name, { configurable: true, value });
}

/**
 * Records every hookService.execute() call so tests can assert both the hook name and the
 * context the route forwards to extensions.
 */
function captureHooks(route) {
    const calls = [];
    patch(route.hookService, 'execute', (...args) => calls.push(args));

    return calls;
}

/**
 * Drives the real UrlSearchParamsService.get()/getParam() path by swapping the underlying
 * URLSearchParams rather than stubbing the lookup methods.
 */
function withSearch(route, search) {
    Object.defineProperty(route.urlSearchParams, 'urlParams', {
        configurable: true,
        get() {
            return new URLSearchParams(search);
        },
    });
}

function addBootLoader() {
    const element = document.createElement('div');
    element.id = 'boot-loader';
    document.body.appendChild(element);

    return element;
}

module('Unit | Route | application', function (hooks) {
    setupTest(hooks);

    hooks.afterEach(function () {
        document.getElementById('boot-loader')?.remove();
    });

    test('it exists', function (assert) {
        let route = this.owner.lookup('route:application');
        assert.ok(route);
    });

    test('it does not check installer status during app boot', function (assert) {
        let route = this.owner.lookup('route:application');

        assert.strictEqual(route.checkInstallationStatus, undefined);
        assert.notOk('defaultTheme' in route);
    });

    test('it handles unconfigured Fleetbase route errors', function (assert) {
        let handledError;

        class InstallationStub extends Service {
            handleError(error) {
                handledError = error;
                return true;
            }
        }

        this.owner.register('service:installation', InstallationStub);

        const route = this.owner.lookup('route:application');
        const error = { error: 'fleetbase_not_configured' };
        const result = route.error(error);

        assert.false(result);
        assert.strictEqual(handledError, error);
    });

    test('it bubbles route errors that are not configuration errors', function (assert) {
        class InstallationStub extends Service {
            handleError() {
                return false;
            }
        }

        this.owner.register('service:installation', InstallationStub);

        const route = this.owner.lookup('route:application');
        const result = route.error(new Error('server_error'));

        assert.true(result);
    });

    test('willTransition hands the transition to the application:will-transition hook', function (assert) {
        const route = this.owner.lookup('route:application');
        const calls = captureHooks(route);
        const transition = { to: { name: 'console.home' } };

        route.willTransition(transition);

        assert.strictEqual(calls.length, 1, 'the hook fires exactly once');

        const [name, session, router, forwarded] = calls[0];
        assert.strictEqual(name, 'application:will-transition');
        assert.strictEqual(session, route.session, 'extensions receive the session');
        assert.strictEqual(router, route.router, 'extensions receive the router');
        assert.strictEqual(forwarded, transition, 'extensions receive the in-flight transition');
    });

    test('loading hands the transition to the application:loading hook', function (assert) {
        const route = this.owner.lookup('route:application');
        const calls = captureHooks(route);
        const transition = { to: { name: 'console.home' } };

        route.loading(transition);

        assert.strictEqual(calls.length, 1);

        const [name, session, router, forwarded] = calls[0];
        assert.strictEqual(name, 'application:loading');
        assert.strictEqual(session, route.session);
        assert.strictEqual(router, route.router);
        assert.strictEqual(forwarded, transition);
    });

    test('activate initializes the theme before the locale', function (assert) {
        const route = this.owner.lookup('route:application');
        const order = [];

        patch(route, 'initializeTheme', () => order.push('theme'));
        patch(route, 'initializeLocale', () => order.push('locale'));

        route.activate();

        assert.deepEqual(order, ['theme', 'locale']);
    });

    test('initializeTheme applies no extra body classes in a browser', function (assert) {
        const route = this.owner.lookup('route:application');
        let options;

        patch(route.theme, 'initialize', (value) => (options = value));

        route.initializeTheme();

        assert.deepEqual(options, { bodyClassNames: [] }, 'the theme is initialized with an empty class list');
    });

    test('initializeTheme adds the is-electron body class inside an Electron renderer', function (assert) {
        const route = this.owner.lookup('route:application');
        let options;

        patch(route.theme, 'initialize', (value) => (options = value));

        // isElectron() checks window.process.type first, which a browser never has.
        const hadProcess = 'process' in window;
        const previousProcess = window.process;
        window.process = { type: 'renderer' };

        try {
            route.initializeTheme();
        } finally {
            if (hadProcess) {
                window.process = previousProcess;
            } else {
                delete window.process;
            }
        }

        // The route uses pushObject() with an array literal, so the entry arrives nested;
        // classList.add() stringifies a single-element array to the same token. Assert the
        // effective class names rather than pinning that shape.
        assert.deepEqual(options.bodyClassNames.flat(), ['is-electron']);
    });

    test('initializeLocale applies the locale stored on the current user', function (assert) {
        const route = this.owner.lookup('route:application');
        let locales;

        patch(route.intl, 'setLocale', (value) => (locales = value));
        patch(route.currentUser, 'getOption', (key, fallback) => (key === 'locale' ? 'fr-fr' : fallback));

        route.initializeLocale();

        assert.deepEqual(locales, ['fr-fr']);
    });

    test('initializeLocale falls back to en-US when the user has no locale option', function (assert) {
        const route = this.owner.lookup('route:application');
        let locales;
        let requestedFallback;

        patch(route.intl, 'setLocale', (value) => (locales = value));
        patch(route.currentUser, 'getOption', (key, fallback) => {
            requestedFallback = fallback;
            return fallback;
        });

        route.initializeLocale();

        assert.strictEqual(requestedFallback, 'en-US', 'en-US is passed as the default');
        assert.deepEqual(locales, ['en-US']);
    });

    test('beforeModel sets up the session, waits for extensions, then runs the before-model hook', async function (assert) {
        const route = this.owner.lookup('route:application');
        const calls = captureHooks(route);
        const order = [];

        patch(route.session, 'setup', async () => order.push('session'));
        patch(route.session, 'isAuthenticated', false);
        patch(route.extensionManager, 'waitForBoot', async () => order.push('extensions'));
        withSearch(route, '');

        const transition = {};
        const result = await route.beforeModel(transition);

        assert.deepEqual(order, ['session', 'extensions'], 'the session is set up before extensions are awaited');
        assert.strictEqual(calls.length, 1);
        assert.strictEqual(calls[0][0], 'application:before-model');
        assert.strictEqual(calls[0][3], transition);
        assert.strictEqual(result, undefined, 'no shift param means no redirect');
    });

    test('beforeModel redirects an authenticated session to the shift target', async function (assert) {
        const route = this.owner.lookup('route:application');
        let transitionedTo;

        captureHooks(route);
        patch(route.session, 'setup', async () => {});
        patch(route.session, 'isAuthenticated', true);
        patch(route.extensionManager, 'waitForBoot', async () => {});
        withSearch(route, '?shift=fleet-ops/orders');
        patch(route.router, 'transitionTo', (routeName) => {
            transitionedTo = routeName;
            return 'shift-transition';
        });

        const result = await route.beforeModel({});

        // pathToRoute() prefixes 'console.' and turns slashes into dots.
        assert.strictEqual(transitionedTo, 'console.fleet-ops.orders');
        assert.strictEqual(result, 'shift-transition', 'the transition is returned so Ember waits on it');
    });

    test('beforeModel ignores the shift param when the session is not authenticated', async function (assert) {
        const route = this.owner.lookup('route:application');
        let transitioned = false;

        captureHooks(route);
        patch(route.session, 'setup', async () => {});
        patch(route.session, 'isAuthenticated', false);
        patch(route.extensionManager, 'waitForBoot', async () => {});
        withSearch(route, '?shift=fleet-ops/orders');
        patch(route.router, 'transitionTo', () => (transitioned = true));

        const result = await route.beforeModel({});

        assert.false(transitioned, 'an anonymous visitor is not shifted into the console');
        assert.strictEqual(result, undefined);
    });

    test('afterModel removes the boot loader for an unauthenticated session', function (assert) {
        const route = this.owner.lookup('route:application');

        patch(route.session, 'isAuthenticated', false);
        addBootLoader();
        assert.ok(document.getElementById('boot-loader'), 'precondition: the boot loader is present');

        route.afterModel();

        assert.strictEqual(document.getElementById('boot-loader'), null, 'the boot loader is torn down');
    });

    test('afterModel leaves the boot loader in place for an authenticated session', function (assert) {
        const route = this.owner.lookup('route:application');

        patch(route.session, 'isAuthenticated', true);
        addBootLoader();

        route.afterModel();

        assert.ok(document.getElementById('boot-loader'), 'the loader stays up while the console boots');
    });
});
