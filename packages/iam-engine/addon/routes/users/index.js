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
        
        // Get status filter value and remove from API query
        const statusFilter = queryParams.status;
        delete queryParams.status;
        
        // Ensure page and limit params exist
        const page = parseInt(queryParams.page || 1, 10);
        const limit = parseInt(queryParams.limit || 30, 10);
        
        // Set page and limit in queryParams
        queryParams.page = page;
        queryParams.limit = limit;
        
        return this.store.query('user', queryParams).then((response) => {
            // If the response already has meta data from the API, use it
            if (response.meta) {
                return response;
            }
            
            // Otherwise, create pagination metadata on the client side
            const meta = {
                current_page: page,
                total_pages: Math.ceil(response.length / limit),
                total: response.length,
                per_page: limit
            };
            
            // Set meta on the result
            response.meta = meta;
            
            return response;
        });
    }
}
