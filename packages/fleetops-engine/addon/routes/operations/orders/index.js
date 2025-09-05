import Route from '@ember/routing/route';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action, set } from '@ember/object';
import isNestedRouteTransition from '@fleetbase/ember-core/utils/is-nested-route-transition';
import { scheduleOnce } from '@ember/runloop';

export default class OperationsOrdersIndexRoute extends Route {
    @service store;
    @service filters;
    @tracked timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    @service loader;
    @tracked queryParams = {
        page: { refreshModel: true },
        limit: { refreshModel: true },
        sort: { refreshModel: true },
        query: { refreshModel: true },
        status: { refreshModel: true },
        public_id: { refreshModel: true },
        internal_id: { refreshModel: true },
        trip_id: { refreshModel: true },
        payload: { refreshModel: true },
        tracking: { refreshModel: true },
        facilitator: { refreshModel: true },
        driver: { refreshModel: true },
        vehicle: { refreshModel: true },
        fleet: { refreshModel: true },
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
        updated_at: { refreshModel: true }
        
    };

    
    // Track the last route we were on
    @tracked isComingFromOutsideOrders = true;
    
    @action willTransition(transition) {
        // Always show loader during transitions (including QP-only)
        // this.loader.showOnTransition(transition, 'section.next-view-section');
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
        
        // Check if we're coming back from import (has timestamp parameter and coming from new order route)
        const isComingFromImport = transition.to.queryParams.t && 
                                   transition.from && 
                                   transition.from.name && 
                                   (transition.from.name.includes('operations.orders.index.new') || 
                                    transition.from.name.includes('console.fleet-ops.operations.orders.index.new'));
        
        // Only disable refreshModel for nested routes that aren't pagination transitions or import returns
        // BUT NEVER disable refreshModel for page parameter - pagination must always work
        if (isNestedRouteTransition(transition) && !isPaginationTransition && !isComingFromImport) {
            // Only disable refreshModel for non-pagination parameters
            set(this.queryParams, 'sort.refreshModel', false);
            // Keep page.refreshModel always true for pagination to work
            set(this.queryParams, 'page.refreshModel', true);
        } else {
            // Ensure refreshModel is enabled for pagination and import returns
            set(this.queryParams, 'page.refreshModel', true);
            set(this.queryParams, 'sort.refreshModel', true);
        }
    }

    @action async model(params) {
        //add timezone also here
        params.timezone = this.timezone;
        if (params.status) {
            params.status = params.status.toLowerCase().replace(/\s+/g, '_');
        }
        console.log(params);
        // Show loader while fetching orders
        this.loader.show('section.next-view-section');
        
        const orders = await this.store.query('order', params);
        
        // Load fleet data for each order that has a fleet_uuid
        const fleetLoadPromises = orders.map(async (order) => {
            if (order.fleet_uuid && !order.fleet) {
                try {
                    await order.loadFleet();
                } catch (error) {
                    console.warn('Failed to load fleet for order:', order.id, error);
                }
            }
        });
        
        await Promise.all(fleetLoadPromises);
        
        return orders;
    }
    @action setupController(controller, model) {
        super.setupController(controller, model);
        
        // If coming from outside the orders section, force table view
        if (this.isComingFromOutsideOrders) {
            controller.set('layout', 'table');
            
            // No need to use replaceWith here since we've already set the controller property
            // The layout will update in the UI
        }

        // Remove loader after DOM has rendered
        scheduleOnce('afterRender', this, () => this.loader.remove());
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

    resetController(controller, isExiting, transition) {
        if (isExiting) {
            // Explicitly reset ALL query parameters to undefined to break sticky behavior
            const queryParamKeys = [
                'page', 'limit', 'sort', 'query', 'public_id', 'internal_id', 'trip_id', 
                'payload', 'tracking', 'facilitator', 'customer', 'driver', 
                'vehicle', 'pickup', 'dropoff', 'created_by', 'updated_by', 
                'status', 'type', 'on','fleet'
            ];
            
            const resetParams = {};
            queryParamKeys.forEach(key => {
                resetParams[key] = undefined;
            });
            
            // Set to undefined first to break sticky behavior
            controller.setProperties(resetParams);
            
            // Then set to actual default values
            controller.setProperties({
                page: 1,
                limit: undefined,
                sort: '-created_at',
                query: undefined,
                public_id: undefined,
                internal_id: undefined,
                trip_id: undefined,
                payload: undefined,
                tracking: undefined,
                facilitator: undefined,
                customer: undefined,
                driver: undefined,
                vehicle: undefined,
                pickup: undefined,
                dropoff: undefined,
                created_by: undefined,
                updated_by: undefined,
                status: undefined,
                type: undefined,
                on: undefined,
                isSearchVisible: false,
                fleet: undefined
            });
            this.filters.clearStalePendingParams(controller);
        }
    }
}
