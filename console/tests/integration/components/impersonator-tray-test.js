import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { cancel } from '@ember/runloop';
import ImpersonatorTrayComponent from '@fleetbase/console/components/impersonator-tray';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';
import window from 'ember-window-mock';

function registerSession(owner, authenticated) {
    class SessionStub extends Service {
        data = { authenticated };
        manuallyAuthenticate() {}
    }
    owner.register('service:session', SessionStub);
}

module('Integration | Component | impersonator-tray', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders nothing when the session is not an impersonation', async function (assert) {
        registerSession(this.owner, {});

        await render(hbs`
            <div id="view-header-actions"></div>
            <ImpersonatorTray />
        `);

        assert.dom('.locale-selector-tray').doesNotExist('the tray stays hidden for a normal session');
    });

    test('it wormholes the tray into the header while impersonating', async function (assert) {
        registerSession(this.owner, { impersonator: 'admin@fleetbase.io' });

        // The component wormholes into an element that only exists in the app shell.
        await render(hbs`
            <div id="view-header-actions"></div>
            <ImpersonatorTray />
        `);

        assert.dom('#view-header-actions .locale-selector-tray').exists('the tray renders into the header');
    });
});

/**
 * restoreSession ends the impersonation session and then reloads the window on a timer.
 * That timer has to be cancelled here or it fires against the test runner.
 */
module('Integration | Component | impersonator-tray | restoreSession', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.deleted = [];
        this.deleteRejectsWith = null;
        const context = this;

        class FetchStub extends Service {
            async delete(path) {
                context.deleted.push(path);

                if (context.deleteRejectsWith) {
                    throw context.deleteRejectsWith;
                }

                return { token: 'restored-token' };
            }
        }
        class SessionStub extends Service {
            data = { authenticated: { impersonator: 'admin@fleetbase.io' } };
            authenticated = [];
            manuallyAuthenticate(token) {
                this.authenticated.push(token);
            }
        }
        class NotificationsStub extends Service {
            infos = [];
            serverErrors = [];
            info(message) {
                this.infos.push(message);
            }
            serverError(error) {
                this.serverErrors.push(error);
            }
        }

        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:session', SessionStub);
        this.owner.register('service:notifications', NotificationsStub);

        const captured = captureComponent(this.owner, 'impersonator-tray', ImpersonatorTrayComponent);
        this.build = async () => {
            // The tray wormholes its button into the app shell's header actions.
            await render(hbs`
                <div id="view-header-actions"></div>
                <ImpersonatorTray />
            `);
            const component = captured.instance;

            this.transitions = [];
            Object.defineProperty(component.router, 'transitionTo', {
                configurable: true,
                value: (routeName) => {
                    this.transitions.push(routeName);
                    return Promise.resolve(routeName);
                },
            });

            return component;
        };
    });

    test('isImpersonator reflects whether the session carries an impersonator', async function (assert) {
        const component = await this.build();
        assert.true(component.isImpersonator);

        component.session.data = { authenticated: {} };
        assert.false(component.isImpersonator, 'no impersonator means the tray stays hidden');

        component.session.data = {};
        assert.false(component.isImpersonator, 'an unauthenticated session is handled too');
    });

    test('restoreSession ends the impersonation and reauthenticates as the real user', async function (assert) {
        const component = await this.build();

        const timer = await component.restoreSession();
        // The handler schedules a window.location.reload(); cancel it before it can fire
        // against the test runner.
        cancel(timer);

        assert.deepEqual(this.deleted, ['auth/impersonate'], 'the impersonation is ended server-side');
        assert.deepEqual(this.transitions, ['console'], 'and the user is returned to the console');
        assert.deepEqual(component.session.authenticated, ['restored-token'], 'with their own token');
        assert.deepEqual(this.owner.lookup('service:notifications').infos, ['Ending impersonation session.']);
        assert.ok(timer, 'a reload was scheduled');
    });

    test('a failed restore is reported and nothing is reloaded', async function (assert) {
        const failure = new Error('impersonation session already ended');
        this.deleteRejectsWith = failure;
        const component = await this.build();

        const timer = await component.restoreSession();

        assert.strictEqual(timer, undefined, 'no reload is scheduled on failure');
        assert.deepEqual(this.owner.lookup('service:notifications').serverErrors, [failure]);
        assert.deepEqual(this.transitions, [], 'the user stays where they are');
    });
});

module('Integration | Component | impersonator-tray | reload', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.owner.lookup('service:intl').setLocale('en-us');

        class FetchStub extends Service {
            async delete() {
                return { token: 'restored-token' };
            }
        }
        class NotificationsStub extends Service {
            infos = [];
            info(message) {
                this.infos.push(message);
            }
            serverError() {}
        }

        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);

        const captured = captureComponent(this.owner, 'impersonator-tray', ImpersonatorTrayComponent);
        this.build = async () => {
            await render(hbs`
                <div id="view-header-actions"></div>
                <ImpersonatorTray />
            `);
            const component = captured.instance;

            this.authenticated = [];
            Object.defineProperty(component.session, 'manuallyAuthenticate', {
                configurable: true,
                value: (token) => this.authenticated.push(token),
            });
            Object.defineProperty(component.router, 'transitionTo', { configurable: true, value: () => Promise.resolve() });

            this.reloads = 0;
            window.location.reload = () => this.reloads++;

            return component;
        };
    });

    test('restoring the session re-authenticates and reloads once the timer fires', async function (assert) {
        const component = await this.build();

        await component.restoreSession();

        assert.deepEqual(this.authenticated, ['restored-token']);
        assert.deepEqual(this.owner.lookup('service:notifications').infos, ['Ending impersonation session.']);
        assert.strictEqual(this.reloads, 0, 'the reload is deferred so the notification is readable');

        await settled();
        assert.strictEqual(this.reloads, 1, 'and lands when the timer fires');
    });
});
