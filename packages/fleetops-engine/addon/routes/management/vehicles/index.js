import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action, set } from '@ember/object';
import isNestedRouteTransition from '@fleetbase/ember-core/utils/is-nested-route-transition';

export default class ManagementVehiclesIndexRoute extends Route {
    @service store;

    queryParams = {
        page: { refreshModel: true },
        limit: { refreshModel: true },
        sort: { refreshModel: true },
        query: { refreshModel: true },
        status: { refreshModel: true },
        display_name: { refreshModel: true },
        public_id: { refreshModel: true },
        vin: { refreshModel: true },
        plate_number: { refreshModel: true },
        vehicle_make: { refreshModel: true },
        vehicle_model: { refreshModel: true },
        year: { refreshModel: true },
        country: { refreshModel: true },
        fleet: { refreshModel: true },
        vendor: { refreshModel: true },
        driver: { refreshModel: true },
        created_at: { refreshModel: true },
        updated_at: { refreshModel: true },
        'within[latitude]': { refreshModel: true, replace: true },
        'within[longitude]': { refreshModel: true, replace: true },
        'within[radius]': { refreshModel: true, replace: true },
        'within[where]': { refreshModel: true, replace: true },
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
        return this.store.query('vehicle', { ...params });
    }
}
