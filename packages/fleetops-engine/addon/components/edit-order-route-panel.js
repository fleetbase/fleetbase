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
     * Service for analytics
     *
     * @type {Service}
     */
    @service analytics;

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

    showErrorOnce(message) {
        if (message !== this.lastErrorMessage) {
            this.notifications.error(message);
            this.lastErrorMessage = message;
            setTimeout(() => {
                if (this.lastErrorMessage === message) {
                    this.lastErrorMessage = null;
                }
            }, 4000);
        }
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
            if (payload.waypoints.length < 2) {
                this.showErrorOnce(WAYPOINTS_ERROR);
                return;
            }
            // Check for empty waypoints
            const hasEmptyWaypoint = payload.waypoints.some(waypoint =>
                !waypoint.public_id || // Check if waypoint has a public_id
                !waypoint.latitude ||  // Or check directly for coordinates if that's how they're stored
                !waypoint.longitude ||
                waypoint.hasInvalidCoordinates
            );
            if (hasEmptyWaypoint) {
                this.showErrorOnce(WAYPOINTS_ERROR);
                return;
            }
            let hasConsecutiveDuplicates = false;
            for (let i = 1; i < payload.waypoints.length; i++) {
                const prev = payload.waypoints[i - 1];
                const curr = payload.waypoints[i];
                if (
                    prev.public_id === curr.public_id ||
                    prev.name === curr.name
                ) {
                    hasConsecutiveDuplicates = true;
                    break;
                }
            }
            if (hasConsecutiveDuplicates) {
                this.showErrorOnce(this.intl.t('common.duplicate-waypoint-error'));
                return;
            }

        }
        else {
            if (!payload.pickup || !payload.dropoff) {
                this.showErrorOnce(this.intl.t('common.pickup-dropoff-error'));
                return;
            }
        }
        try {
            // Before serializing waypoints in save()
            payload.waypoints.forEach((waypoint, idx) => {
                waypoint.order = idx;
            });
            console.log("editorderRoute", payload.waypoints);
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
                    if (!waypoint.id && !waypoint.place_uuid) {
                        waypointsToRemove.push(waypoint);
                    }
                });
                // Then remove them from the array
                if (waypointsToRemove.length > 0) {
                    waypointsToRemove.forEach(waypoint => {
                        waypoints.removeObject(waypoint);
                    });
                }
                // Now remove all duplicates (not just consecutive ones)
                this.removeDuplicateWaypoints(waypoints);

            }
            this.notifications.success(this.intl.t('fleet-ops.operations.orders.index.view.update-success', { orderId: this.order.public_id }));
            contextComponentCallback(this, 'onAfterSave', this.order);

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
    /**
  * Enhanced onPressCancel method that handles both server reload and empty waypoint removal
  */
    @action onPressCancel() {
        // First clean up empty waypoints before server reload
        if (this.order?.payload?.waypoints && this.order.payload.waypoints.length > 0) {
            // Identify waypoints to remove
            const waypointsToRemove = [];

            this.order.payload.waypoints.forEach(waypoint => {
                // Check if waypoint is empty/invalid
                const isEmpty = !waypoint.public_id ||
                    !waypoint.place_uuid ||
                    !waypoint.name ||
                    !waypoint.latitude ||
                    !waypoint.longitude ||
                    waypoint.hasInvalidCoordinates;

                if (isEmpty) {
                    waypointsToRemove.push(waypoint);
                }
            });

            // Remove the empty waypoints
            if (waypointsToRemove.length > 0) {
                waypointsToRemove.forEach(waypoint => {
                    this.order.payload.waypoints.removeObject(waypoint);
                });

                // If multi-drop mode is enabled but no waypoints remain, disable multi-drop
                if (this.order.payload.isMultiDrop && this.order.payload.waypoints.length === 0) {
                    this.order.payload.isMultiDrop = false;
                }
            }
        }

        // Then reload the order from the server to discard any other changes
        if (this.order && this.order.id) {
            console.log(`Reloading order ${this.order.id} from server on cancel`);

            this.store.findRecord('order', this.order.id, { reload: true })
                .then((freshOrder) => {
                    console.log('Successfully reloaded order from server');
                    this.order = freshOrder;

                    // Notify about route change
                    contextComponentCallback(this, 'onRouteChanged');
                })
                .catch((error) => {
                    console.error('Error reloading order from server:', error);
                    this.notifications.error(this.intl.t('fleet-ops.errors.unable-to-reload-order'));
                });
        } else {
            // If no server reload, still notify about the route change
            contextComponentCallback(this, 'onRouteChanged');
        }

        // Call the original cancel callback
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

                // Track route optimization in analytics
                if (this.analytics && this.analytics.isInitialized) {
                    this.analytics.trackRouteOptimization({
                        id: this.order.id,
                        uuid: this.order.uuid,
                        name: this.order.public_id,
                        stops_count: responseWaypoints.length,
                        total_distance: response.routes?.[0]?.distance || 0,
                        total_time: response.routes?.[0]?.duration || 0,
                        optimization_type: 'waypoint_reordering'
                    });
                }
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

    /**
     * 
     * @param {*} waypoints 
     * @returns 
     */
    removeDuplicateWaypoints(waypoints) {
        if (!waypoints || waypoints.length <= 1) {
            return waypoints;
        }
        const toRemove = [];
        for (let i = 1; i < waypoints.length; i++) {
            const prev = waypoints[i - 1];
            const curr = waypoints[i];
            if (
                prev.public_id === curr.public_id ||
                prev.name === curr.name
            ) {
                toRemove.push(curr);
            }
        }
        toRemove.forEach(waypoint => {
            waypoints.removeObject(waypoint);
        });
        return waypoints;
    }

}
