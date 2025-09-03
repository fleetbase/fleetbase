import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { scheduleOnce } from '@ember/runloop'; // Import scheduleOnce

export default class UsersIndexRoute extends Route {
    @service store;
    @service loader; // Inject the loader service

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
        this.loader.show(); // Show loader when model is loading
        const queryParams = { ...params };
        
        // Ensure page and limit params exist
        const page = parseInt(queryParams.page || 1, 10);
        const limit = parseInt(queryParams.limit || 30, 10);
        
        // Set page and limit in queryParams
        queryParams.page = page;
        queryParams.limit = limit;
        
        return this.store.query('user', queryParams);
    }

    setupController(controller, model) {
        super.setupController(...arguments);
        // Remove loader after the table and DOM have rendered
        scheduleOnce('afterRender', this, () => this.loader.remove());
    }
}
