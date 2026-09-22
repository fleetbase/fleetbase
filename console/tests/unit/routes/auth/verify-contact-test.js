import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

class NotificationsStub extends Service {
    warnings = [];
    warning(message) {
        this.warnings.push(message);
    }
}

module('Unit | Route | auth/verify-contact', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.validFor = null;
        const context = this;

        class FetchStub extends Service {
            requests = [];
            get(path, params) {
                this.requests.push({ path, params });
                return Promise.resolve({ is_valid: params.for === context.validFor, id: params.id });
            }
        }
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);
    });

    test('model validates the link as an email or phone verification', async function (assert) {
        const route = this.owner.lookup('route:auth/verify-contact');

        this.validFor = 'phone_verification';
        const phone = await route.model({ id: 'code_1' });
        this.validFor = 'email_verification';
        const email = await route.model({ id: 'code_1' });
        this.validFor = null;
        const invalid = await route.model({ id: 'code_1' });

        assert.deepEqual(
            route.fetch.requests.slice(0, 2).map((request) => request.params),
            [
                { id: 'code_1', for: 'email_verification' },
                { id: 'code_1', for: 'phone_verification' },
            ]
        );
        assert.deepEqual(phone, { id: 'code_1', is_valid: true, channel: 'phone' });
        assert.deepEqual(email, { id: 'code_1', is_valid: true, channel: 'email' });
        assert.false(invalid.is_valid);
    });

    test('setupController warns and redirects to login when the link is invalid', async function (assert) {
        const route = this.owner.lookup('route:auth/verify-contact');
        let transitioned;
        route.router.transitionTo = (name) => (transitioned = name);

        const controller = {};
        await route.setupController(controller, { is_valid: false });

        assert.strictEqual(transitioned, 'auth.login');
        assert.strictEqual(route.notifications.warnings.length, 1, 'the user is warned');
        assert.notOk(controller.brand, 'no brand is loaded for an invalid link');
    });

    test('setupController loads the brand when the link is valid', async function (assert) {
        const route = this.owner.lookup('route:auth/verify-contact');
        route.store.findRecord = (type, id) => Promise.resolve(`${type}:${id}`);

        let transitioned;
        route.router.transitionTo = (name) => (transitioned = name);

        const controller = {};
        await route.setupController(controller, { is_valid: true });

        assert.strictEqual(controller.brand, 'brand:1');
        assert.strictEqual(transitioned, undefined, 'no redirect for a valid link');
    });
});
