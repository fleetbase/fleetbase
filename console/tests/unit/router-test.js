import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

/**
 * Other tests stub the router or look route classes up directly, so a route that
 * exists as a file but is missing from router.map.js passes everything and only
 * fails in the browser. These assertions run against the real, generated map.
 */
module('Unit | Router', function (hooks) {
    setupTest(hooks);

    // The public router service only resolves names once the app has booted and
    // transitioned; asking the route map directly is the point of this test.
    /* eslint-disable ember/no-private-routing-service */
    function hasRoute(owner, name) {
        const router = owner.lookup('router:main');
        router.setupRouter();
        return router._routerMicrolib.hasRoute(name);
    }
    /* eslint-enable ember/no-private-routing-service */

    test('every route the sign-in flows transition to is mapped', function (assert) {
        ['auth.login', 'auth.oauth-callback', 'auth.two-fa', 'onboard', 'console.account.auth'].forEach((name) => {
            assert.true(hasRoute(this.owner, name), `${name} is in router.map.js`);
        });
    });

    test('every admin navigator item points at a mapped route', function (assert) {
        const controller = this.owner.lookup('controller:console/admin');
        const routes = controller.navigationItems.flatMap((item) => [item.route, ...(item.children ?? []).map((child) => child.route)]).filter(Boolean);

        assert.ok(routes.includes('console.admin.oauth-settings'), 'the OAuth page is in the navigator');
        routes.forEach((name) => {
            assert.true(hasRoute(this.owner, name), `${name} is in router.map.js`);
        });
    });
});
