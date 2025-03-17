import Route from '@ember/routing/route';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action, set } from '@ember/object';
import isNestedRouteTransition from '@fleetbase/ember-core/utils/is-nested-route-transition';

export default class OperationsOrdersIndexRoute extends Route {
    @service store;
    @tracked timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    @tracked queryParams = {
        page: { refreshModel: true },
        limit: { refreshModel: true },
        sort: { refreshModel: true },
        query: { refreshModel: true },
        status: { refreshModel: true },
        public_id: { refreshModel: true },
        internal_id: { refreshModel: true },
        payload: { refreshModel: true },
        tracking: { refreshModel: true },
        facilitator: { refreshModel: true },
        driver: { refreshModel: true },
        customer: { refreshModel: true },
        pickup: { refreshModel: true },
        dropoff: { refreshModel: true },
        after: { refreshModel: true },
        before: { refreshModel: true },
        type: { refreshModel: true },
        layout: { refreshModel: false },
        drawerOpen: { refreshModel: false },
        drawerTab: { refreshModel: false },
        orderPanelOpen: { refreshModel: false },
        on: { refreshModel:true },
        timezone: { refreshModel: true },
        created_by: { refreshModel: true },
        updated_by: { refreshModel: true },
        created_at: { refreshModel: true },
        updated_at: { refreshModel: true },
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

    @action model(params) {
        //add timezone also here
        params.timezone = this.timezone;
        // params.created_by = params.created_by || null; 
        return this.store.query('order', params);
    }
}
