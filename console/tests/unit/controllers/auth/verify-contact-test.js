import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

module('Unit | Controller | auth/verify-contact', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.posted = [];
        this.postRejectsWith = null;
        this.isAuthenticated = false;
        const context = this;

        class FetchStub extends Service {
            post(path, payload) {
                context.posted.push({ path, payload });
                return context.postRejectsWith ? Promise.reject(context.postRejectsWith) : Promise.resolve({ status: 'ok' });
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

        this.build = (channel = 'email') => {
            const controller = this.owner.lookup('controller:auth/verify-contact');
            controller.model = { id: 'link_1', channel };
            controller.code = '123456';
            controller.verified = false;

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

    test('verifying posts the link and code and shows the verified state', async function (assert) {
        const controller = this.build('phone');
        let prevented = false;

        await controller.verify.perform({ preventDefault: () => (prevented = true) });

        assert.true(prevented);
        assert.deepEqual(this.posted, [{ path: 'auth/confirm-contact-verification', payload: { link: 'link_1', code: '123456' } }]);
        assert.true(controller.verified);
        assert.deepEqual(this.notifications().successes, ['auth.verify-contact.phone-verified']);
    });

    test('an email link reports the email as verified', async function (assert) {
        const controller = this.build('email');

        await controller.verify.perform();

        assert.deepEqual(this.notifications().successes, ['auth.verify-contact.email-verified']);
    });

    test('a rejected verification is reported and the page stays unverified', async function (assert) {
        const failure = new Error('link expired');
        this.postRejectsWith = failure;
        const controller = this.build();

        await controller.verify.perform();

        assert.deepEqual(this.notifications().serverErrors, [failure]);
        assert.false(controller.verified);
    });

    test('continue goes to the console when signed in and to login otherwise', function (assert) {
        const controller = this.build();

        controller.continue();
        this.isAuthenticated = true;
        controller.continue();

        assert.deepEqual(this.transitions, ['auth.login', 'console']);
    });
});
