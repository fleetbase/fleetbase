import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isArray } from '@ember/array';
import { later } from '@ember/runloop';
import { debug } from '@ember/debug';
import { task, timeout } from 'ember-concurrency';
import { OSRMv1, Control as RoutingControl } from '@fleetbase/leaflet-routing-machine';
import getRoutingHost from '@fleetbase/ember-core/utils/get-routing-host';
import engineService from '@fleetbase/ember-core/decorators/engine-service';
import registerComponent from '@fleetbase/ember-core/utils/register-component';
import OrderProgressCardComponent from '../order-progress-card';
import DisplayPlaceComponent from '../display-place';
import CustomerCreateOrderFormComponent from './create-order-form';

const MAP_TARGET_FOCUS_PADDING_BOTTOM_RIGHT = [200, 0];
const MAP_TARGET_FOCUS_REFOCUS_PANBY = [150, 0];
export default class CustomerOrdersComponent extends Component {
    @service store;
    @service fetch;
    @service notifications;
    @service currentUser;
    @service universe;
    @service urlSearchParams;
    @service modalsManager;
    @service customerSession;
    @service hostRouter;
    @engineService('@fleetbase/fleetops-engine') movementTracker;
    @engineService('@fleetbase/fleetops-engine') location;
    @tracked orders = [];
    @tracked selectedOrder;
    @tracked newOrder;
    @tracked zoom = 12;
    @tracked map;
    @tracked mapReady = false;
    @tracked latitude;
    @tracked longitude;
    @tracked route;
    @tracked query;
    @tracked tileSourceUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';

    constructor(owner) {
        super(...arguments);
        registerComponent(owner, OrderProgressCardComponent, { as: 'order-progress-card' });
        registerComponent(owner, DisplayPlaceComponent, { as: 'display-place' });
        registerComponent(owner, CustomerCreateOrderFormComponent, { as: 'customer/create-order-form' });
        this.loadCustomerOrders.perform();
        later(
            this,
            () => {
                this.restoreOrderCreation();
            },
            100
        );
    }

    @task *loadCustomerOrders(params = {}) {
        const query = this.urlSearchParams.get('query');
        this.query = query;

        try {
            this.orders = yield this.store.query('order', { customer: this.customerSession.get('id'), ...params, query });
            this.orders = this.orders.toArray().filter((_) => !_.isNew);
            this.restoreSelectedOrder();
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *searchOrders({ target }) {
        const query = target.value;
        this.urlSearchParams.addParamToCurrentUrl('query', query);
        this.unselectOrder();

        yield timeout(300);

        try {
            this.orders = yield this.store.query('order', { query, with_tracker_data: true });
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @action async startOrderCreation() {
        this.unselectOrder();
        this.newOrder = this.store.createRecord('order', {
            type: 'transport',
            customer_uuid: this.customerSession.get('id'),
            customer_type: 'fleet-ops:contact',
            customer: this.customerSession.getCustomer(),
            meta: [],
        });
        this.urlSearchParams.addParamToCurrentUrl('creating', 1);
        const { latitude, longitude } = await this.location.getUserLocation();
        if (latitude && longitude) {
            this.latitude = latitude;
            this.longitude = longitude;
            this.mapReady = true;
        }
    }

    @action cancelOrderCreation() {
        if (this.newOrder && typeof this.newOrder.destroyRecord === 'function') {
            this.newOrder.destroyRecord();
        }
        this.newOrder = undefined;
        this.urlSearchParams.removeParamFromCurrentUrl('creating');
    }

    @action onOrderCreated(order) {
        this.newOrder = undefined;
        this.urlSearchParams.removeParamFromCurrentUrl('creating');
        this.orders.unshiftObject(order);
        later(
            this,
            () => {
                this.viewOrder(order);
                this.hostRouter.refresh();
            },
            100
        );
    }

    @action viewOrder(order, options = { resetOrderRoute: false }) {
        this.selectedOrder = order;
        // start loading order tracking activity
        order.loadTrackingActivity();
        this.urlSearchParams.addParamToCurrentUrl('order', order.public_id);
        const driverCurrentLocation = order.get('tracker_data.driver_current_location');
        if (driverCurrentLocation) {
            this.latitude = driverCurrentLocation.coordinates[1];
            this.longitude = driverCurrentLocation.coordinates[0];
            this.mapReady = true;

            if (options && options.resetOrderRoute === true && this.map) {
                this.map.whenReady(() => {
                    this.resetOrderRoute();
                });
            }
        }
    }

    @action async viewOrderLabel() {
        const order = this.selectedOrder;
        if (!order) {
            return;
        }

        // render dialog to display label within
        this.modalsManager.show(`modals/order-label`, {
            title: 'Order Label',
            modalClass: 'modal-xl',
            acceptButtonText: 'Done',
            hideDeclineButton: true,
            order,
        });

        try {
            // load the pdf label from base64
            // eslint-disable-next-line no-undef
            const fileReader = new FileReader();
            const { data } = await this.fetch.get(`orders/label/${order.public_id}?format=base64`);
            // eslint-disable-next-line no-undef
            const base64 = await fetch(`data:application/pdf;base64,${data}`);
            const blob = await base64.blob();
            // load into file reader
            fileReader.onload = (event) => {
                const data = event.target.result;
                this.modalsManager.setOption('data', data);
            };
            fileReader.readAsDataURL(blob);
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @action async viewWaypointLabel(waypoint) {
        // render dialog to display label within
        this.modalsManager.show(`modals/order-label`, {
            title: 'Waypoint Label',
            modalClass: 'modal-xl',
            acceptButtonText: 'Done',
            hideDeclineButton: true,
        });

        try {
            // load the pdf label from base64
            // eslint-disable-next-line no-undef
            const fileReader = new FileReader();
            const { data } = await this.fetch.get(`orders/label/${waypoint.waypoint_public_id}?format=base64`);
            // eslint-disable-next-line no-undef
            const base64 = await fetch(`data:application/pdf;base64,${data}`);
            const blob = await base64.blob();
            // load into file reader
            fileReader.onload = (event) => {
                const data = event.target.result;
                this.modalsManager.setOption('data', data);
            };
            fileReader.readAsDataURL(blob);
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @action unselectOrder() {
        this.selectedOrder = null;
        this.removeRouteControl();
        this.urlSearchParams.removeParamFromCurrentUrl('order');
    }

    @action onTrackerDataLoaded(order) {
        if (this.selectedOrder && this.selectedOrder.id === order.id) {
            this.viewOrder(order, { resetOrderRoute: true });
        }
    }

    @action setupMap({ target }) {
        this.map = target;
        if (!this.isCreatingOrder()) {
            this.map.whenReady(() => {
                this.resetOrderRoute();
            });
        }
    }

    @action displayOrderRoute() {
        const waypoints = this.getRouteCoordinatesFromOrder(this.selectedOrder);
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
                        paddingBottomRight: MAP_TARGET_FOCUS_PADDING_BOTTOM_RIGHT,
                        maxZoom: waypoints.length === 2 ? 13 : 12,
                        animate: true,
                    });
                    this.map.once('moveend', () => {
                        this.map.panBy(MAP_TARGET_FOCUS_REFOCUS_PANBY);
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

    @action startTrackingDriverPosition(event) {
        const { target } = event;
        const driver = this.selectedOrder.driver;
        if (driver) {
            driver.set('_layer', target);
            this.movementTracker.track(driver);
        }
    }

    @action locateDriver() {
        const driver = this.selectedOrder.driver;
        if (driver) {
            this.map.flyTo(driver.coordinates, 14, {
                paddingBottomRight: MAP_TARGET_FOCUS_PADDING_BOTTOM_RIGHT,
                maxZoom: 14,
                animate: true,
            });
            this.map.once('moveend', () => {
                this.map.panBy(MAP_TARGET_FOCUS_REFOCUS_PANBY);
            });
        }
    }

    @action locateOrderRoute() {
        if (this.selectedOrder) {
            const waypoints = this.getRouteCoordinatesFromOrder(this.selectedOrder);
            this.map.flyToBounds(waypoints, {
                paddingBottomRight: MAP_TARGET_FOCUS_PADDING_BOTTOM_RIGHT,
                maxZoom: waypoints.length === 2 ? 13 : 12,
                animate: true,
            });
            this.map.once('moveend', () => {
                this.map.panBy(MAP_TARGET_FOCUS_REFOCUS_PANBY);
            });
        }
    }

    isCreatingOrder() {
        const isCreating = this.urlSearchParams.get('creating');
        return isCreating === '1' || isCreating === 1;
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

    restoreSelectedOrder() {
        const selectedOrderId = this.urlSearchParams.get('order');
        if (selectedOrderId) {
            const selectedOrder = this.orders.find((order) => order.public_id === selectedOrderId);
            if (selectedOrder) {
                this.viewOrder(selectedOrder);
            }
        }
    }

    restoreOrderCreation() {
        if (this.isCreatingOrder()) {
            this.startOrderCreation();
        }
    }
}
