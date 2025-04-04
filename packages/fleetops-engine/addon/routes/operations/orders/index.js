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

    
    // Track the last route we were on
    @tracked isComingFromOutsideOrders = true;
    
    @action willTransition(transition) {
        // Check if we're navigating within orders section
        if (transition.from && transition.from.name && transition.from.name.includes('operations.orders.index')) {
            this.isComingFromOutsideOrders = false;
        } else {
            this.isComingFromOutsideOrders = true;
        }
        
        const shouldReset = typeof transition.to.name === 'string' && !transition.to.name.includes('operations.orders');
        
        if (this.controller && shouldReset && typeof this.controller.resetView === 'function') {
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
        if (params.status) {
            params.status = params.status.toLowerCase().replace(/\s+/g, '_');
        }
        console.log(params);
        return this.store.query('order', params);
    }
    @action setupController(controller, model) {
        super.setupController(controller, model);
        
        // If coming from outside the orders section, force table view
        if (this.isComingFromOutsideOrders) {
            controller.set('layout', 'table');
            
            // No need to use replaceWith here since we've already set the controller property
            // The layout will update in the UI
        }
    }
    // This is called when entering the route
    beforeModel(transition) {
        // Check if we're going directly to the orders route from outside
        if (!transition.from || !transition.from.name || !transition.from.name.includes('operations.orders')) {
            // We're coming from outside - set a flag to force table view later
            this.isComingFromOutsideOrders = true;
            
            // If there's a 'layout=map' in the URL, update the URL but without using replaceWith
            if (transition.to.queryParams && transition.to.queryParams.layout === 'map') {
                // Instead of using replaceWith, we'll handle this in setupController
                // by just setting the controller property
            }
        }
    }
}
