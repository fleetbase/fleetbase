import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action, set } from '@ember/object';
import isNestedRouteTransition from '@fleetbase/ember-core/utils/is-nested-route-transition';
import { scheduleOnce } from '@ember/runloop'; // Import scheduleOnce

export default class ManagementFleetsIndexRoute extends Route {
    @service store;
    @service loader; // Inject the loader service

    queryParams = {
        page: { refreshModel: true },
        limit: { refreshModel: true },
        sort: { refreshModel: true },
        query: { refreshModel: true }, // Ensure query refreshes model
        status: { refreshModel: true },
        public_id: { refreshModel: true },
        zone: { refreshModel: true },
        service_area: { refreshModel: true },
        parent_fleet_uuid: { refreshModel: true },
        task: { refreshModel: true },
        name: { refreshModel: true },
        vendor: { refreshModel: true },
        drivers_count: { refreshModel: true },
        drivers_online_count: { refreshModel: true },
        createdAt: { refreshModel: true },
        updatedAt: { refreshModel: true },
    };

     @action willTransition(transition) {
        const shouldReset = typeof transition.to.name === 'string' && !transition.to.name.includes('operations.orders');

        // Check if controller exists and has resetView function before calling it
        if (this.controller && shouldReset && typeof this.controller.resetView === 'function') {
            this.controller.resetView(transition);
        }

        // Always ensure pagination and sort trigger model refresh, even during nested transitions
        set(this.queryParams, 'page.refreshModel', true);
        set(this.queryParams, 'sort.refreshModel', true);
     }
     

    model(params) {
        this.loader.show(); // Show loader when model is loading
        return this.store.query('fleet', { ...params, with: ['parent_fleet', 'service_area', 'zone'] });
    }

    setupController(controller, model) {
        super.setupController(...arguments);
        // Remove loader after the table and DOM have rendered
        scheduleOnce('afterRender', this, () => this.loader.remove());
    }

    resetController(controller, isExiting) {
        if (isExiting) {
            controller.set('page', 1);
        }
    }
}
