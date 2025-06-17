import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action, set } from '@ember/object';
import { observer } from '@ember/object';

export default class FleetOpsRoutesSegmentsRoute extends Route {
  @service fetch;
  @service notifications;
  @service store;
  
  queryParams = {
    page: { refreshModel: true },
    limit: { refreshModel: true },
    sort: { refreshModel: true },
    query: { refreshModel: true },
    status: { refreshModel: true },
    from_place_name: { refreshModel: true },
    to_place_name: { refreshModel: true },
    public_id: { refreshModel: true },
    order_id: { refreshModel: true },
    payload_id: { refreshModel: true },
    from_waypoint_id: { refreshModel: true },
    to_waypoint_id: { refreshModel: true },
    created_by: { refreshModel: true },
    updated_by: { refreshModel: true },
  };

  // Add debugging observer
routeSegmentsObserver = observer('routeSegments', function() {
  console.log('=== ROUTE SEGMENTS CHANGED ===');
  console.log('New value:', this.routeSegments);
  console.log('Length:', this.routeSegments ? this.routeSegments.length : 'null');
  console.log('Type:', typeof this.routeSegments);
  console.log('Is array:', Array.isArray(this.routeSegments));
});

// Override the routeSegments setter to debug
_routeSegments = [];

set routeSegments(value) {
  console.log('Setting routeSegments to:', value);
  this._routeSegments = value;
  this.notifyPropertyChange('routeSegments');
}

get routeSegments() {
  console.log('Getting routeSegments:', this._routeSegments);
  return this._routeSegments;
}
  // Add action to refresh route data
  @action refreshRoute() {
    return this.refresh();
  }

  async model(params) {
    try {
      console.log('=== ROUTE MODEL DEBUG ===');
      console.log('Params:', params);
      
      const response = await this.fetch.get(`orders/${params.payload_uuid}/route-segments`);
      console.log('Raw API response:', response);
      console.log('Response type:', typeof response);
      console.log('Response keys:', Object.keys(response || {}));
      
      // Check all possible data locations
      console.log('response.data:', response.data);
      console.log('response.routeSegments:', response.routeSegments);
      console.log('response (as array):', Array.isArray(response) ? response : 'not array');
      
      const modelData = {
        payload_uuid: params.payload_uuid,
        routeSegments: response.data || response.routeSegments || response || [],
        meta: response.meta || {}
      };
      
      console.log('=== FINAL MODEL DATA ===');
      console.log('modelData:', modelData);
      console.log('modelData.routeSegments:', modelData.routeSegments);
      console.log('modelData.routeSegments.length:', modelData.routeSegments.length);
      console.log('First segment:', modelData.routeSegments[0]);
      
      return modelData;
    } catch (error) {
      console.error('Model error:', error);
      this.notifications.serverError(error);
      return {
        payload_uuid: params.payload_uuid,
        routeSegments: [],
        meta: {}
      };
    }
  }

  setupController(controller, model) {
    console.log('=== SETUP CONTROLLER DEBUG ===');
    console.log('Controller:', controller);
    console.log('Model passed to setupController:', model);
    console.log('Model.routeSegments:', model.routeSegments);
    
    // Call parent first
    super.setupController(controller, model);
    
    // Force set properties using Ember.set for older versions
    const routeSegments = model.routeSegments || [];
    console.log('Setting routeSegments:', routeSegments);
    
    // Try multiple ways to set the data
    controller.set('routeSegments', routeSegments);
    controller.set('payloadUuid', model.payload_uuid);
    controller.set('meta', model.meta || {});
    
    // Force property notification
    controller.notifyPropertyChange('routeSegments');
    
    // Verify it was set
    console.log('After setting - controller.routeSegments:', controller.get('routeSegments'));
    console.log('After setting - controller.routeSegments.length:', controller.get('routeSegments').length);
    
    // Alternative: Set on next run loop
    setTimeout(() => {
      controller.set('routeSegments', routeSegments);
      controller.notifyPropertyChange('routeSegments');
      console.log('Delayed set - controller.routeSegments:', controller.get('routeSegments'));
    }, 100);
    
    console.log('=== END SETUP CONTROLLER DEBUG ===');
  }

  // Add beforeModel hook to ensure fresh data
  beforeModel(transition) {
    console.log('beforeModel called');
    super.beforeModel(transition);
  }

  // Add afterModel hook for debugging
  afterModel(model, transition) {
    console.log('afterModel called with:', model);
    super.afterModel(model, transition);
  }

  @action willTransition(transition) {
    const shouldReset = typeof transition.to.name === 'string' && !transition.to.name.includes('operations.orders');

    // Check if controller exists and has resetView function before calling it
    if (this.controller && shouldReset && typeof this.controller.resetView === 'function') {
        this.controller.resetView(transition);
    }

    const isPaginationTransition = transition.to.name === transition.from.name &&
                                 transition.to.queryParams.page !== transition.from.queryParams.page;

    if (isPaginationTransition) {
      set(this.queryParams, 'page.refreshModel', false);
      set(this.queryParams, 'sort.refreshModel', false);
    } else {
      set(this.queryParams, 'page.refreshModel', true);
      set(this.queryParams, 'sort.refreshModel', true);
    }
  }

  resetController(controller, isExiting) {
    if (isExiting) {
      controller.set('page', 1);
    }
  }
  
}