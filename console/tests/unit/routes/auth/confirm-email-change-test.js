import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

class NotificationsStub extends Service {
    warnings = [];
    warning(message) {
        this.warnings.push(message);
    }
}

module('Unit | Route | auth/confirm-email-change', function (hooks) {
    setupTest(hooks);

    test('model validates the verification code for an email change', async function (assert) {
        class FetchStub extends Service {
            get(path, params) {
                return Promise.resolve({ path, params });
            }
        }
        this.owner.register('service:fetch', FetchStub);

        const route = this.owner.lookup('route:auth/confirm-email-change');
        const model = await route.model({ id: 'code_1' });

        assert.strictEqual(model.path, 'auth/validate-verification');
        assert.deepEqual(model.params, { id: 'code_1', for: 'email_change' });
    });

    test('setupController warns and redirects to login when the code is invalid', async function (assert) {
        this.owner.register('service:notifications', NotificationsStub);

        const route = this.owner.lookup('route:auth/confirm-email-change');
        let transitioned;
        route.router.transitionTo = (name) => (transitioned = name);

        const controller = {};
        await route.setupController(controller, { is_valid: false });

        assert.strictEqual(transitioned, 'auth.login');
        assert.strictEqual(route.notifications.warnings.length, 1, 'the user is warned');
        assert.notOk(controller.brand, 'no brand is loaded for an invalid code');
    });

    test('setupController loads the brand when the code is valid', async function (assert) {
        this.owner.register('service:notifications', NotificationsStub);

        const route = this.owner.lookup('route:auth/confirm-email-change');
        route.store.findRecord = (type, id) => Promise.resolve(`${type}:${id}`);

        let transitioned;
        route.router.transitionTo = (name) => (transitioned = name);

        const controller = {};
        await route.setupController(controller, { is_valid: true });

        assert.strictEqual(controller.brand, 'brand:1');
        assert.strictEqual(transitioned, undefined, 'no redirect for a valid code');
    });
});
