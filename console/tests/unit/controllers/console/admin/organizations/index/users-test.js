import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';
import { settled } from '@ember/test-helpers';
import { cancel } from '@ember/runloop';
import window from 'ember-window-mock';

module('Unit | Controller | console/admin/organizations/index/users', function (hooks) {
    setupTest(hooks);

    test('search updates the query and resets to the first page', function (assert) {
        const controller = this.owner.lookup('controller:console/admin/organizations/index/users');
        controller.nestedPage = 5;

        controller.search({ target: { value: 'ron' } });

        assert.strictEqual(controller.nestedQuery, 'ron');
        assert.strictEqual(controller.nestedPage, 1);
    });

    test('search coerces a missing value to an empty query', function (assert) {
        const controller = this.owner.lookup('controller:console/admin/organizations/index/users');

        controller.search({ target: {} });

        assert.strictEqual(controller.nestedQuery, '');
    });

    test('setOverlayContext stores the overlay context api', function (assert) {
        const controller = this.owner.lookup('controller:console/admin/organizations/index/users');
        const api = { close() {} };

        controller.setOverlayContext(api);

        assert.strictEqual(controller.contextApi, api);
    });

    test('onPressClose closes the overlay and returns to the organizations index', function (assert) {
        const controller = this.owner.lookup('controller:console/admin/organizations/index/users');
        let closed = false;
        let transitioned;
        controller.setOverlayContext({
            close() {
                closed = true;
            },
        });
        controller.router.transitionTo = (route) => {
            transitioned = route;
            return Promise.resolve();
        };

        controller.onPressClose();

        assert.true(closed);
        assert.strictEqual(transitioned, 'console.admin.organizations.index');
    });
});

module('Unit | Controller | console/admin/organizations/index/users | actions', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.posted = [];
        this.postRejectsWith = null;
        const context = this;

        class FetchStub extends Service {
            post(path, payload) {
                context.posted.push({ path, payload });
                return context.postRejectsWith ? Promise.reject(context.postRejectsWith) : Promise.resolve({ token: 'impersonation-token' });
            }
        }
        class SessionStub extends Service {
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
        class ModalsManagerStub extends Service {
            shown = [];
            show(name, options) {
                this.shown.push({ name, options });
            }
        }

        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:session', SessionStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.owner.register('service:modals-manager', ModalsManagerStub);

        this.build = () => {
            const controller = this.owner.lookup('controller:console/admin/organizations/index/users');
            this.transitions = [];
            Object.defineProperty(controller.router, 'transitionTo', {
                configurable: true,
                value: (routeName) => {
                    this.transitions.push(routeName);
                    return Promise.resolve(routeName);
                },
            });
            return controller;
        };
        this.notifications = () => this.owner.lookup('service:notifications');
    });

    test('impersonateUser swaps the session and announces who is being impersonated', async function (assert) {
        const controller = this.build();

        const timer = await controller.impersonateUser({ id: 'user_1', email: 'ron@fleetbase.io' });
        // The handler schedules a window.location.reload(); cancel it before it fires
        // against the test runner.
        cancel(timer);

        assert.deepEqual(this.posted, [{ path: 'auth/impersonate', payload: { user: 'user_1' } }]);
        assert.deepEqual(this.transitions, ['console'], 'the impersonator is dropped into the console');
        assert.deepEqual(this.owner.lookup('service:session').authenticated, ['impersonation-token']);
        assert.deepEqual(this.notifications().infos, ['Now impersonating ron@fleetbase.io...']);
        assert.ok(timer, 'a reload was scheduled');
    });

    test('a failed impersonation is reported and nothing is reloaded', async function (assert) {
        const failure = new Error('not permitted');
        this.postRejectsWith = failure;
        const controller = this.build();

        const timer = await controller.impersonateUser({ id: 'user_1', email: 'ron@fleetbase.io' });

        assert.strictEqual(timer, undefined, 'no reload is scheduled');
        assert.deepEqual(this.notifications().serverErrors, [failure]);
        assert.deepEqual(this.transitions, []);
    });

    test('changeUserPassword opens the password modal for that user', function (assert) {
        const controller = this.build();
        const user = { id: 'user_1' };

        controller.changeUserPassword(user);

        const { name, options } = this.owner.lookup('service:modals-manager').shown[0];
        assert.strictEqual(name, 'modals/change-user-password');
        assert.strictEqual(options.user, user);
        assert.true(options.keepOpen, 'the modal stays up until it is dismissed');
    });

    test('search stores the term and returns to the first page', function (assert) {
        const controller = this.build();
        controller.nestedPage = 4;

        controller.search({ target: { value: 'ron' } });

        assert.strictEqual(controller.nestedQuery, 'ron');
        assert.strictEqual(controller.nestedPage, 1, 'paging restarts for a new search');

        controller.nestedPage = 3;
        controller.search({ target: {} });

        assert.strictEqual(controller.nestedQuery, '', 'a cleared box searches for nothing');
        assert.strictEqual(controller.nestedPage, 1);
    });

    test('onPressClose closes the overlay when one is registered, then leaves the route', function (assert) {
        const controller = this.build();
        let closed = 0;

        controller.setOverlayContext({ close: () => closed++ });
        controller.onPressClose();

        assert.strictEqual(closed, 1, 'the overlay is dismissed first');
        assert.deepEqual(this.transitions, ['console.admin.organizations.index']);
    });

    test('onPressClose still leaves the route with no overlay registered', function (assert) {
        const controller = this.build();

        controller.onPressClose();
        controller.setOverlayContext({});
        controller.onPressClose();

        assert.deepEqual(this.transitions, ['console.admin.organizations.index', 'console.admin.organizations.index'], 'both paths navigate');
    });

    test('the user table offers impersonate and change-password actions', function (assert) {
        const controller = this.build();
        const actionsColumn = controller.columns.at(-1);

        assert.deepEqual(
            actionsColumn.actions.map((entry) => entry.label),
            ['Impersonate', 'Change Password']
        );
        assert.strictEqual(actionsColumn.actions[0].fn, controller.impersonateUser);
        assert.strictEqual(actionsColumn.actions[1].fn, controller.changeUserPassword);
    });
});

module('Unit | Controller | console/admin/organizations/index/users | impersonation', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        const context = this;

        class FetchStub extends Service {
            post(path, payload) {
                context.posted = { path, payload };
                return Promise.resolve({ token: 'imp-token' });
            }
        }
        class NotificationsStub extends Service {
            infos = [];
            info(message) {
                this.infos.push(message);
            }
            serverError() {}
        }
        class SessionStub extends Service {
            data = { authenticated: { user: { id: 'me' } } };
            authenticated = [];
            manuallyAuthenticate(token) {
                this.authenticated.push(token);
            }
        }

        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.owner.register('service:session', SessionStub);

        this.controller = this.owner.lookup('controller:console/admin/organizations/index/users');
        Object.defineProperty(this.controller.router, 'transitionTo', { configurable: true, value: () => Promise.resolve() });

        this.reloads = 0;
        window.location.reload = () => this.reloads++;
    });

    test('impersonating a user swaps the session and hands back a cancellable reload', async function (assert) {
        const timer = await this.controller.impersonateUser({ id: 'user_3', email: 'ops@acme.test' });

        assert.deepEqual(this.posted, { path: 'auth/impersonate', payload: { user: 'user_3' } });
        assert.deepEqual(this.owner.lookup('service:session').authenticated, ['imp-token']);
        assert.deepEqual(this.owner.lookup('service:notifications').infos, ['Now impersonating ops@acme.test...']);
        assert.ok(timer, 'the pending reload is returned so a caller can cancel it');

        await settled();
        assert.strictEqual(this.reloads, 1);
    });

    test('the nested user table starts on its first page, newest first, with no query', function (assert) {
        const controller = this.owner.lookup('controller:console/admin/organizations/index/users');

        assert.strictEqual(controller.nestedPage, 1);
        assert.strictEqual(controller.nestedLimit, 20);
        assert.strictEqual(controller.nestedSort, '-created_at');
        assert.strictEqual(controller.nestedQuery, '');
    });
});
