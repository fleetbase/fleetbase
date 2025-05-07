import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action, set } from '@ember/object';
import isNestedRouteTransition from '@fleetbase/ember-core/utils/is-nested-route-transition';
import { tracked } from '@glimmer/tracking';
import { A } from '@ember/array';

export default class ManagementVehiclesIndexRoute extends Route {
    @service store;
    @tracked _filterParams ;
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
            // Store this for later use
            this._filterParams = params;
            
            // Special handling for pending status that also includes null status vehicles
            if (params.status === 'pending') {
              // Make a copy of params without status for the second query
              const paramsWithoutStatus = { ...params };
              delete paramsWithoutStatus.status;
              
              // First get pending vehicles
              return this.store.query('vehicle', params)
                .then(pendingResults => {
                  // Save pagination metadata from the first query
                  const meta = pendingResults.meta || {};
                  
                  // Now get all vehicles with the same filters (minus status) and filter for null status
                  return this.store.query('vehicle', { ...paramsWithoutStatus, limit: 100 })
                    .then(allVehicles => {
                      // Filter to find null status vehicles
                      const nullVehicles = allVehicles.filter(v => v.status === null);
                      
                      // Create a new array with both sets of results
                      const combinedResults = A();
                      
                      // Add pending results first
                      pendingResults.forEach(vehicle => {
                        combinedResults.pushObject(vehicle);
                      });
                      
                      // Then add null status vehicles if not already included
                      nullVehicles.forEach(vehicle => {
                        if (!combinedResults.find(v => v.id === vehicle.id)) {
                          combinedResults.pushObject(vehicle);
                        }
                      });
                      
                      // Add metadata to the array for pagination
                      combinedResults.meta = meta;
                      
                      // Add the pagination properties directly to the array
                      combinedResults.current_page = meta.current_page || 1;
                      combinedResults.total_pages = meta.total_pages || 1;
                      combinedResults.total = meta.total || combinedResults.length;
                      combinedResults.per_page = meta.per_page || 25;
                      
                      return combinedResults;
                    });
                });
            }
            
            // For any other status, just make the normal query
            return this.store.query('vehicle', params);
          }
          
          // Modify the setupController if needed
          setupController(controller, model) {
            super.setupController(...arguments);
            // Make sure filters are enabled
            if (controller.set) {
              controller.set('isFilterEnabled', true);
              if (this._filterParams) {
                // Set all filter parameters on the controller for the UI
                Object.keys(this._filterParams).forEach(key => {
                  const controllerKey = `current${key.charAt(0).toUpperCase() + key.slice(1)}`;
                  if (this._filterParams[key]) {
                    controller.set(controllerKey, this._filterParams[key]);
                  }
                });
              }
            }
          }
    
}
