import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class RolesIndexRoute extends Route {
    @service store;

    queryParams = {
        page: { refreshModel: true },
        limit: { refreshModel: true },
        sort: { refreshModel: true },
        query: { refreshModel: true },
        service: { refreshModel: true },
        type: { refreshModel: true },
    };

    model(params) {
        return this.store.query('role', params);
    }
}
