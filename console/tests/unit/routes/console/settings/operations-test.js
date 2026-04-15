import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

/**
 * Unit tests for the operations settings route.
 *
 * Scenarios covered:
 *   1. Route is registered in the container.
 *   2. model() GETs v1/company-settings/current and unwraps the `settings`
 *      tree onto the resolved model.
 *   3. 401 resolves with accessDenied instead of throwing.
 *   4. 403 resolves with accessDenied instead of throwing.
 *   5. Non-auth errors are rethrown so the router error substate handles
 *      them.
 */
module('Unit | Route | console/settings/operations', function (hooks) {
    setupTest(hooks);

    test('route exists', function (assert) {
        const route = this.owner.lookup('route:console/settings/operations');
        assert.ok(route, 'route is registered in the container');
    });

    test('model() resolves with the settings tree on 200', async function (assert) {
        const route = this.owner.lookup('route:console/settings/operations');
        const captured = [];

        route.fetch = {
            get(path) {
                captured.push(path);
                return Promise.resolve({
                    settings: {
                        billing: { default_payment_terms_days: 30 },
                        tendering: { default_method: 'email' },
                    },
                });
            },
        };

        const model = await route.model();

        assert.deepEqual(captured, ['v1/company-settings/current'], 'hits the Task 2 endpoint');
        assert.strictEqual(model.accessDenied, false, 'accessDenied false on success');
        assert.strictEqual(model.settings.billing.default_payment_terms_days, 30);
        assert.strictEqual(model.settings.tendering.default_method, 'email');
    });

    test('model() returns accessDenied on 401 instead of throwing', async function (assert) {
        const route = this.owner.lookup('route:console/settings/operations');
        route.fetch = {
            get: () => {
                const err = new Error('Unauthorized');
                err.status = 401;
                return Promise.reject(err);
            },
        };

        const model = await route.model();

        assert.strictEqual(model.accessDenied, true);
        assert.deepEqual(model.settings, {}, 'settings defaults to empty object');
    });

    test('model() returns accessDenied on 403 instead of throwing', async function (assert) {
        const route = this.owner.lookup('route:console/settings/operations');
        route.fetch = {
            get: () => {
                const err = new Error('Forbidden');
                err.status = 403;
                return Promise.reject(err);
            },
        };

        const model = await route.model();

        assert.strictEqual(model.accessDenied, true);
        assert.deepEqual(model.settings, {});
    });

    test('model() rethrows non-auth errors so the router shows error substate', async function (assert) {
        const route = this.owner.lookup('route:console/settings/operations');
        route.fetch = {
            get: () => {
                const err = new Error('Server error');
                err.status = 500;
                return Promise.reject(err);
            },
        };

        try {
            await route.model();
            assert.ok(false, 'should have thrown');
        } catch (error) {
            assert.strictEqual(error.status, 500, '500 is rethrown');
        }
    });
});
