import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isArray } from '@ember/array';
import { getOwner } from '@ember/application';
import { later } from '@ember/runloop';
import { debug } from '@ember/debug';
import { task } from 'ember-concurrency';
import { OSRMv1, Control as RoutingControl } from '@fleetbase/leaflet-routing-machine';
import getRoutingHost from '@fleetbase/ember-core/utils/get-routing-host';
import engineService from '@fleetbase/ember-core/decorators/engine-service';

export default class OrderTrackingLookupComponent extends Component {
    @service urlSearchParams;
    @service fetch;
    @service notifications;
    @service socket;
    @service currentUser;
    @service universe;
    @engineService('@fleetbase/fleetops-engine') location;
    @engineService('@fleetbase/fleetops-engine') movementTracker;
    @tracked trackingNumber;
    @tracked order;
    @tracked zoom = 12;
    @tracked map;
    @tracked mapReady = false;
    @tracked latitude;
    @tracked longitude;
    @tracked route;
    @tracked tileSourceUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';

    constructor() {
        super(...arguments);
        this.movementTracker.registerTrackingMarker();
        const trackingNumber = this.urlSearchParams.get('order');
        if (trackingNumber) {
            this.trackingNumber = trackingNumber;
            this.lookupOrder.perform();
        }

        this.location.getUserLocation().then(({ latitude, longitude }) => {
            this.latitude = latitude;
            this.longitude = longitude;
            this.mapReady = true;
        });
    }

    @task *lookupOrder() {
        try {
            this.order = yield this.fetch.get('fleet-ops/lookup', { tracking: this.trackingNumber }, { normalizeToEmberData: true, normalizeModelType: 'order' });
            this.urlSearchParams.addParamToCurrentUrl('order', this.order.tracking);
            const driverCurrentLocation = this.order.get('tracker_data.driver_current_location');
            if (driverCurrentLocation) {
                this.latitude = driverCurrentLocation.coordinates[1];
                this.longitude = driverCurrentLocation.coordinates[0];
                this.mapReady = true;
            }
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @action lookupAnother() {
        this.urlSearchParams.removeParamFromCurrentUrl('order');
        this.trackingNumber = null;
        this.order = null;
    }

    /* eslint-disable ember/no-private-routing-service */
    @action transitionToConsole() {
        const owner = getOwner(this);
        const router = owner.lookup('router:main');

        return router.transitionTo('console');
    }

    @action setupMap({ target }) {
        this.map = target;
        this.map.whenReady(() => {
            this.resetOrderRoute();
        });
    }

    @action startTrackingDriverPosition(event) {
        const { target } = event;
        const driver = this.order.driver_assigned;
        if (driver) {
            driver.set('_layer', target);
            this.movementTracker.track(driver);
        }
    }

    @action locateDriver() {
        const driver = this.order.driver_assigned;
        if (driver) {
            this.map.flyTo(driver.coordinates, 14, {
                maxZoom: 14,
                animate: true,
            });
        }
    }

    @action locateOrderRoute() {
        if (this.order) {
            const waypoints = this.getRouteCoordinatesFromOrder(this.order);
            this.map.flyToBounds(waypoints, {
                maxZoom: waypoints.length === 2 ? 12 : 11,
                animate: true,
            });
        }
    }

    @action displayOrderRoute() {
        const waypoints = this.getRouteCoordinatesFromOrder(this.order);
        const routingHost = getRoutingHost();
        if (this.cannotRouteWaypoints(waypoints)) {
            return;
        }

        // center on first coordinate
        try {
            this.map.stop();
            this.map.flyTo(waypoints.firstObject);
        } catch (error) {
            // unable to stop map
            debug(`Leaflet Map Error: ${error.message}`);
        }

        const router = new OSRMv1({
            serviceUrl: `${routingHost}/route/v1`,
            profile: 'driving',
        });

        this.routeControl = new RoutingControl({
            fitSelectedRoutes: false,
            router,
            waypoints,
            alternativeClassName: 'hidden',
            addWaypoints: false,
            markerOptions: {
                draggable: false,
                icon: L.icon({
                    iconUrl: '/assets/images/marker-icon.png',
                    iconRetinaUrl: '/assets/images/marker-icon-2x.png',
                    shadowUrl: '/assets/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                }),
            },
        }).addTo(this.map);

        this.routeControl.on('routingerror', (error) => {
            debug(`Routing Control Error: ${error.error.message}`);
        });

        this.routeControl.on('routesfound', (event) => {
            const { routes } = event;

            this.route = routes.firstObject;

            later(
                this,
                () => {
                    this.map.flyToBounds(waypoints, {
                        maxZoom: waypoints.length === 2 ? 12 : 11,
                        animate: true,
                    });
                },
                100
            );
        });
    }

    @action resetOrderRoute() {
        this.removeRouteControl();
        this.displayOrderRoute();
    }

    cannotRouteWaypoints(waypoints = []) {
        return !this.map || !isArray(waypoints) || waypoints.length < 2;
    }

    getRouteCoordinatesFromOrder(order) {
        const payload = order.payload;
        const waypoints = [];
        const coordinates = [];

        waypoints.pushObjects([payload.pickup, ...payload.waypoints.toArray(), payload.dropoff]);
        waypoints.forEach((place) => {
            if (place && place.get('longitude') && place.get('latitude')) {
                if (place.hasInvalidCoordinates) {
                    return;
                }

                coordinates.pushObject([place.get('latitude'), place.get('longitude')]);
            }
        });

        return coordinates;
    }

    removeRouteControl() {
        if (this.routeControl && this.routeControl instanceof RoutingControl) {
            this.routeControl.remove();
        }
    }
}
