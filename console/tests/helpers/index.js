import { setupApplicationTest as upstreamSetupApplicationTest, setupRenderingTest as upstreamSetupRenderingTest, setupTest as upstreamSetupTest } from 'ember-qunit';
import { _resetStorages } from 'ember-local-storage/helpers/storage';
import { setupWindowMock } from 'ember-window-mock/test-support';

// This file exists to provide wrappers around ember-qunit's
// test setup functions. This way, you can easily extend the setup that is
// needed per test type.

/**
 * ember-local-storage's storageFor() memoizes each bucket in a module-level cache, so a
 * bucket is built inside whichever test container touches it first and is then reused by
 * every later container — outliving its owner. Several core services read through it
 * (current-user, app-cache, fetch), so without this reset state leaks between tests and
 * touching the stale object throws "Cannot create a new tag ... after it has been
 * destroyed" — a global error that aborts the whole run.
 */
function setupLocalStorageIsolation(hooks) {
    hooks.beforeEach(function () {
        _resetStorages();
        window.localStorage.clear();
    });

    hooks.afterEach(function () {
        _resetStorages();
        window.localStorage.clear();
    });
}

/**
 * App code imports `window` from ember-window-mock, which outside tests is the raw global
 * and inside them is a proxy. That proxy passes straight through to the real window until
 * setupWindowMock() installs the mocking handler — so without this, window.location.reload()
 * would reload the test runner. It is applied to every test type rather than per module so
 * no caller has to remember. The handler is reset after each test.
 */
function setupApplicationTest(hooks, options) {
    upstreamSetupApplicationTest(hooks, options);
    setupLocalStorageIsolation(hooks);
    setupWindowMock(hooks);

    // Additional setup for application tests can be done here.
    //
    // For example, if you need an authenticated session for each
    // application test, you could do:
    //
    // hooks.beforeEach(async function () {
    //   await authenticateSession(); // ember-simple-auth
    // });
    //
    // This is also a good place to call test setup functions coming
    // from other addons:
    //
    // setupIntl(hooks); // ember-intl
    // setupMirage(hooks); // ember-cli-mirage
}

function setupRenderingTest(hooks, options) {
    upstreamSetupRenderingTest(hooks, options);
    setupLocalStorageIsolation(hooks);
    setupWindowMock(hooks);

    // Additional setup for rendering tests can be done here.
}

function setupTest(hooks, options) {
    upstreamSetupTest(hooks, options);
    setupLocalStorageIsolation(hooks);
    setupWindowMock(hooks);

    // Additional setup for unit tests can be done here.
}

export { setupApplicationTest, setupRenderingTest, setupTest };
