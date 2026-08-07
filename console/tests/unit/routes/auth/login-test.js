import { module, test } from 'qunit';
import Service from '@ember/service';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Route | auth/login', function (hooks) {
    setupTest(hooks);

    test('it exists', function (assert) {
        let route = this.owner.lookup('route:auth/login');
        assert.ok(route);
    });

    test('it redirects to install when Fleetbase is not configured', async function (assert) {
        class InstallationStub extends Service {
            checkOnboarding() {
                return Promise.resolve({
                    notConfigured: true,
                    shouldOnboard: false,
                    transition: 'install-transition',
                });
            }
        }

        this.owner.register('service:installation', InstallationStub);

        const route = this.owner.lookup('route:auth/login');
        const result = await route.beforeModel({});

        assert.strictEqual(result, 'install-transition');
    });

    test('it redirects to onboard when onboarding is required', async function (assert) {
        let transitionedTo;

        class InstallationStub extends Service {
            checkOnboarding() {
                return Promise.resolve({
                    notConfigured: false,
                    shouldOnboard: true,
                });
            }
        }

        this.owner.register('service:installation', InstallationStub);

        const route = this.owner.lookup('route:auth/login');

        // Ember's built-in RouterService can't be replaced via owner.register in setupTest,
        // so spy on transitionTo on the injected instance the route actually calls.
        Object.defineProperty(route.router, 'transitionTo', {
            configurable: true,
            value: (routeName) => {
                transitionedTo = routeName;
                return 'onboard-transition';
            },
        });

        const result = await route.beforeModel({});

        assert.strictEqual(result, 'onboard-transition');
        assert.strictEqual(transitionedTo, 'onboard');
    });

    test('it continues normal login flow when configured and onboarding is not required', async function (assert) {
        let prohibitedRoute;
        let virtualRedirect;

        class InstallationStub extends Service {
            checkOnboarding() {
                return Promise.resolve({
                    notConfigured: false,
                    shouldOnboard: false,
                });
            }
        }

        class SessionStub extends Service {
            prohibitAuthentication(routeName) {
                prohibitedRoute = routeName;
            }
        }

        this.owner.register('service:installation', InstallationStub);
        this.owner.register('service:session', SessionStub);

        const transition = {};
        const route = this.owner.lookup('route:auth/login');

        // universe is a pre-resolved singleton that owner.register can't swap, and
        // virtualRouteRedirect is an @action (a getter) — shadow it with a value property.
        Object.defineProperty(route.universe, 'virtualRouteRedirect', {
            configurable: true,
            value: (transition, routeName, virtualRouteName, options) => {
                virtualRedirect = { transition, routeName, virtualRouteName, options };
                return 'login-transition';
            },
        });

        const result = await route.beforeModel(transition);

        assert.strictEqual(result, 'login-transition');
        assert.strictEqual(prohibitedRoute, 'console');
        assert.deepEqual(virtualRedirect, {
            transition,
            routeName: 'auth:login',
            virtualRouteName: 'virtual',
            options: { restoreQueryParams: true },
        });
    });
});
