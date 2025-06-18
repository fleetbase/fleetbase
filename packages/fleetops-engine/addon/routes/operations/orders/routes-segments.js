import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action, set } from '@ember/object';

export default class FleetOpsRoutesSegmentsRoute extends Route {
  @service fetch;
  @service notifications;
  @service store;
  
  // Query parameters that trigger a model refresh when changed
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

  // Override the routeSegments setter to debug
  _routeSegments = [];

  // Setter for routeSegments property, triggers property change notification
  set routeSegments(value) {
    this._routeSegments = value;
    this.notifyPropertyChange('routeSegments');
  }

  // Getter for routeSegments property
  get routeSegments() {
    return this._routeSegments;
  }

  /**
   * Action to refresh the current route.
   */
  @action refreshRoute() {
    return this.refresh();
  }

  /**
   * Fetches the model data for the route segments page.
   * @param {Object} params - Route parameters, including payload_uuid.
   * @returns {Object} Model data containing payload_uuid, routeSegments, and meta info.
   */
  async model(params) {
    try {
      const response = await this.fetch.get(`orders/${params.payload_uuid}/route-segments`);
      const modelData = {
        payload_uuid: params.payload_uuid,
        routeSegments: response.data || response.routeSegments || response || [],
        meta: response.meta || {}
      };
      return modelData;
    } catch (error) {
      this.notifications.serverError(error);
      return {
        payload_uuid: params.payload_uuid,
        routeSegments: [],
        meta: {}
      };
    }
  }

  /**
   * Sets up the controller with the model data after the model hook resolves.
   * @param {Ember.Controller} controller - The controller instance for this route.
   * @param {Object} model - The resolved model data.
   */
  setupController(controller, model) {
    super.setupController(controller, model);
    const routeSegments = model.routeSegments || [];
    controller.set('routeSegments', routeSegments);
    controller.set('payloadUuid', model.payload_uuid);
    controller.set('meta', model.meta || {});
  }

  /**
   * Lifecycle hook called before the model is fetched.
   * @param {Ember.Transition} transition - The transition object.
   */
  beforeModel(transition) {
    super.beforeModel(transition);
  }

  /**
   * Lifecycle hook called after the model is fetched.
   * @param {Object} model - The resolved model data.
   * @param {Ember.Transition} transition - The transition object.
   */
  afterModel(model, transition) {
    super.afterModel(model, transition);
  }

  /**
   * Handles logic before transitioning away from this route.
   * Resets the view if needed and manages pagination query param refresh behavior.
   * @param {Ember.Transition} transition - The transition object.
   */
  @action willTransition(transition) {
    const shouldReset = typeof transition.to.name === 'string' && !transition.to.name.includes('operations.orders');
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

  /**
   * Resets the controller state when exiting the route.
   * @param {Ember.Controller} controller - The controller instance for this route.
   * @param {boolean} isExiting - Whether the route is being exited.
   */
  resetController(controller, isExiting) {
    if (isExiting) {
      controller.set('page', 1);
    }
  }
  
}