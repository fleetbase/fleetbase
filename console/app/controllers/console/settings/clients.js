import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

/**
 * Controller for the clients management screen at
 * `/console/settings/clients`.
 *
 * Backed by the Task 11 ClientCompanyController endpoints:
 *   - GET    v1/companies/clients
 *   - POST   v1/companies/clients
 *   - PUT    v1/companies/clients/:uuid
 *   - DELETE v1/companies/clients/:uuid
 *
 * Only `name`, `client_code`, and `client_settings` are whitelisted on the
 * backend — we deliberately do NOT expose `parent_company_uuid`,
 * `company_type`, `is_client`, `uuid`, `public_id`, or `owner_uuid` in any
 * form. The backend hard-sets tenancy fields on create.
 *
 * Context is sourced from `currentUser.activeCompanyContext` via the
 * fetch service's header injection (Task 14). No duplicate context state
 * is tracked here.
 */
export default class ConsoleSettingsClientsController extends Controller {
    @service fetch;
    @service notifications;
    @service modalsManager;
    @service router;
    @service intl;

    /**
     * Loading flag toggled while the add/edit/delete network request is
     * in flight — used to disable modal buttons and the add-client CTA.
     *
     * @var {Boolean}
     */
    @tracked isBusy = false;

    /**
     * List of client companies for the current org context. Read from the
     * route's model; exposed as a getter for template convenience.
     */
    get clients() {
        return this.model?.clients ?? [];
    }

    get accessDenied() {
        return this.model?.accessDenied === true;
    }

    /**
     * Opens the add-client modal. Creates a blank "client" option so the
     * shared edit-client-company modal component can mutate the fields.
     */
    @action openAddClientModal() {
        this.modalsManager.show('modals/edit-client-company', {
            title: 'Add Client',
            acceptButtonText: 'Add Client',
            acceptButtonIcon: 'check',
            isEdit: false,
            client: {
                name: null,
                client_code: null,
            },
            confirm: async (modal) => {
                modal.startLoading();
                this.isBusy = true;
                const client = modal.getOption('client') ?? {};
                const payload = {
                    name: client.name ?? '',
                    client_code: client.client_code ?? null,
                };

                try {
                    await this.fetch.post('v1/companies/clients', payload);
                    this.notifications.success('Client added.');
                    return this.router.refresh();
                } catch (error) {
                    modal.stopLoading();
                    this.handleFetchError(error, 'Could not add client.');
                } finally {
                    this.isBusy = false;
                }
            },
        });
    }

    /**
     * Opens the edit-client modal, pre-populating the form with a copy of
     * the selected client's editable fields. The copy is deliberate so
     * cancelling the modal does not mutate the displayed row.
     */
    @action openEditClientModal(client) {
        this.modalsManager.show('modals/edit-client-company', {
            title: 'Edit Client',
            acceptButtonText: 'Save Changes',
            acceptButtonIcon: 'save',
            isEdit: true,
            client: {
                uuid: client.uuid,
                name: client.name ?? '',
                client_code: client.client_code ?? '',
            },
            confirm: async (modal) => {
                modal.startLoading();
                this.isBusy = true;
                const edited = modal.getOption('client') ?? {};
                const payload = {
                    name: edited.name ?? '',
                    client_code: edited.client_code ?? null,
                };

                try {
                    await this.fetch.put(`v1/companies/clients/${client.uuid}`, payload);
                    this.notifications.success('Client updated.');
                    return this.router.refresh();
                } catch (error) {
                    modal.stopLoading();
                    this.handleFetchError(error, 'Could not update client.');
                } finally {
                    this.isBusy = false;
                }
            },
        });
    }

    /**
     * Opens the native confirm modal before deleting. Delete is gated
     * through `modalsManager.confirm` so the user cannot accidentally
     * destroy a client by mis-clicking.
     */
    @action deleteClient(client) {
        this.modalsManager.confirm({
            title: `Delete client "${client.name}"?`,
            body: 'This action cannot be undone.',
            acceptButtonText: 'Delete Client',
            acceptButtonScheme: 'danger',
            acceptButtonIcon: 'trash',
            confirm: async (modal) => {
                modal.startLoading();
                this.isBusy = true;

                try {
                    await this.fetch.delete(`v1/companies/clients/${client.uuid}`);
                    this.notifications.success('Client deleted.');
                    return this.router.refresh();
                } catch (error) {
                    modal.stopLoading();
                    this.handleFetchError(error, 'Could not delete client.');
                } finally {
                    this.isBusy = false;
                }
            },
        });
    }

    /**
     * Centralised error mapping for the clients endpoints. The fetch
     * service may reject with either an Error (message-only) or the raw
     * response JSON; Task 14 observed that a status is present on either
     * the error or the nested response object.
     */
    handleFetchError(error, fallbackMessage) {
        const status = error?.status ?? error?.response?.status;

        if (status === 403) {
            return this.notifications.error('You do not have permission to manage this client.');
        }
        if (status === 404) {
            return this.notifications.error('Client not found.');
        }
        if (status === 422) {
            return this.notifications.serverError(error, 'The information you entered is invalid.');
        }

        return this.notifications.serverError(error, fallbackMessage);
    }
}
