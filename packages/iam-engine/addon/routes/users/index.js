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
        const limit = parseInt(queryParams.limit || 20, 10);
        
        // Keep page and limit in queryParams
        queryParams.page = page;
        queryParams.limit = limit;
        
        return this.store.query('user', queryParams).then(users => {
            // Apply client-side status filtering
            let filteredUsers = users;
            
            if (statusFilter) {
                filteredUsers = users.filter(user => user.get('session_status') === statusFilter);
            }
            
            // Create pagination metadata
            const meta = {
                current_page: page,
                total_pages: Math.ceil(filteredUsers.length / limit),
                total: filteredUsers.length,
                // Include any other pagination properties needed
            };
            
            // Set meta on the result
            filteredUsers.meta = meta; // Directly set property instead of using set()
            
            return filteredUsers;
        });
    }
}
