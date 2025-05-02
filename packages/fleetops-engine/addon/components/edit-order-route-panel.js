import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { isArray } from '@ember/array';
import { task } from 'ember-concurrency-decorators';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';
import applyContextComponentArguments from '@fleetbase/ember-core/utils/apply-context-component-arguments';
import getRoutingHost from '@fleetbase/ember-core/utils/get-routing-host';
import Point from '@fleetbase/fleetops-data/utils/geojson/point';
import findClosestWaypoint from '@fleetbase/ember-core/utils/find-closest-waypoint';

export default class EditOrderRoutePanelComponent extends Component {
    /**
     * Fetch service.
     *
     * @type {Service}
     */
    @service fetch;

    /**
     * Ember data store service.
     *
     * @type {Service}
     */
    @service store;

    /**
     * Service for managing routing within the host app.
     *
     * @type {Service}
     */
    @service hostRouter;

    /**
     * Service for managing the modals.
     *
     * @type {Service}
     */
    @service modalsManager;

    /**
     * Service for managing the context panel.
     *
     * @type {Service}
     */
    @service contextPanel;

    /**
     * Service for internationalization.
     *
     * @type {Service}
     */
    @service intl;

    /**
     * Service for notifications
     *
     * @type {Service}
     */
    @service notifications;

    /**
     * The orderwhich route is being edited.
     *
     * @type {OrderModel}
     * @tracked
     */
    @tracked order;

    /**
     * Initializes the vehicle panel component.
     */
    constructor() {
        super(...arguments);
        this.order = this.args.order;
        applyContextComponentArguments(this);
    }

    /**
     * Sets the overlay context.
     *
     * @action
     * @param {OverlayContextObject} overlayContext
     */
    @action setOverlayContext(overlayContext) {
        this.context = overlayContext;
        contextComponentCallback(this, 'onLoad', ...arguments);
    }

   
    /**
     * Task to save order route.
     *
     * @return {void}
     * @memberof EditOrderRoutePanelComponent
     */
    @task *save() {
        const { payload } = this.order;
        const WAYPOINTS_ERROR = this.intl.t('common.valid-waypoints-error');
        if (payload.isMultiDrop && payload.waypoints && payload.waypoints.length > 0) {
            // Check for empty waypoints
            const hasEmptyWaypoint = payload.waypoints.some(waypoint => 
                !waypoint.public_id || // Check if waypoint has a public_id
                !waypoint.latitude ||  // Or check directly for coordinates if that's how they're stored
                !waypoint.longitude ||
                waypoint.hasInvalidCoordinates
            );
            if (hasEmptyWaypoint) {
                this.notifications.error(WAYPOINTS_ERROR);
                return;
            }
            let hasConsecutiveDuplicates = false;
            
            // Check for consecutive duplicate waypoints
            for (let i = 1; i < payload.waypoints.length; i++) {
                const currentWaypoint = payload.waypoints[i];
                const previousWaypoint = payload.waypoints[i-1];
                
                // Check if current and previous have the same public_id
                if (currentWaypoint.public_id && 
                    previousWaypoint.public_id && 
                    currentWaypoint.public_id === previousWaypoint.public_id) {
                    hasConsecutiveDuplicates = true;
                    break;
                }
            }
            
            if (hasConsecutiveDuplicates) {
                this.notifications.error(this.intl.t('common.duplicate-waypoint-error'));
                return;
            }
           
        }
        else{
            if(!payload.pickup || !payload.dropoff){
                this.notifications.error(this.intl.t('common.pickup-dropoff-error'));
                return;
            }
        }
        try {
            this.order = yield this.fetch.patch(
                `orders/route/${this.order.id}`,
                {
                    pickup: payload.pickup,
                    dropoff: payload.dropoff,
                    return: payload.return,
                    waypoints: this._serializeWaypoints(payload.waypoints),
                },
                {
                    normalizeToEmberData: true,
                    normalizeModelType: 'order',
                }
            );
           // Clean up waypoints after save
        if (this.order.payload && this.order.payload.waypoints) {
            const waypoints = this.order.payload.waypoints;
            const waypointsToRemove = [];
            
            // First identify which waypoints need to be removed
            waypoints.forEach(waypoint => {
                if (!waypoint.id) {
                    waypointsToRemove.push(waypoint);
                }
            });
            console.log("waypointsToRemove",waypointsToRemove);
            // Then remove them from the array
            if (waypointsToRemove.length > 0) {
                console.log("Removing", waypointsToRemove.length, "invalid waypoints");
                waypointsToRemove.forEach(waypoint => {
                    waypoints.removeObject(waypoint);
                });
            }
            
        this.notifications.success(this.intl.t('fleet-ops.operations.orders.index.view.update-success', { orderId: this.order.public_id }));
        contextComponentCallback(this, 'onAfterSave', this.order);
        }
        
        
        } catch (error) {
            this.notifications.serverError(error);
            return;
        }
      
    }

    _serializeWaypoints(waypoints = []) {
        if (!waypoints) {
            return [];
        }

        waypoints = typeof waypoints.toArray === 'function' ? waypoints.toArray() : Array.from(waypoints);
        return waypoints.map((waypoint) => {
            const json = waypoint.serialize();
            // if place is serialized just send it back
            if (json.place) {
                return json;
            }

            // set id for place_uuid
            json.place_uuid = waypoint.place ? waypoint.place.id : waypoint.place_uuid;

            return json;
        });
    }

    /**
     * Handles the cancel action.
     *
     * @method
     * @action
     * @returns {Boolean} Indicates whether the cancel action was overridden.
     */
    @action onPressCancel() {
        return contextComponentCallback(this, 'onPressCancel', this.order);
    }

    @action async editPlace(place) {
        await this.modalsManager.done();

        this.contextPanel.focus(place, 'editing', {
            args: {
                onClose: () => {
                    this.editOrderRoute(this.order);
                },
            },
        });
    }

    @action toggleMultiDropOrder(isMultiDrop) {
        const { pickup, dropoff } = this.order.payload;

        if (isMultiDrop) {
            // if pickup move it to multipdrop
            if (pickup) {
                this.addWaypointFromExistingPlace(pickup);
            }

            // if pickup move it to multipdrop
            if (dropoff) {
                this.addWaypointFromExistingPlace(dropoff);
            }

            this.order.payload.setProperties({
                pickup: null,
                dropoff: null,
                return: null,
                pickup_uuid: null,
                dropoff_uuid: null,
                return_uuid: null,
            });
        } else {
            // get pickup from payload waypoints if available
            const waypoints = typeof this.order.payload.waypoints.toArray === 'function' ? this.order.payload.waypoints.toArray() : Array.from(this.order.payload.waypoints);

            if (waypoints[0]) {
                const pickup = this.createPlaceFromWaypoint(waypoints[0]);
                this.order.payload.set('pickup', pickup);
            }

            if (waypoints[1]) {
                const dropoff = this.createPlaceFromWaypoint(waypoints[1]);
                this.order.payload.set('dropoff', dropoff);
            }

            this.order.payload.setProperties({
                waypoints: [],
            });
        }

        // this.isMultiDrop = isMultiDrop;
        contextComponentCallback(this, 'onRouteChanged');
    }

    createPlaceFromWaypoint(waypoint) {
        const json = waypoint.serialize();
        return this.store.createRecord('place', json);
    }

    addWaypointFromExistingPlace(place) {
        const json = place.serialize();
        const waypoint = this.store.createRecord('waypoint', {
            uuid: place.id,
            place_uuid: place.id,
            location: place.location,
            place,
            ...json,
        });
        this.order.payload.waypoints.pushObject(waypoint);

        // fire callback
        contextComponentCallback(this, 'onWaypointAdded', waypoint);
    }

    @action removeWaypoint(waypoint) {
        this.order.payload.waypoints.removeObject(waypoint);

        // fire callback
        contextComponentCallback(this, 'onWaypointRemoved', waypoint);
        contextComponentCallback(this, 'onRouteChanged');
    }

    @action addWaypoint() {
        const location = new Point(0, 0);
        const place = this.store.createRecord('place', { location });
        const waypoint = this.store.createRecord('waypoint', { place, location });
        this.order.payload.waypoints.pushObject(waypoint);
        // fire callback
        contextComponentCallback(this, 'onWaypointAdded', waypoint);
        
    }

    @action setWaypointPlace(index, place) {
        if (isArray(this.order.payload.waypoints) && !this.order.payload.waypoints.objectAt(index)) {
            return;
        }
    
        const json = place.serialize();
        const publicId = place.id;
        
        // Check for consecutive duplicates
        const previousIndex = index - 1;
        const nextIndex = index + 1;
        
        // Check if previous waypoint has the same public_id
        if (previousIndex >= 0) {
            const previousWaypoint = this.order.payload.waypoints.objectAt(previousIndex);
            if (previousWaypoint && previousWaypoint.public_id === publicId) {
                this.notifications.error(this.intl.t('common.consecutive-duplicate-waypoint-error'));
                return;
            }
        }
        
        // Check if next waypoint has the same public_id
        if (nextIndex < this.order.payload.waypoints.length) {
            const nextWaypoint = this.order.payload.waypoints.objectAt(nextIndex);
            if (nextWaypoint && nextWaypoint.public_id === publicId) {
                this.notifications.error(this.intl.t('common.consecutive-duplicate-waypoint-error'));
                return;
            }
        }
        
        this.order.payload.waypoints.objectAt(index).setProperties({
            uuid: place.id,
            place_uuid: place.id,
            public_id: place.id,
            location: place.location,
            place,
            ...json,
        });
    
        // fire callback waypoint place selected
        contextComponentCallback(this, 'onWaypointPlaceSelected', place);
        contextComponentCallback(this, 'onRouteChanged');
    }

    @action setPayloadPlace(prop, place) {
        this.order.payload.set(prop, place);

        // fire callback
        contextComponentCallback(this, 'onPlaceSelected', place);
        contextComponentCallback(this, 'onRouteChanged');
    }

    @action async optimizeRoute() {
        this.isOptimizingRoute = true;

        const coordinates = this.order.payload.payloadCoordinates;
        const routingHost = getRoutingHost(this.order.payload, this.order.payload.waypoints);
        let sortedWaypoints = [];

        const response = await this.fetch.routing(coordinates, { source: 'any', destination: 'any', annotations: true }, { host: routingHost }).catch(() => {
            this.notifications.error(this.intl.t('fleet-ops.operations.orders.index.view.route-error'));
            this.isOptimizingRoute = false;
        });

        if (response && response.code === 'Ok') {
            if (response.waypoints && isArray(response.waypoints)) {
                const responseWaypoints = response.waypoints.sortBy('waypoint_index');

                for (let i = 0; i < responseWaypoints.length; i++) {
                    const optimizedWaypoint = responseWaypoints.objectAt(i);
                    const optimizedWaypointLongitude = optimizedWaypoint.location.firstObject;
                    const optimizedWaypointLatitude = optimizedWaypoint.location.lastObject;
                    const waypointModel = findClosestWaypoint(optimizedWaypointLatitude, optimizedWaypointLongitude, this.order.payload.waypoints);

                    sortedWaypoints.pushObject(waypointModel);
                }

                this.order.payload.waypoints = sortedWaypoints;
            }
        } else {
            this.notifications.error(this.intl.t('fleet-ops.operations.orders.index.view.route-error'));
        }

        this.isOptimizingRoute = false;
    }

    @action sortWaypoints({ sourceList, sourceIndex, targetList, targetIndex }) {
        if (sourceList === targetList && sourceIndex === targetIndex) {
            return;
        }

        const item = sourceList.objectAt(sourceIndex);

        sourceList.removeAt(sourceIndex);
        targetList.insertAt(targetIndex, item);

        contextComponentCallback(this, 'onRouteChanged');
    }
}
