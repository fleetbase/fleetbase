import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ConsoleSettingsClientsRoute extends Route {
    @service fetch;

    /**
     * Load client companies for the active organization context. The fetch
     * service auto-injects the X-Company-Context header from
     * currentUser.activeCompanyContext (Task 14), so no additional wiring
     * is required here.
     *
     * A 403 response indicates the user is operating in a client-role
     * context and cannot manage clients; we resolve with an
     * `accessDenied` marker so the controller can render an access-denied
     * state instead of throwing.
     */
    async model() {
        try {
            const response = await this.fetch.get('v1/companies/clients');
            const clients = (response && response.clients) || [];
            return { clients, accessDenied: false };
        } catch (error) {
            const status = error?.status ?? error?.response?.status;
            if (status === 403) {
                return { clients: [], accessDenied: true };
            }
            throw error;
        }
    }

    @action refreshModel() {
        return this.refresh();
    }
}
