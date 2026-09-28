import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

module('Unit | Controller | console/settings/auth', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        const context = this;
        this.requests = [];
        this.settings = { allow_users_change_password: false };
        this.loadError = null;
        this.saveError = null;

        class FetchStub extends Service {
            get(path) {
                context.requests.push({ method: 'get', path });
                return context.loadError ? Promise.reject(context.loadError) : Promise.resolve(context.settings);
            }

            post(path, payload) {
                context.requests.push({ method: 'post', path, payload });
                return context.saveError ? Promise.reject(context.saveError) : Promise.resolve({});
            }
        }

        class NotificationsStub extends Service {
            successes = [];
            errors = [];

            success(message) {
                this.successes.push(message);
            }

            serverError(error) {
                this.errors.push(error);
            }
        }

        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.controller = this.owner.lookup('controller:console/settings/auth');
        this.notifications = this.owner.lookup('service:notifications');
    });

    test('controller lookup preserves the default without making an unauthenticated request', function (assert) {
        assert.true(this.controller.allowUsersChangePassword);
        assert.deepEqual(this.requests, []);
    });

    test('route entry loads the organization setting and reloads the latest value', async function (assert) {
        this.controller.load();
        await this.controller.loadAuthSettings.last;

        assert.false(this.controller.allowUsersChangePassword);
        assert.deepEqual(this.requests, [{ method: 'get', path: 'companies/auth-settings' }]);

        this.settings = {};
        this.controller.load();
        await this.controller.loadAuthSettings.last;

        assert.true(this.controller.allowUsersChangePassword, 'a missing property uses the allowed default');
        assert.strictEqual(this.requests.length, 2, 'returning to the route loads the current organization policy');
    });

    test('an empty response preserves the current setting', async function (assert) {
        this.controller.onAllowUsersChangePasswordToggled(false);
        this.settings = null;

        await this.controller.loadAuthSettings.perform();

        assert.false(this.controller.allowUsersChangePassword);
    });

    test('a loading failure is reported without overwriting the setting', async function (assert) {
        this.loadError = new Error('Organization settings unavailable');
        this.controller.onAllowUsersChangePasswordToggled(false);

        await this.controller.loadAuthSettings.perform();

        assert.deepEqual(this.notifications.errors, [this.loadError]);
        assert.false(this.controller.allowUsersChangePassword);
    });

    test('saving sends the selected policy and reports success', async function (assert) {
        this.controller.onAllowUsersChangePasswordToggled(false);
        await this.controller.saveAuthSettings.perform();
        this.controller.onAllowUsersChangePasswordToggled(true);
        await this.controller.saveAuthSettings.perform();

        assert.deepEqual(this.requests, [
            { method: 'post', path: 'companies/auth-settings', payload: { allow_users_change_password: false } },
            { method: 'post', path: 'companies/auth-settings', payload: { allow_users_change_password: true } },
        ]);
        assert.deepEqual(this.notifications.successes, ['Authentication settings saved.', 'Authentication settings saved.']);
        assert.deepEqual(this.notifications.errors, []);
    });

    test('a rejected save reports the error and keeps the selected policy for retry', async function (assert) {
        this.saveError = new Error('Policy update rejected');
        this.controller.onAllowUsersChangePasswordToggled(false);

        await this.controller.saveAuthSettings.perform();

        assert.deepEqual(this.notifications.errors, [this.saveError]);
        assert.deepEqual(this.notifications.successes, []);
        assert.false(this.controller.allowUsersChangePassword);
    });
});
