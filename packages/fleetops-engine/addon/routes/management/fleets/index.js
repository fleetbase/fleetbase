import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action, set } from '@ember/object';
import isNestedRouteTransition from '@fleetbase/ember-core/utils/is-nested-route-transition';

export default class ManagementFleetsIndexRoute extends Route {
    @service store;

    queryParams = {
        page: { refreshModel: true },
        limit: { refreshModel: true },
        sort: { refreshModel: true },
        query: { refreshModel: true },
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
            
                if (this.controller && shouldReset) {
                    this.controller.resetView(transition);
                }
            
                // Check if this is a pagination transition (URL only changes in query params, not path)
                const isPaginationTransition = transition.to.name === transition.from.name && 
                                             transition.to.queryParams.page !== transition.from.queryParams.page;
                
                // Only disable refreshModel for nested routes that aren't pagination transitions
                if (isNestedRouteTransition(transition) && !isPaginationTransition) {
                    set(this.queryParams, 'page.refreshModel', false);
                    set(this.queryParams, 'sort.refreshModel', false);
                } else {
                    // Ensure refreshModel is enabled for pagination
                    set(this.queryParams, 'page.refreshModel', true);
                    set(this.queryParams, 'sort.refreshModel', true);
                }
            }

    model(params) {
        return this.store.query('fleet', { ...params, with: ['parent_fleet', 'service_area', 'zone'] });
    }
}
