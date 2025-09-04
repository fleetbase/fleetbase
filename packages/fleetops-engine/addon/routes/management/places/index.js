import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action, set } from '@ember/object';
import isNestedRouteTransition from '@fleetbase/ember-core/utils/is-nested-route-transition';
import { scheduleOnce } from '@ember/runloop'; // Import scheduleOnce

export default class ManagementPlacesIndexRoute extends Route {
    @service store;
    @service loader; // Inject the loader service

    queryParams = {
        page: { refreshModel: true },
        limit: { refreshModel: true },
        sort: { refreshModel: true },
        query: { refreshModel: true },
        country: { refreshModel: true },
        name: { refreshModel: true },
        address: { refreshModel: true },
        public_id: { refreshModel: true },
        city: { refreshModel: true },
        phone: { refreshModel: true },
        neighborhood: { refreshModel: true },
        postal_code: { refreshModel: true },
        state: { refreshModel: true },
        createdAt: { refreshModel: true },
        updatedAt: { refreshModel: true },
    };

    @action willTransition(transition) {
            const shouldReset = typeof transition.to.name === 'string' && !transition.to.name.includes('operations.orders');
    
            // Check if controller exists and has resetView function before calling it
            if (this.controller && shouldReset && typeof this.controller.resetView === 'function') {
                this.controller.resetView(transition);
            }
    
            const isPaginationTransition = transition.to.name === transition.from.name && 
                                        transition.to.queryParams.page !== transition.from.queryParams.page;
    
            if (isNestedRouteTransition(transition) && !isPaginationTransition) {
                set(this.queryParams, 'page.refreshModel', false);
                set(this.queryParams, 'sort.refreshModel', false);
            } else {
                set(this.queryParams, 'page.refreshModel', true);
                set(this.queryParams, 'sort.refreshModel', true);
            }
        }
    

    model(params) {
        this.loader.show(); // Show loader when model is loading
        return this.store.query('place', { ...params });
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
