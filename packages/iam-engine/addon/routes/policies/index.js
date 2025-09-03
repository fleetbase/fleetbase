import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { scheduleOnce } from '@ember/runloop'; // Import scheduleOnce

export default class PoliciesIndexRoute extends Route {
    @service store;
    @service loader; // Inject the loader service

    queryParams = {
        page: { refreshModel: true },
        limit: { refreshModel: true },
        sort: { refreshModel: true },
        query: { refreshModel: true },
        status: { refreshModel: true },
        service: { refreshModel: true },
        type: { refreshModel: true },
    };

    model(params) {
        this.loader.show(); 
        return this.store.query('policy', params);
    }

    setupController(controller, model) {
        super.setupController(...arguments);
        // Remove loader after the table and DOM have rendered
        scheduleOnce('afterRender', this, () => this.loader.remove());
    }
}
