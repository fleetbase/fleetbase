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

        class RouterStub extends Service {
            transitionTo(routeName) {
                transitionedTo = routeName;
                return 'onboard-transition';
            }
        }

        this.owner.register('service:installation', InstallationStub);
        this.owner.register('service:router', RouterStub);

        const route = this.owner.lookup('route:auth/login');
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

        class UniverseStub extends Service {
            virtualRouteRedirect(transition, routeName, virtualRouteName, options) {
                virtualRedirect = { transition, routeName, virtualRouteName, options };
                return 'login-transition';
            }
        }

        this.owner.register('service:installation', InstallationStub);
        this.owner.register('service:session', SessionStub);
        this.owner.register('service:universe', UniverseStub);

        const transition = {};
        const route = this.owner.lookup('route:auth/login');
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
