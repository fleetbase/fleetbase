import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Route | console/settings/clients', function (hooks) {
    setupTest(hooks);

    test('route exists', function (assert) {
        const route = this.owner.lookup('route:console/settings/clients');
        assert.ok(route, 'route is registered in the container');
    });

    test('model() resolves with the clients list on 200', async function (assert) {
        const route = this.owner.lookup('route:console/settings/clients');
        const captured = [];

        // Stub fetch service to emulate a successful GET.
        route.fetch = {
            get(path) {
                captured.push(path);
                return Promise.resolve({
                    clients: [
                        { uuid: 'c-1', name: 'Acme Corp', client_code: 'ACME' },
                        { uuid: 'c-2', name: 'Beta LLC', client_code: 'BETA' },
                    ],
                });
            },
        };

        const model = await route.model();

        assert.deepEqual(captured, ['v1/companies/clients'], 'queries the Task 11 endpoint');
        assert.strictEqual(model.accessDenied, false, 'accessDenied is false on success');
        assert.strictEqual(model.clients.length, 2, 'two clients returned');
        assert.strictEqual(model.clients[0].name, 'Acme Corp');
    });

    test('model() handles an empty clients array without error', async function (assert) {
        const route = this.owner.lookup('route:console/settings/clients');
        route.fetch = {
            get: () => Promise.resolve({ clients: [] }),
        };

        const model = await route.model();

        assert.strictEqual(model.accessDenied, false);
        assert.deepEqual(model.clients, [], 'empty list is handled gracefully');
    });

    test('model() returns accessDenied on 403 instead of throwing', async function (assert) {
        const route = this.owner.lookup('route:console/settings/clients');
        route.fetch = {
            get: () => {
                const err = new Error('Forbidden');
                err.status = 403;
                return Promise.reject(err);
            },
        };

        const model = await route.model();

        assert.strictEqual(model.accessDenied, true, 'client-role users get accessDenied flag');
        assert.deepEqual(model.clients, [], 'clients list defaults to empty');
    });

    test('model() rethrows non-403 errors so the router shows error substate', async function (assert) {
        const route = this.owner.lookup('route:console/settings/clients');
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
