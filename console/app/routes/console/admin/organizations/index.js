import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ConsoleAdminOrganizationsRoute extends Route {
    @service store;

    queryParams = {
        page: { refreshModel: true },
        query: { refreshModel: true },
        sort: { refreshModel: true },
        limit: { refreshModel: true },
        name: { refreshModel: true },
        country: { refreshModel: true },
        status: { refreshModel: true },
        owner_email: { refreshModel: true },
        onboarding_completed: { refreshModel: true },
        billing_status: { refreshModel: true },
        created_at: { refreshModel: true },
        needs_attention: { refreshModel: true },
        missing_owner: { refreshModel: true },
        inactive_status: { refreshModel: true },
    };

    model(params) {
        return this.store.query('company', { view: 'admin', ...params });
    }
}
