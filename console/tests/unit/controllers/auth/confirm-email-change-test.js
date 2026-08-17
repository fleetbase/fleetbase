import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

module('Unit | Controller | auth/confirm-email-change', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.posted = [];
        this.postRejectsWith = null;
        this.isAuthenticated = false;
        const context = this;

        class FetchStub extends Service {
            post(path, payload) {
                context.posted.push({ path, payload });
                return context.postRejectsWith ? Promise.reject(context.postRejectsWith) : Promise.resolve({ ok: true });
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
                return 'reported';
            }
        }
        class IntlStub extends Service {
            t(key) {
                return key;
            }
        }
        class SessionStub extends Service {
            get isAuthenticated() {
                return context.isAuthenticated;
            }
        }

        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.owner.register('service:intl', IntlStub);
        this.owner.register('service:session', SessionStub);

        this.build = () => {
            const controller = this.owner.lookup('controller:auth/confirm-email-change');
            controller.model = { id: 'link_1' };
            controller.code = '123456';

            this.transitions = [];
            Object.defineProperty(controller.router, 'transitionTo', {
                configurable: true,
                value: (routeName) => {
                    this.transitions.push(routeName);
                    return routeName;
                },
            });

            return controller;
        };
        this.notifications = () => this.owner.lookup('service:notifications');
    });

    test('confirming posts the link and code, then sends a signed-in user to the console', async function (assert) {
        this.isAuthenticated = true;
        const controller = this.build();

        await controller.confirmEmailChange.perform();

        assert.deepEqual(this.posted, [{ path: 'auth/confirm-email-change', payload: { link: 'link_1', code: '123456' } }]);
        assert.deepEqual(this.notifications().successes, ['auth.confirm-email-change.success-message']);
        assert.deepEqual(this.transitions, ['console']);
    });

    test('a signed-out user is sent to login instead', async function (assert) {
        const controller = this.build();

        await controller.confirmEmailChange.perform();

        assert.deepEqual(this.transitions, ['auth.login']);
    });

    test('it prevents the form from submitting itself', async function (assert) {
        const controller = this.build();
        let prevented = false;

        await controller.confirmEmailChange.perform({ preventDefault: () => (prevented = true) });

        assert.true(prevented);
    });

    test('a rejected confirmation is reported and nothing navigates', async function (assert) {
        const failure = new Error('link already used');
        this.postRejectsWith = failure;
        const controller = this.build();

        await controller.confirmEmailChange.perform();

        assert.deepEqual(this.notifications().serverErrors, [failure]);
        assert.deepEqual(this.notifications().successes, [], 'nothing is reported as confirmed');
        assert.deepEqual(this.transitions, [], 'the user stays on the page');
    });
});
