import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

/**
 * Loads the per-company operations settings tree from the Task 2
 * `/v1/company-settings/current` endpoint. The fetch service auto-injects
 * the `X-Company-Context` header from `currentUser.activeCompanyContext`
 * (Phase 1 Task 14), so the backend `fleetbase.company.context.self`
 * middleware resolves the active company for both org and client users
 * without any additional frontend wiring.
 *
 * 401/403 resolves with `{ settings: {}, accessDenied: true }` so the
 * template can render an access-denied state instead of bubbling into the
 * router error substate.
 */
export default class ConsoleSettingsOperationsRoute extends Route {
    @service fetch;

    async model() {
        try {
            const response = await this.fetch.get('v1/company-settings/current');
            return {
                settings: response?.settings ?? {},
                accessDenied: false,
            };
        } catch (error) {
            const status = error?.status ?? error?.response?.status;
            if (status === 401 || status === 403) {
                return { settings: {}, accessDenied: true };
            }
            throw error;
        }
    }
}
