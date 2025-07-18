import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class UsersIndexRoute extends Route {
    @service store;

    queryParams = {
        page: { refreshModel: true },
        limit: { refreshModel: true },
        sort: { refreshModel: true },
        query: { refreshModel: true },
        status: { refreshModel: true },
        role: { refreshModel: true },
        name: { refreshModel: true },
    };

    model(params) {
        const queryParams = { ...params };
        
        // Ensure page and limit params exist
        const page = parseInt(queryParams.page || 1, 10);
        const limit = parseInt(queryParams.limit || 30, 10);
        
        // Set page and limit in queryParams
        queryParams.page = page;
        queryParams.limit = limit;
        
        return this.store.query('user', queryParams);
    }
}
