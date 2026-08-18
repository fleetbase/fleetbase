import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';
import { settled } from '@ember/test-helpers';
import window from 'ember-window-mock';

class IntlStub extends Service {
    t(key) {
        return key;
    }
}

class NotificationsStub extends Service {
    successes = [];
    infos = [];
    errors = [];
    success(m) {
        this.successes.push(m);
    }
    info(m) {
        this.infos.push(m);
    }
    serverError(e) {
        this.errors.push(e);
    }
}

// Records what the controller hands the modals manager so the confirm handler can be
// driven directly.
class ModalsManagerStub extends Service {
    lastOptions = null;
    shown = [];
    show(name, options) {
        this.shown.push(name);
        this.lastOptions = options;
        return Promise.resolve();
    }
    confirm(options) {
        this.shown.push('confirm');
        this.lastOptions = options;
        return Promise.resolve();
    }
}

function fakeModal() {
    return {
        loading: false,
        startLoading() {
            this.loading = true;
        },
        stopLoading() {
            this.loading = false;
        },
    };
}

module('Unit | Controller | console/admin/organizations/details/users', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.calls = [];
        this.shouldReject = false;
        const self = this;

        class FetchStub extends Service {
            post(path, payload) {
                self.calls.push({ method: 'post', path, payload });
                return self.shouldReject ? Promise.reject(new Error('nope')) : Promise.resolve({ token: 'imp-token' });
            }
            patch(path) {
                self.calls.push({ method: 'patch', path });
                return self.shouldReject ? Promise.reject(new Error('nope')) : Promise.resolve({});
            }
            delete(path) {
                self.calls.push({ method: 'delete', path });
                return self.shouldReject ? Promise.reject(new Error('nope')) : Promise.resolve({});
            }
        }
        class SessionStub extends Service {
            manuallyAuthenticate() {}
        }

        // Registered before the lookup: the controller reads intl.t while building its
        // `columns` class field, and resolves its injections on creation.
        this.owner.register('service:intl', IntlStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.owner.register('service:modals-manager', ModalsManagerStub);
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:session', SessionStub);

        this.controller = this.owner.lookup('controller:console/admin/organizations/details/users');
        this.notifications = this.owner.lookup('service:notifications');
        this.modals = this.owner.lookup('service:modals-manager');
        this.controller.company = { uuid: 'co_1' };

        this.refreshed = 0;
        Object.defineProperty(this.controller.router, 'refresh', { configurable: true, value: () => this.refreshed++ });
    });

    test('sort proxies the nested sort query param', function (assert) {
        assert.strictEqual(this.controller.sort, '-created_at');

        this.controller.sort = 'name';

        assert.strictEqual(this.controller.nestedSort, 'name', 'writing sort writes nestedSort');
        assert.strictEqual(this.controller.sort, 'name');
    });

    test('search sets the nested query and resets nested paging', function (assert) {
        this.controller.nestedPage = 3;

        this.controller.search({ target: { value: 'ron' } });

        assert.strictEqual(this.controller.nestedQuery, 'ron');
        assert.strictEqual(this.controller.nestedPage, 1);

        this.controller.search({ target: {} });
        assert.strictEqual(this.controller.nestedQuery, '', 'a missing value becomes empty');
    });

    test('refresh re-runs the route', function (assert) {
        this.controller.refresh();

        assert.strictEqual(this.refreshed, 1);
    });

    test('userIdentifier prefers the uuid and falls back to the id', function (assert) {
        assert.strictEqual(this.controller.userIdentifier({ uuid: 'u-uuid', id: 'u-id' }), 'u-uuid');
        assert.strictEqual(this.controller.userIdentifier({ id: 'u-id' }), 'u-id');
        assert.strictEqual(this.controller.userIdentifier(null), undefined);
    });

    test('verifyUser and activateUser patch the lifecycle endpoint and refresh', async function (assert) {
        await this.controller.verifyUser({ uuid: 'u1' });
        assert.deepEqual(this.calls.at(-1), { method: 'patch', path: 'companies/co_1/users/u1/verify' });
        assert.deepEqual(this.notifications.successes.at(-1), 'User verified.');
        assert.strictEqual(this.refreshed, 1);

        await this.controller.activateUser({ uuid: 'u1' });
        assert.deepEqual(this.calls.at(-1), { method: 'patch', path: 'companies/co_1/users/u1/activate' });
        assert.deepEqual(this.notifications.successes.at(-1), 'User activated.');
        assert.strictEqual(this.refreshed, 2);
    });

    test('a failing lifecycle action is reported and does not refresh', async function (assert) {
        this.shouldReject = true;

        await this.controller.verifyUser({ uuid: 'u1' });

        assert.strictEqual(this.notifications.errors.length, 1);
        assert.strictEqual(this.refreshed, 0);
    });

    test('deactivateUser confirms first, then runs the lifecycle action', async function (assert) {
        this.controller.deactivateUser({ uuid: 'u1', name: 'Ron' });

        const options = this.modals.lastOptions;
        assert.strictEqual(options.title, 'Deactivate User');
        assert.ok(options.body.includes('Ron'), options.body);
        assert.deepEqual(this.calls, [], 'nothing happens until the modal is confirmed');

        await options.confirm(fakeModal());

        assert.deepEqual(this.calls.at(-1), { method: 'patch', path: 'companies/co_1/users/u1/deactivate' });
        assert.deepEqual(this.notifications.successes.at(-1), 'User deactivated.');
    });

    test('deactivateUser falls back to the email in its prompt', function (assert) {
        this.controller.deactivateUser({ uuid: 'u1', email: 'ron@fleetbase.io' });

        assert.ok(this.modals.lastOptions.body.includes('ron@fleetbase.io'));
    });

    test('removeUser confirms then deletes the membership', async function (assert) {
        this.controller.removeUser({ uuid: 'u1', name: 'Ron' });

        const options = this.modals.lastOptions;
        assert.strictEqual(options.title, 'Remove User');

        await options.confirm(fakeModal());

        assert.deepEqual(this.calls.at(-1), { method: 'delete', path: 'companies/co_1/users/u1' });
        assert.deepEqual(this.notifications.successes.at(-1), 'User removed.');
        assert.strictEqual(this.refreshed, 1);
    });

    test('a failing removal is reported', async function (assert) {
        this.shouldReject = true;
        this.controller.removeUser({ uuid: 'u1' });

        await this.modals.lastOptions.confirm(fakeModal());

        assert.strictEqual(this.notifications.errors.length, 1);
        assert.strictEqual(this.refreshed, 0);
    });

    test('transferOwnership posts the new owner and refreshes', async function (assert) {
        this.controller.transferOwnership({ uuid: 'u2', name: 'Ada' });

        const options = this.modals.lastOptions;
        assert.strictEqual(options.title, 'Transfer Ownership');
        assert.ok(options.body.includes('Ada'));

        await options.confirm(fakeModal());

        assert.deepEqual(this.calls.at(-1), { method: 'post', path: 'companies/co_1/transfer-ownership', payload: { newOwner: 'u2' } });
        assert.deepEqual(this.notifications.successes.at(-1), 'Organization ownership transferred.');
        assert.strictEqual(this.refreshed, 1);
    });

    test('a failing ownership transfer is reported', async function (assert) {
        this.shouldReject = true;
        this.controller.transferOwnership({ uuid: 'u2' });

        await this.modals.lastOptions.confirm(fakeModal());

        assert.strictEqual(this.notifications.errors.length, 1);
        assert.strictEqual(this.refreshed, 0);
    });

    test('changeUserPassword opens the password modal for the user', function (assert) {
        const user = { uuid: 'u1' };

        this.controller.changeUserPassword(user);

        assert.deepEqual(this.modals.shown.at(-1), 'modals/change-user-password');
        assert.strictEqual(this.modals.lastOptions.user, user);
        assert.true(this.modals.lastOptions.keepOpen, 'the modal stays open');
    });

    test('impersonateUser reports a failed impersonation', async function (assert) {
        this.shouldReject = true;

        await this.controller.impersonateUser({ id: 'u1', email: 'ron@fleetbase.io' });

        assert.strictEqual(this.notifications.errors.length, 1);
    });

    test('impersonateUser posts the user id', async function (assert) {
        // The success path schedules window.location.reload(); make the transition reject
        // so the handler stops at its catch rather than reloading the test runner.
        Object.defineProperty(this.controller.router, 'transitionTo', {
            configurable: true,
            value: () => Promise.reject(new Error('halted before reload')),
        });

        await this.controller.impersonateUser({ id: 'u1', email: 'ron@fleetbase.io' });

        assert.deepEqual(this.calls.at(-1), { method: 'post', path: 'auth/impersonate', payload: { user: 'u1' } });
        assert.strictEqual(this.notifications.errors.length, 1, 'the halted transition is surfaced');
    });

    test('the row actions are wired to the controller handlers', function (assert) {
        const actions = this.controller.columns.at(-1).actions;
        const labels = actions.map((a) => a.label);

        assert.ok(labels.includes('Verify'));
        assert.ok(labels.includes('Activate'));
        assert.ok(labels.includes('Deactivate'));
        assert.ok(labels.includes('Transfer Ownership'));
        assert.ok(labels.includes('Remove from Organization'));

        assert.strictEqual(actions.find((a) => a.label === 'Verify').fn, this.controller.verifyUser);
        assert.strictEqual(actions.find((a) => a.label === 'Remove from Organization').fn, this.controller.removeUser);
    });
});

module('Unit | Controller | console/admin/organizations/details/users | impersonation', function (hooks) {
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

        this.controller = this.owner.lookup('controller:console/admin/organizations/details/users');
        Object.defineProperty(this.controller.router, 'transitionTo', { configurable: true, value: () => Promise.resolve() });

        this.reloads = 0;
        window.location.reload = () => this.reloads++;
    });

    test('impersonating a user swaps the session and reloads once the timer fires', async function (assert) {
        await this.controller.impersonateUser({ id: 'user_9', email: 'driver@acme.test' });

        assert.deepEqual(this.posted, { path: 'auth/impersonate', payload: { user: 'user_9' } });
        assert.deepEqual(this.owner.lookup('service:session').authenticated, ['imp-token']);
        assert.deepEqual(this.owner.lookup('service:notifications').infos, ['Now impersonating driver@acme.test...']);
        assert.strictEqual(this.reloads, 0, 'the reload is deferred');

        await settled();
        assert.strictEqual(this.reloads, 1);
    });

    test('the nested user table starts on its first page with no query', function (assert) {
        const controller = this.owner.lookup('controller:console/admin/organizations/details/users');

        assert.strictEqual(controller.nestedPage, 1);
        assert.strictEqual(controller.nestedLimit, 20);
        assert.strictEqual(controller.nestedQuery, '');
    });
});
