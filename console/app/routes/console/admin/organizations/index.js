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
    };

    model(params) {
        return this.store.query('company', { view: 'admin', ...params });
    }
}
