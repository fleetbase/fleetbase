import { module, test } from 'qunit';
import { visit, click, currentRouteName, find, findAll, settled, triggerKeyEvent, waitUntil } from '@ember/test-helpers';
import window from 'ember-window-mock';
import { setupApplicationTest } from '@fleetbase/console/tests/helpers';
import { setupConsoleBackend, signIn, TEST_USER } from '@fleetbase/console/tests/helpers/console-backend';

/**
 * Both console shells, booted for real: the app, its extensions and the IAM
 * engine, against the stub API in tests/helpers/console-backend.js.
 *
 * IAM is the engine under test because it is small and still uses the classic
 * sidebar adapter (an EmberWormhole into #sidebar-menu-items), which is exactly
 * what the canvas dock flyout has to host.
 */

function dockItem(label) {
    return findAll('.fb-dock-item').find((el) => (el.getAttribute('aria-label') || '').startsWith(label));
}

function dropdownItem(text) {
    return findAll('.next-dd-menu a, .next-dd-menu button').find((el) => el.textContent.trim().startsWith(text));
}

function requestLog(context) {
    return `requests: ${context.backend.requests.join(', ')}`;
}

function setLayoutOption(owner, layout) {
    owner.lookup('service:current-user').setOption('layout', layout);
}

async function openIam(owner) {
    await visit('/');
    owner.lookup('service:router').transitionTo('console.iam');
    await settled();
}

module('Acceptance | console layouts', function (hooks) {
    setupConsoleBackend(hooks);
    setupApplicationTest(hooks);

    hooks.afterEach(function () {
        delete document.body.dataset.theme;
    });

    test('an anonymous visit lands on the sign-in page with no shell', async function (assert) {
        await visit('/');

        assert.true(currentRouteName().startsWith('auth.login'), `${currentRouteName()} — ${requestLog(this)}`);
        assert.dom('.fb-canvas').doesNotExist();
        assert.dom('.fleetbase-next-container').doesNotExist();
    });

    module('signed in', function (hooks) {
        hooks.beforeEach(async function () {
            await signIn(this.owner);
        });

        module('canvas (the default)', function () {
            test('signing in lands on the console home inside the canvas shell', async function (assert) {
                await visit('/');

                assert.strictEqual(currentRouteName(), 'console.home', requestLog(this));
                assert.dom('.fb-canvas[data-console-layout="canvas"]').exists();
                assert.dom('.fb-canvas-backdrop .fb-dot-grid, .fb-canvas-backdrop > *').exists('the dot-grid backdrop renders');
                assert.dom('.fb-canvas-chrome .fb-context-bar').exists();
                assert.dom('.fb-canvas-chrome .fb-dock').exists();
                assert.dom('.fb-canvas-chrome .fb-top-bar').exists();
                assert.dom('.fb-canvas-content .console-canvas-section').exists('the route renders in the content layer');
                assert.dom('.next-user-button-trigger').doesNotExist('no classic header');
                assert.dom('#sidebar-menu-items').exists({ count: 1 }, 'one sidebar mount point, inside the dock flyout');
                assert.dom('#fb-dock-flyout #sidebar-menu-items').exists();
            });

            test('the dock navigates into an engine and its sidebar shows inside the flyout', async function (assert) {
                await visit('/');
                const iam = dockItem('IAM');
                assert.ok(iam, `the IAM engine registered a dock module (${findAll('.fb-dock-item').map((el) => el.getAttribute('aria-label'))})`);

                await click(iam);
                await waitUntil(() => currentRouteName().startsWith('console.iam'), { timeout: 10000 });

                assert.true(currentRouteName().startsWith('console.iam'), `${currentRouteName()} — ${requestLog(this)}`);
                assert.dom(iam).hasClass('is-active', 'the current module is marked');
                assert.dom('#fb-dock-flyout').isVisible('the flyout opens');
                assert.dom('#fb-dock-flyout .fb-dock-flyout-title').hasText('IAM');

                await waitUntil(() => find('#fb-dock-flyout #sidebar-menu-items')?.childElementCount > 0, { timeout: 10000 });
                assert.dom('#fb-dock-flyout #sidebar-menu-items').isVisible('the engine sidebar adapter shows for the current module');
                assert.true(find('#fb-dock-flyout #sidebar-menu-items').childElementCount > 0, 'IAM wormholed its navigator into the flyout');
            });

            test('⌘K opens and closes the command palette', async function (assert) {
                await visit('/');
                assert.dom('.fb-command-palette').doesNotExist();

                await triggerKeyEvent(document, 'keydown', 'K', { metaKey: true, ctrlKey: true });
                assert.dom('.fb-command-palette[role="dialog"]').exists('⌘K opens it');

                await triggerKeyEvent('.fb-command-palette', 'keydown', 'Escape');
                assert.dom('.fb-command-palette').doesNotExist('Escape closes it');

                await click('.fb-top-bar-search');
                assert.dom('.fb-command-palette').exists('the top bar search opens it too');
                await triggerKeyEvent(document, 'keydown', 'K', { metaKey: true, ctrlKey: true });
                assert.dom('.fb-command-palette').doesNotExist('⌘K toggles it closed');
            });

            test('the account menu toggles the theme', async function (assert) {
                await visit('/');

                await click('.fb-top-bar-account-trigger');
                await click('[data-theme-choice="dark"]');
                assert.strictEqual(document.body.dataset.theme, 'dark');

                await click('.fb-top-bar-account-trigger');
                await click('[data-theme-choice="light"]');
                assert.strictEqual(document.body.dataset.theme, 'light');
            });

            test('the account menu switches to the classic layout and saves the choice', async function (assert) {
                await visit('/');
                await click('.fb-top-bar-account-trigger');
                assert.dom('[data-account-link="switch-layout"]').hasText('Switch to classic layout');

                await click('[data-account-link="switch-layout"]');

                assert.dom('.fb-canvas').doesNotExist();
                assert.dom('.next-user-button-trigger').exists('the classic header renders');
                assert.strictEqual(currentRouteName(), 'console.home', 'stays on the same page');
                assert.strictEqual(this.owner.lookup('service:current-user').getOption('layout'), 'classic');
            });
        });

        module('classic (the fallback)', function (hooks) {
            hooks.beforeEach(function () {
                setLayoutOption(this.owner, 'classic');
            });

            test('signing in lands on the console home in the classic shell', async function (assert) {
                await visit('/');

                assert.strictEqual(currentRouteName(), 'console.home', requestLog(this));
                assert.dom('.fb-canvas').doesNotExist();
                assert.dom('.fleetbase-next-container').exists();
                assert.dom('.next-user-button-trigger').exists();
                assert.dom('.fb-command-palette').doesNotExist();
            });

            test('an engine’s sidebar renders in the classic sidebar', async function (assert) {
                await openIam(this.owner);
                await waitUntil(() => find('#sidebar-menu-items')?.childElementCount > 0, { timeout: 10000 });

                assert.true(currentRouteName().startsWith('console.iam'), `${currentRouteName()} — ${requestLog(this)}`);
                assert.dom('#sidebar-menu-items').exists({ count: 1 });
                assert.dom('#fb-dock-flyout').doesNotExist();
            });

            test('the user menu toggles dark mode', async function (assert) {
                await visit('/');
                const theme = this.owner.lookup('service:theme');
                theme.setTheme('light');

                await click('.next-user-button-trigger');
                await click('.next-dd-menu [role="checkbox"]');
                assert.strictEqual(document.body.dataset.theme, 'dark');
            });

            test('the user menu switches to the new layout', async function (assert) {
                await visit('/');
                await click('.next-user-button-trigger');
                const item = dropdownItem('Switch to the new layout');
                assert.ok(item, 'the switch is in the user menu');

                await click(item);

                assert.dom('.fb-canvas[data-console-layout="canvas"]').exists();
                assert.strictEqual(this.owner.lookup('service:current-user').getOption('layout'), 'canvas');
            });

            test('?layout=canvas overrides the saved choice for the session', async function (assert) {
                await visit('/?layout=canvas');

                assert.dom('.fb-canvas').exists();
                assert.strictEqual(window.sessionStorage.getItem('fleetbase:console-layout'), 'canvas');
                assert.strictEqual(this.owner.lookup('service:current-user').getOption('layout'), 'classic', 'the saved option is untouched');
            });
        });

        test('?layout=classic overrides the canvas default for the session', async function (assert) {
            await visit('/?layout=classic');

            assert.dom('.fb-canvas').doesNotExist();
            assert.dom('.fleetbase-next-container').exists();
            assert.strictEqual(window.sessionStorage.getItem('fleetbase:console-layout'), 'classic');
            assert.strictEqual(this.owner.lookup('service:current-user').getOption('layout'), null, 'nothing saved');
            assert.true(this.owner.lookup('service:current-user').isAdmin, `signed in as ${TEST_USER.name}`);
        });
    });
});
