import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import { settled } from '@ember/test-helpers';
import Service from '@ember/service';

module('Unit | Controller | invite/for-user', function (hooks) {
    setupTest(hooks);

    test('acceptInvite authenticates the session and transitions to the console', async function (assert) {
        class FetchStub extends Service {
            post() {
                return Promise.resolve({ token: 'invite-token', needs_password: false });
            }
        }
        class SessionStub extends Service {
            manuallyAuthenticate(token) {
                this.token = token;
            }
        }
        class NotificationsStub extends Service {
            success() {}
            serverError() {}
        }
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:session', SessionStub);
        this.owner.register('service:notifications', NotificationsStub);

        const controller = this.owner.lookup('controller:invite/for-user');
        let transitioned;
        controller.router.transitionTo = (route) => {
            transitioned = route;
            return Promise.resolve();
        };
        controller.code = 'invite-code';

        controller.acceptInvite();
        await settled();

        assert.strictEqual(this.owner.lookup('service:session').token, 'invite-token', 'authenticated with the returned token');
        assert.strictEqual(transitioned, 'console');
        assert.notOk(controller.isLoading, 'loading flag is reset');
    });
});

module('Unit | Controller | invite/for-user | accepting', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.posted = [];
        this.postResponse = { token: 'invite-token' };
        this.postRejectsWith = null;
        const context = this;

        class FetchStub extends Service {
            post(path, payload) {
                context.posted.push({ path, payload });
                return context.postRejectsWith ? Promise.reject(context.postRejectsWith) : Promise.resolve(context.postResponse);
            }
        }
        class SessionStub extends Service {
            authenticated = [];
            manuallyAuthenticate(token) {
                this.authenticated.push(token);
            }
        }
        class NotificationsStub extends Service {
            successes = [];
            serverErrors = [];
            success(message) {
                this.successes.push(message);
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
            const controller = this.owner.lookup('controller:invite/for-user');
            controller.code = 'INVITE-1';
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
        this.modals = () => this.owner.lookup('service:modals-manager');
    });

    test('accepting the invite authenticates the new member and opens the console', async function (assert) {
        const controller = this.build();

        await controller.acceptInvite();

        assert.deepEqual(this.posted, [{ path: 'users/accept-company-invite', payload: { code: 'INVITE-1' } }]);
        assert.deepEqual(this.owner.lookup('service:session').authenticated, ['invite-token']);
        assert.deepEqual(this.notifications().successes, ['Invitation accepted, welcome to Fleetbase!']);
        assert.deepEqual(this.transitions, ['console']);
        assert.false(controller.isLoading, 'the busy flag is cleared');
        assert.deepEqual(this.modals().shown, [], 'an existing password is left alone');
    });

    test('a member who has no password yet is asked to set one', async function (assert) {
        this.postResponse = { token: 'invite-token', needs_password: true };
        const controller = this.build();

        await controller.acceptInvite();

        assert.strictEqual(this.modals().shown[0].name, 'modals/set-password');
        assert.deepEqual(this.transitions, ['console'], 'they still land in the console first');
    });

    test('a rejected invite is reported and the busy flag is cleared', async function (assert) {
        const failure = new Error('invite expired');
        this.postRejectsWith = failure;
        const controller = this.build();

        await controller.acceptInvite();

        assert.deepEqual(this.notifications().serverErrors, [failure]);
        assert.false(controller.isLoading);
        assert.deepEqual(this.transitions, []);
    });

    test('the set-password modal cannot be dismissed without setting one', function (assert) {
        this.build().setPassword();

        const { options } = this.modals().shown[0];
        assert.strictEqual(options.title, 'Set a new password');
        assert.false(options.closeButton, 'there is no close button');
        assert.false(options.backdropClose, 'and clicking away does nothing');
        assert.true(options.keepOpen);
        assert.true(options.hideDeclineButton);
    });

    test('confirming the set-password modal submits both fields', async function (assert) {
        const controller = this.build();
        controller.setPassword();
        const calls = [];
        const modal = {
            startLoading: () => calls.push('startLoading'),
            stopLoading: () => calls.push('stopLoading'),
            done: () => calls.push('done'),
            getOptions: (keys) => ({ password: 'secret', password_confirmation: 'secret', keys }),
        };

        await this.modals().shown[0].options.confirm(modal);

        assert.strictEqual(this.posted.at(-1).path, 'users/set-password');
        assert.deepEqual(this.posted.at(-1).payload.keys, ['password', 'password_confirmation'], 'both fields are read off the modal');
        assert.deepEqual(calls, ['startLoading', 'done']);
    });

    test('a failed password submission leaves the modal open', async function (assert) {
        const failure = new Error('password too weak');
        const controller = this.build();
        controller.setPassword();
        this.postRejectsWith = failure;
        const calls = [];
        const modal = {
            startLoading: () => calls.push('startLoading'),
            stopLoading: () => calls.push('stopLoading'),
            done: () => calls.push('done'),
            getOptions: () => ({}),
        };

        await this.modals().shown[0].options.confirm(modal);

        assert.deepEqual(this.notifications().serverErrors, [failure]);
        assert.deepEqual(calls, ['startLoading', 'stopLoading'], 'the user can try again');
    });
});
