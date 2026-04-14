import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

/**
 * Unit tests for the clients management controller.
 *
 * Scenarios covered (matching the Task 16 test plan):
 *   1. Org user sees the empty-state helper when clients list is empty.
 *   2. Org user adds a client -> POST fires with whitelisted fields only.
 *   3. Org user edits a client -> PUT fires with whitelisted fields only.
 *   4. Org user deletes a client after confirming -> DELETE fires.
 *   5. Client-role user (accessDenied: true) sees access-denied state.
 *   6. Validation errors (422) are routed through notifications.
 *   7. Cancelling the delete confirm does NOT fire the DELETE request.
 *   8. The edit/add form NEVER submits tenancy fields (parent_company_uuid,
 *      company_type, is_client, uuid, public_id, owner_uuid).
 */
module('Unit | Controller | console/settings/clients', function (hooks) {
    setupTest(hooks);

    function buildController(owner, overrides = {}) {
        const controller = owner.lookup('controller:console/settings/clients');
        const requests = [];
        const notifications = {
            calls: [],
            success(msg) {
                this.calls.push(['success', msg]);
            },
            error(msg) {
                this.calls.push(['error', msg]);
            },
            serverError(err, fallback) {
                this.calls.push(['serverError', fallback, err?.status]);
            },
        };

        controller.fetch = {
            get(path) {
                requests.push(['GET', path, null]);
                return Promise.resolve({ clients: [] });
            },
            post(path, body) {
                requests.push(['POST', path, body]);
                return Promise.resolve({ client: { uuid: 'new-uuid', ...body } });
            },
            put(path, body) {
                requests.push(['PUT', path, body]);
                return Promise.resolve({ client: { ...body } });
            },
            delete(path) {
                requests.push(['DELETE', path, null]);
                return Promise.resolve({ deleted: true });
            },
            ...overrides.fetch,
        };
        controller.notifications = notifications;
        controller.router = { refresh: () => null, ...overrides.router };

        return { controller, requests, notifications };
    }

    test('scenario 1: empty clients list -> empty array exposed on getter', function (assert) {
        const { controller } = buildController(this.owner);
        controller.model = { clients: [], accessDenied: false };

        assert.deepEqual(controller.clients, [], 'clients getter returns empty array');
        assert.strictEqual(controller.accessDenied, false, 'accessDenied is false');
    });

    test('scenario 5: client-role user -> accessDenied exposed to template', function (assert) {
        const { controller } = buildController(this.owner);
        controller.model = { clients: [], accessDenied: true };

        assert.strictEqual(controller.accessDenied, true, 'accessDenied true when route reports it');
        assert.deepEqual(controller.clients, [], 'clients still an array so templates do not crash');
    });

    test('scenario 2 + 8: add client -> POSTs only whitelisted fields (name, client_code)', async function (assert) {
        const { controller, requests } = buildController(this.owner);
        controller.model = { clients: [], accessDenied: false };

        let capturedOptions = null;
        controller.modalsManager = {
            show(componentName, options) {
                capturedOptions = options;
                return Promise.resolve();
            },
            confirm: () => Promise.resolve(),
        };

        controller.openAddClientModal();

        assert.ok(capturedOptions, 'modalsManager.show was called');
        assert.strictEqual(capturedOptions.isEdit, false, 'modal is in create mode');
        assert.notOk(capturedOptions.client.uuid, 'new client has no uuid field in the form');
        assert.notOk(capturedOptions.client.parent_company_uuid, 'no parent_company_uuid in form');
        assert.notOk(capturedOptions.client.company_type, 'no company_type in form');
        assert.notOk(capturedOptions.client.is_client, 'no is_client in form');

        // Simulate user editing fields in the modal and confirming.
        capturedOptions.client.name = 'New Client';
        capturedOptions.client.client_code = 'NEW';
        await capturedOptions.confirm({
            startLoading: () => null,
            stopLoading: () => null,
            getOption: (key) => capturedOptions[key],
        });

        assert.deepEqual(requests, [['POST', 'v1/companies/clients', { name: 'New Client', client_code: 'NEW' }]], 'POST body contains only whitelisted fields');
    });

    test('scenario 3 + 8: edit client -> PUTs only whitelisted fields, never includes uuid/parent_company_uuid in body', async function (assert) {
        const { controller, requests } = buildController(this.owner);
        controller.model = {
            clients: [
                {
                    uuid: 'client-1',
                    name: 'Old Name',
                    client_code: 'OLD',
                    parent_company_uuid: 'org-1',
                    company_type: 'client',
                    is_client: true,
                },
            ],
            accessDenied: false,
        };

        let capturedOptions = null;
        controller.modalsManager = {
            show(componentName, options) {
                capturedOptions = options;
                return Promise.resolve();
            },
            confirm: () => Promise.resolve(),
        };

        controller.openEditClientModal(controller.model.clients[0]);

        assert.ok(capturedOptions, 'modalsManager.show was called');
        assert.strictEqual(capturedOptions.isEdit, true, 'modal is in edit mode');
        assert.notOk(capturedOptions.client.parent_company_uuid, 'parent_company_uuid stripped from form copy');
        assert.notOk(capturedOptions.client.company_type, 'company_type stripped from form copy');
        assert.notOk(capturedOptions.client.is_client, 'is_client stripped from form copy');

        // Simulate editing and confirming.
        capturedOptions.client.name = 'New Name';
        capturedOptions.client.client_code = 'NEW-CODE';
        await capturedOptions.confirm({
            startLoading: () => null,
            stopLoading: () => null,
            getOption: (key) => capturedOptions[key],
        });

        assert.deepEqual(requests, [['PUT', 'v1/companies/clients/client-1', { name: 'New Name', client_code: 'NEW-CODE' }]], 'PUT body contains only whitelisted fields');
    });

    test('scenario 4: delete client with confirmation -> DELETE fires to the right path', async function (assert) {
        const { controller, requests } = buildController(this.owner);

        let confirmOptions = null;
        controller.modalsManager = {
            show: () => Promise.resolve(),
            confirm(options) {
                confirmOptions = options;
                return Promise.resolve();
            },
        };

        const client = { uuid: 'client-to-delete', name: 'Doomed Co', client_code: 'DOOM' };
        controller.deleteClient(client);

        assert.ok(confirmOptions, 'modalsManager.confirm was called');
        assert.ok(confirmOptions.title.includes('Doomed Co'), 'confirmation title includes the client name');
        assert.strictEqual(confirmOptions.acceptButtonScheme, 'danger', 'uses danger button scheme');

        // Simulate user confirming.
        await confirmOptions.confirm({
            startLoading: () => null,
            stopLoading: () => null,
        });

        assert.deepEqual(requests, [['DELETE', 'v1/companies/clients/client-to-delete', null]], 'DELETE fires at the exact Task 11 path');
    });

    test('scenario 7: cancelling delete confirmation does NOT issue a DELETE', function (assert) {
        const { controller, requests } = buildController(this.owner);

        controller.modalsManager = {
            show: () => Promise.resolve(),
            // Simulate the user dismissing the confirm; we just never invoke
            // the `confirm` callback registered by the controller.
            confirm: () => Promise.resolve(),
        };

        controller.deleteClient({ uuid: 'untouched-uuid', name: 'Safe Co' });

        assert.deepEqual(requests, [], 'no DELETE request fires when the user does not confirm');
    });

    test('scenario 6: handleFetchError maps 422 through serverError (validation)', function (assert) {
        const { controller, notifications } = buildController(this.owner);
        const err422 = { status: 422, errors: ['name is required'] };
        controller.handleFetchError(err422, 'fallback msg');

        const [lastCall] = notifications.calls;
        assert.strictEqual(lastCall[0], 'serverError', '422 routed through notifications.serverError');
        assert.strictEqual(lastCall[2], 422, 'preserves the 422 status code for display');
    });

    test('scenario 6b: handleFetchError maps 403 to a dedicated permission message', function (assert) {
        const { controller, notifications } = buildController(this.owner);
        const err403 = { status: 403 };
        controller.handleFetchError(err403, 'fallback');

        const [lastCall] = notifications.calls;
        assert.strictEqual(lastCall[0], 'error', '403 routed through notifications.error');
        assert.ok(lastCall[1].toLowerCase().includes('permission'), 'message mentions permissions');
    });

    test('scenario 6c: handleFetchError maps 404 to a "not found" message', function (assert) {
        const { controller, notifications } = buildController(this.owner);
        const err404 = { status: 404 };
        controller.handleFetchError(err404, 'fallback');

        const [lastCall] = notifications.calls;
        assert.strictEqual(lastCall[0], 'error', '404 routed through notifications.error');
        assert.ok(lastCall[1].toLowerCase().includes('not found'), 'message mentions not found');
    });
});
