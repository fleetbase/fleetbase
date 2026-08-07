import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

class NotificationsStub extends Service {
    warnings = [];
    warning(message) {
        this.warnings.push(message);
    }
}

module('Unit | Route | auth/reset-password', function (hooks) {
    setupTest(hooks);

    test('model validates the verification code by id', async function (assert) {
        class FetchStub extends Service {
            get(path, params) {
                return Promise.resolve({ path, params });
            }
        }
        this.owner.register('service:fetch', FetchStub);

        const route = this.owner.lookup('route:auth/reset-password');
        const model = await route.model({ id: 'code_1' });

        assert.strictEqual(model.path, 'auth/validate-verification');
        assert.deepEqual(model.params, { id: 'code_1' });
    });

    test('setupController warns and redirects when the verification code is invalid', async function (assert) {
        this.owner.register('service:notifications', NotificationsStub);

        const route = this.owner.lookup('route:auth/reset-password');
        let transitioned;
        route.router.transitionTo = (name) => {
            transitioned = name;
            return name;
        };

        const controller = {};
        await route.setupController(controller, { is_valid: false });

        assert.strictEqual(transitioned, 'auth');
        assert.strictEqual(route.notifications.warnings.length, 1, 'the user is warned');
        assert.notOk(controller.brand, 'no brand is loaded for an invalid code');
    });

    test('setupController loads the brand when the verification code is valid', async function (assert) {
        this.owner.register('service:notifications', NotificationsStub);

        const route = this.owner.lookup('route:auth/reset-password');
        route.store.findRecord = (type, id) => Promise.resolve(`${type}:${id}`);

        let transitioned;
        route.router.transitionTo = (name) => (transitioned = name);

        const controller = {};
        await route.setupController(controller, { is_valid: true });

        assert.strictEqual(controller.brand, 'brand:1');
        assert.strictEqual(transitioned, undefined, 'no redirect for a valid code');
        assert.strictEqual(route.notifications.warnings.length, 0);
    });
});
