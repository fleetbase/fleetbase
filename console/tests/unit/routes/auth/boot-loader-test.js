import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

/**
 * Every route under /auth is a landing point reached straight from a cold boot, so each
 * one tears down the index.html boot loader on activate(). The hook is identical across
 * them, so assert it once per route from a single table rather than copying the same test
 * into five files.
 */
const ROUTES_THAT_CLEAR_THE_BOOT_LOADER = ['route:auth/login', 'route:auth/reset-password', 'route:auth/confirm-email-change', 'route:auth/two-fa', 'route:auth/verification'];

module('Unit | Route | auth boot loader teardown', function (hooks) {
    setupTest(hooks);

    hooks.afterEach(function () {
        document.getElementById('boot-loader')?.remove();
    });

    ROUTES_THAT_CLEAR_THE_BOOT_LOADER.forEach((routeName) => {
        test(`${routeName} removes the boot loader on activate`, function (assert) {
            const element = document.createElement('div');
            element.id = 'boot-loader';
            document.body.appendChild(element);
            assert.ok(document.getElementById('boot-loader'), 'precondition: the boot loader is present');

            this.owner.lookup(routeName).activate();

            assert.strictEqual(document.getElementById('boot-loader'), null, 'the boot loader is removed so the auth screen is visible');
        });
    });
});
