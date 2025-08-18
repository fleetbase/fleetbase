import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, computed, get, setProperties } from '@ember/object';
import { inject as service } from '@ember/service';
import { isArray } from '@ember/array';
import { isBlank } from '@ember/utils';
import { later } from '@ember/runloop';
import { debug } from '@ember/debug';
import { task, timeout } from 'ember-concurrency';
import { OSRMv1, Control as RoutingControl } from '@fleetbase/leaflet-routing-machine';
import getRoutingHost from '@fleetbase/ember-core/utils/get-routing-host';
import engineService from '@fleetbase/ember-core/decorators/engine-service';
import registerHelper from '@fleetbase/ember-core/utils/register-helper';
import registerComponent from '@fleetbase/ember-core/utils/register-component';
import WaypointLabelHelper from '../../helpers/waypoint-label';
import CustomFieldComponent from '../../components/custom-field';
import isModel from '@fleetbase/ember-core/utils/is-model';
import isNotEmpty from '@fleetbase/ember-core/utils/is-not-empty';
import config from 'ember-get-config';

const MAP_TARGET_FOCUS_PADDING_BOTTOM_RIGHT = [200, 0];
const MAP_TARGET_FOCUS_REFOCUS_PANBY = [150, 0];
export default class CustomerCreateOrderFormComponent extends Component {
    @engineService('@fleetbase/fleetops-engine') contextPanel;
    @service store;
    @service currentUser;
    @service notifications;
    @service modalsManager;
    @service customerSession;
    @service customerPayment;
    @service urlSearchParams;
    @service fetch;
    @service intl;
    @service universe;
    @service analytics;
    @tracked order;
    @tracked customer;
    @tracked payload = this.store.createRecord('payload');
    @tracked payloadCoordinates = [];
    @tracked entities = [];
    @tracked waypoints = [];
    @tracked podOptions = ['scan', 'signature', 'photo'];
    @tracked serviceRates = [];
    @tracked serviceQuotes = [];
    @tracked selectedServiceRate;
    @tracked selectedServiceQuote;
    @tracked purchaseRate;
    @tracked scheduledDate;
    @tracked scheduledTime;
    @tracked isMultipleDropoffOrder = true;
    @tracked isViewingRoutePreview = false;
    @tracked routePreviewArray = [];
    @tracked map;
    @tracked latitude;
    @tracked longitude;
    @tracked leafletRoute;
    @tracked uploadQueue = [];
    @tracked orderConfigs = [];
    @tracked orderConfig;
    @tracked enabledOrderConfigs = [];
    @tracked customFieldGroups = [];
    @tracked customFields = [];
    @tracked customFieldValues = {};
    @tracked isCustomFieldsValid = true;
    @tracked paymentsEnabled = false;
    @tracked paymentsOnboardCompleted = false;
    @tracked acceptedFileTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/msword',
        'application/pdf',
        'application/x-pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/quicktime',
        'video/x-msvideo',
        'video/x-flv',
        'video/x-ms-wmv',
        'audio/mpeg',
        'video/x-msvideo',
        'application/zip',
        'application/x-tar',
    ];

    @computed('payloadCoordinates.length', 'waypoints.[]') get isServicable() {
        return this.payloadCoordinates.length >= 2;
    }

    @computed('routePreviewArray.[]') get routePreviewCoordinates() {
        return this.routePreviewArray.map((place) => place.get('latlng'));
    }

    constructor(owner, { order, latitude, longitude, map }) {
        super(...arguments);
        this.order = order;
        this.customer = this.order.customer || this.customerSession.getCustomer();
        this.map = map;
        this.latitude = latitude;
        this.longitude = longitude;
        this.customerPayment.loadAndInitialize();
        this.displayCompletingOrderDialog();
        this.load.perform();
        registerComponent(owner, CustomFieldComponent);
        registerHelper(owner, 'waypoint-label', WaypointLabelHelper);
    }

    @task *load() {
        yield this.loadCustomerOrderConfig.perform();
        yield this.checkForCheckoutSession.perform();
    }

    @task *loadCustomerOrderConfig() {
        try {
            this.orderConfigs = yield this.store.findAll('order-config');
        } catch (error) {
            this.notifications.serverError(error);
        }

        try {
            this.enabledOrderConfigs = yield this.fetch.get('fleet-ops/settings/customer-enabled-order-configs');
            this.orderConfigs = this.orderConfigs.filter((orderConfig) => this.enabledOrderConfigs.includes(orderConfig.id));
            if (this.orderConfigs) {
                this._setOrderConfig(this.orderConfigs[0].id);
            }
        } catch (error) {
            this.notifications.serverError(error);
        }

        if (!this.orderConfigs) {
            try {
                const defaultOrderConfig = yield this.fetch.get('orders/default-config', {}, { normalizeToEmberData: true, normalizeModelType: 'order-config' });
                if (defaultOrderConfig) {
                    this._setOrderConfig(defaultOrderConfig.id);
                }
            } catch (error) {
                this.notifications.serverError(error);
            }
        }

        try {
            const paymentsConfig = yield this.fetch.get('fleet-ops/settings/customer-payments-config');
            if (paymentsConfig) {
                this.paymentsEnabled = paymentsConfig.paymentsEnabled;
                this.paymentsOnboardCompleted = paymentsConfig.paymentsOnboardCompleted;
            }
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *createOrder() {
        // validate order inputs
        if (!this.isValid()) {
            return;
        }

        // valiadate custom field inputs
        for (let i = 0; i < this.customFields.length; i++) {
            const customField = this.customFields[i];
            if (customField.required) {
                const customFieldValue = this.customFieldValues[customField.id];
                if (!customFieldValue || isBlank(customFieldValue.value)) {
                    return this.notifications.error(this.intl.t('fleet-ops.operations.orders.index.new.input-field-required', { inputFieldName: customField.label }));
                }
            }
        }

        // Handle payments if enabled
        if (this.isPaymentRequired() && !this.purchaseRate) {
            return this.startCheckoutSession();
        }

        // create custom field values
        for (let customFieldId in this.customFieldValues) {
            const { value, value_type } = this.customFieldValues[customFieldId];
            const customFieldValue = this.store.createRecord('custom-field-value', {
                custom_field_uuid: customFieldId,
                value,
                value_type,
            });
            this.order.custom_field_values.push(customFieldValue);
        }

        this.removeRoutingControlPreview();

        const { order, payload, entities, waypoints } = this;
        const route = this.getRoute();

        // set purchase rate
        if (this.purchaseRate) {
            order.set('purchase_rate_uuid', this.purchaseRate.id);
        }

        // set service quote
        order.set('service_quote_uuid', this.selectedServiceQuote);

        // prepare order
        try {
            order.setPayload(payload).setRoute(route).get('payload').setWaypoints(waypoints).setEntities(entities);
        } catch (error) {
            return this.notifications.serverError(error);
        }

        // trigger universe event
        this.universe.trigger('fleet-ops.order.creating', order);

        try {
            yield order.save();

            // Track order creation in analytics
            if (this.analytics && this.analytics.isInitialized) {
                this.analytics.trackOrderCreation({
                    id: order.id,
                    uuid: order.uuid,
                    type: order.type,
                    status: order.status,
                    value: order.total,
                    pickup: order.pickup?.address,
                    dropoff: order.dropoff?.address,
                    items: order.payload?.entities?.length || 0,
                    waypoints_count: order.route?.waypoints?.length || 0,
                    customer_id: this.customer?.id,
                    customer_name: this.customer?.name
                });
            }

            // trigger event that fleet-ops created an order
            this.universe.trigger('fleet-ops.order.created', order);

            // transition to order view
            if (typeof this.args.onOrderCreated === 'function') {
                this.args.onOrderCreated(order);
            }
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *getQuotes() {
        if (this.loadCustomerOrderConfig.isRunning || this.urlSearchParams.has('checkout_session_id')) {
            return;
        }

        let payload = this.payload.serialize();
        let route = this.getRoute();
        let distance = get(route, 'details.summary.totalDistance');
        let time = get(route, 'details.summary.totalTime');
        let service_type = this.order.type;
        let scheduled_at = this.order.scheduled_at;
        let facilitator = this.order.facilitator?.get('public_id');
        let is_route_optimized = this.order.get('is_route_optimized');
        let { waypoints, entities } = this;
        let places = [];

        if (this.payloadCoordinates.length < 2) {
            return;
        }

        // get place instances from WaypointModel
        for (let i = 0; i < waypoints.length; i++) {
            let place = yield waypoints[i].place;

            places.pushObject(place);
        }

        setProperties(payload, { type: this.order.type, waypoints: places, entities });

        try {
            const serviceQuotes = yield this.fetch.post(
                'service-quotes/preliminary',
                {
                    payload: this._getSerializedPayload(payload),
                    distance,
                    time,
                    service,
                    service_type,
                    facilitator,
                    scheduled_at,
                    is_route_optimized,
                },
                { normalizeToEmberData: true, normalizeModelType: 'service-quote' }
            );

            this.serviceQuotes = isArray(serviceQuotes) ? serviceQuotes : [];
            if (this.serviceQuotes.length) {
                this.selectedServiceQuote = this.serviceQuotes.firstObject.id;
            }
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *loadCustomFields(orderConfig) {
        this.customFieldGroups = yield this.store.query('category', { owner_uuid: orderConfig.id, for: 'custom_field_group' });
        this.customFields = yield this.store.query('custom-field', { subject_uuid: orderConfig.id });
        this.groupCustomFields();
        this.checkIfCustomFieldsValid();
    }

    /**
     * Organizes custom fields into their respective groups.
     */
    groupCustomFields() {
        for (let i = 0; i < this.customFieldGroups.length; i++) {
            const group = this.customFieldGroups[i];
            group.set(
                'customFields',
                this.customFields.filter((customField) => {
                    if (this.customFieldValues[customField.id]) {
                        const { value, value_type } = this.customFieldValues[customField.id];
                        if (value_type === 'date') {
                            customField.value = new Date(value);
                        } else {
                            customField.value = value;
                        }
                    }

                    return customField.category_uuid === group.id;
                })
            );
        }
    }

    @action setCustomFieldValue(value, customField) {
        this.customFieldValues = {
            ...this.customFieldValues,
            [customField.id]: {
                value,
                value_type: this._getCustomFieldValueType(customField),
            },
        };
        this.checkIfCustomFieldsValid();
    }

    checkIfCustomFieldsValid() {
        this.isCustomFieldsValid = this.customFields.every((customField) => {
            if (!customField.required) {
                return true;
            }
            const customFieldValue = this.customFieldValues[customField.id];
            return customFieldValue && !isBlank(customFieldValue.value);
        });
    }

    _getCustomFieldValueType(customField) {
        if (customField.type === 'file-upload') {
            return 'file';
        }

        if (customField.type === 'date-time-input') {
            return 'date';
        }

        if (customField.type === 'model-select') {
            return 'model';
        }

        return 'text';
    }

    @action cancelOrderCreation() {
        if (typeof this.args.onCancel === 'function') {
            this.args.onCancel();
        }
    }

    @action setConfig(event) {
        const orderConfigId = event.target.value;
        if (!orderConfigId) {
            return;
        }

        this._setOrderConfig(orderConfigId);
    }

    _setOrderConfig(id) {
        const orderConfig = this.store.peekRecord('order-config', id);
        this.orderConfig = orderConfig;
        this.order.set('order_config_uuid', orderConfig.id);
        this.order.set('type', orderConfig.key);

        // load custom fields
        this.loadCustomFields.perform(orderConfig);
        this.getQuotes.perform();
    }

    @action async toggleProofOfDelivery(on) {
        this.order.pod_required = on;

        if (on) {
            this.order.pod_method = 'scan';
        } else {
            this.order.pod_method = null;
        }
    }

    @action toggleMultiDropOrder(isMultipleDropoffOrder) {
        this.isMultipleDropoffOrder = isMultipleDropoffOrder;

        const { pickup, dropoff } = this.payload;

        if (isMultipleDropoffOrder) {
            if (pickup) {
                this.addWaypoint({ place: pickup, customer: this.order.customer });

                if (dropoff) {
                    this.addWaypoint({ place: dropoff, customer: this.order.customer });
                }

                // clear pickup and dropoff
                this.payload.setProperties({ pickup: null, dropoff: null });
            } else {
                this.addWaypoint({ customer: this.order.customer });
            }
        } else {
            const pickup = get(this.waypoints, '0.place');
            const dropoff = get(this.waypoints, '1.place');

            if (pickup) {
                this.setPayloadPlace('pickup', pickup);
            }

            if (dropoff) {
                this.setPayloadPlace('dropoff', dropoff);
            }

            this.clearWaypoints();
        }
    }

    @action previewDraftOrderRoute(payload, waypoints = [], isMultipleDropoffOrder = false) {
        this.removeRoutingControlPreview();
        this.isViewingRoutePreview = true;
        this.routePreviewArray = this.createPlaceArrayFromPayload(payload, waypoints, isMultipleDropoffOrder);

        const canPreviewRoute = this.routePreviewArray.length > 0;
        if (!canPreviewRoute) {
            this.notifications.warning(this.intl.t('fleet-ops.operations.orders.index.new.no-route-warning'));
        }

        const routingHost = getRoutingHost(payload, waypoints);
        const router = new OSRMv1({
            serviceUrl: `${routingHost}/route/v1`,
            profile: 'driving',
        });

        this.previewRouteControl = new RoutingControl({
            router,
            waypoints: this.routePreviewCoordinates,
            alternativeClassName: 'hidden',
            addWaypoints: false,
            markerOptions: {
                icon: L.icon({
                    iconUrl: '/assets/images/marker-icon.png',
                    iconRetinaUrl: '/assets/images/marker-icon-2x.png',
                    shadowUrl: '/assets/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                }),
                draggable: false,
            },
        }).addTo(this.map);

        this.previewRouteControl.on('routingerror', (error) => {
            debug(`Routing Control Error: ${error.error.message}`);
        });

        this.previewRouteControl.on('routesfound', (event) => {
            const { routes } = event;
            const leafletRoute = routes.firstObject;
            this.currentLeafletRoute = event;
            this.leafletRoute = leafletRoute;
        });

        if (this.routePreviewCoordinates.length === 1) {
            this.map.flyTo(this.routePreviewCoordinates[0], 18);
            this.map.once('moveend', () => {
                this.map.panBy(MAP_TARGET_FOCUS_REFOCUS_PANBY);
            });
        } else {
            this.map.flyToBounds(this.routePreviewCoordinates, {
                paddingBottomRight: MAP_TARGET_FOCUS_PADDING_BOTTOM_RIGHT,
                maxZoom: this.routePreviewCoordinates.length === 2 ? 13 : 12,
                animate: true,
            });
            this.map.once('moveend', () => {
                this.map.panBy(MAP_TARGET_FOCUS_REFOCUS_PANBY);
            });
        }
    }

    @action removeRoutingControlPreview() {
        if (this.previewRouteControl && this.previewRouteControl instanceof RoutingControl) {
            this.previewRouteControl.remove();
        }
    }

    @action createPlaceArrayFromPayload(payload, waypoints, isMultipleDropoffOrder = false) {
        const routePreviewArray = [];

        if (isMultipleDropoffOrder) {
            for (let i = 0; i < waypoints.length; i++) {
                if (waypoints[i].place) {
                    routePreviewArray.pushObject(waypoints[i].place);
                }
            }
        } else {
            if (payload.pickup) {
                routePreviewArray.pushObject(payload.pickup);
            }

            if (payload.dropoff) {
                routePreviewArray.pushObject(payload.dropoff);
            }
        }

        return routePreviewArray;
    }

    @action createPlace() {
        const place = this.store.createRecord('place', {
            owner_uuid: this.customer.id,
            owner_type: 'fleet-ops:contact',
        });
        this.modalsManager.show('modals/place-form', {
            title: 'New Place',
            place,
        });
    }

    @action editPlace(place) {
        this.modalsManager.show('modals/place-form', {
            title: 'Edit Place',
            place,
        });
    }

    @action setPayloadPlace(prop, place) {
        this.payload[prop] = place;

        this.updatePayloadCoordinates();
        this.previewDraftOrderRoute(this.payload, this.waypoints, this.isMultipleDropoffOrder);
        this.getQuotes.perform();
    }

    @action sortWaypoints({ sourceList, sourceIndex, targetList, targetIndex }) {
        if (sourceList === targetList && sourceIndex === targetIndex) {
            return;
        }

        const item = sourceList.objectAt(sourceIndex);

        sourceList.removeAt(sourceIndex);
        targetList.insertAt(targetIndex, item);

        if (this.isViewingRoutePreview) {
            this.previewDraftOrderRoute(this.payload, this.waypoints, this.isMultipleDropoffOrder);
        }
    }

    @action addWaypoint(properties = {}) {
        if (this.order.customer) {
            properties.customer = this.order.customer;
        }

        const waypoint = this.store.createRecord('waypoint', properties);
        this.waypoints.pushObject(waypoint);
        this.updatePayloadCoordinates();
        this.getQuotes.perform();

        return waypoint;
    }

    @action setWaypointPlace(index, place) {
        if (!this.waypoints[index]) {
            return;
        }

        // Set owner of place to current customer
        if (this.customer) {
            place.setProperties({
                owner_uuid: this.customer.id,
                owner_type: 'fleet-ops:contact',
            });
        }

        this.waypoints[index].place = place;

        if (this.waypoints.length) {
            this.previewDraftOrderRoute(this.payload, this.waypoints, this.isMultipleDropoffOrder);
        }

        this.getQuotes.perform();
        this.updatePayloadCoordinates();
    }

    @action removeWaypoint(waypoint) {
        if (this.isMultipleDropoffOrder && this.waypoints.length === 1) {
            return;
        }

        this.waypoints.removeObject(waypoint);

        this.previewDraftOrderRoute(this.payload, this.waypoints, this.isMultipleDropoffOrder);
        this.updatePayloadCoordinates();
    }

    @action clearWaypoints() {
        this.waypoints.clear();

        if (this.isViewingRoutePreview) {
            this.previewRoute(false);
        }
    }

    @action addEntity(importId = null) {
        const entity = this.store.createRecord('entity', {
            _import_id: typeof importId === 'string' ? importId : null,
        });

        this.entities.pushObject(entity);
        this.getQuotes.perform();
    }

    @action removeEntity(entity) {
        if (this.entities.length === 1) {
            return;
        }

        if (!entity.get('isNew')) {
            return entity.destroyRecord();
        }

        this.entities.removeObject(entity);
        this.getQuotes.perform();
    }

    @action setEntityDestionation(index, { target }) {
        const { value } = target;

        this.entities[index].destination_uuid = value;
    }

    @action editEntity(entity) {
        this.modalsManager.show('modals/entity-form', {
            title: this.intl.t('fleet-ops.operations.orders.index.new.edit-item'),
            acceptButtonText: this.intl.t('common.save-changes'),
            entity,
            uploadNewPhoto: (file) => {
                const fileUrl = URL.createObjectURL(file.file);

                if (entity.get('isNew')) {
                    const { queue } = file;

                    this.modalsManager.setOption('pendingFileUpload', file);
                    entity.set('photo_url', fileUrl);
                    queue.remove(file);
                    return;
                } else {
                    entity.set('photo_url', fileUrl);
                }

                // Indicate loading
                this.modalsManager.startLoading();

                // Perform upload
                return this.fetch.uploadFile.perform(
                    file,
                    {
                        path: `uploads/${this.currentUser.companyId}/entities/${entity.id}`,
                        subject_uuid: entity.id,
                        subject_type: 'fleet-ops:entity',
                        type: 'entity_photo',
                    },
                    (uploadedFile) => {
                        entity.setProperties({
                            photo_uuid: uploadedFile.id,
                            photo_url: uploadedFile.url,
                            photo: uploadedFile,
                        });

                        // Stop loading
                        this.modalsManager.stopLoading();
                    },
                    () => {
                        // Stop loading
                        this.modalsManager.stopLoading();
                    }
                );
            },
            confirm: async (modal) => {
                modal.startLoading();

                const pendingFileUpload = modal.getOption('pendingFileUpload');
                return entity.save().then(() => {
                    if (pendingFileUpload) {
                        return modal.invoke('uploadNewPhoto', pendingFileUpload);
                    }
                });
            },
        });
    }

    @action getRoute() {
        const details = this.leafletRoute;
        const route = this.store.createRecord('route', { details });

        return route;
    }

    @task *queueFile(file) {
        // since we have dropzone and upload button within dropzone validate the file state first
        // as this method can be called twice from both functions
        if (['queued', 'failed', 'timed_out', 'aborted'].indexOf(file.state) === -1) {
            return;
        }

        // Queue and upload immediatley
        this.uploadQueue.pushObject(file);
        yield this.fetch.uploadFile.perform(
            file,
            {
                path: 'uploads/fleet-ops/order-files',
                type: 'order_file',
            },
            (uploadedFile) => {
                this.order.files.pushObject(uploadedFile);
                this.uploadQueue.removeObject(file);
            },
            () => {
                this.uploadQueue.removeObject(file);
                // remove file from queue
                if (file.queue && typeof file.queue.remove === 'function') {
                    file.queue.remove(file);
                }
            }
        );
    }

    @action removeFile(file) {
        return file.destroyRecord();
    }

    isValid() {
        const isMultipleDropoffOrder = this.isMultipleDropoffOrder;
        const isFetchingQuotes = this.getQuotes.isRunning;
        const isOrderTypeSet = isNotEmpty(this.order.type);
        const isWaypointsSet = this.waypoints.length > 1;
        const isPickupSet = isNotEmpty(this.payload.pickup);
        const isDropoffSet = isNotEmpty(this.payload.dropoff);
        // const isPayloadSet = this.entities.length > 0;

        if (isFetchingQuotes) {
            return false;
        }

        if (isMultipleDropoffOrder) {
            return isOrderTypeSet && isWaypointsSet;
        }

        return isOrderTypeSet && isPickupSet && isDropoffSet && this.isCustomFieldsValid;
    }

    updatePayloadCoordinates() {
        let waypoints = [];
        let coordinates = [];

        waypoints.pushObjects([this.payload.pickup, ...this.waypoints.map((waypoint) => waypoint.place), this.payload.dropoff]);
        waypoints.forEach((place) => {
            if (place && place.get('longitude') && place.get('latitude')) {
                if (place.hasInvalidCoordinates) {
                    return;
                }

                coordinates.pushObject([place.get('longitude'), place.get('latitude')]);
            }
        });

        this.payloadCoordinates = coordinates;
    }

    _getSerializedPayload(payload) {
        const serialized = {
            pickup: this._seriailizeModel(payload.pickup),
            dropoff: this._seriailizeModel(payload.dropoff),
            entities: this._serializeArray(payload.entities),
            waypoints: this._serializeArray(payload.waypoints),
        };

        return serialized;
    }

    _seriailizeModel(model) {
        if (isModel(model)) {
            if (typeof model.toJSON === 'function') {
                return model.toJSON();
            }

            if (typeof model.serialize === 'function') {
                return model.serialize();
            }
        }

        return model;
    }

    _serializeArray(array) {
        return isArray(array) ? array.map((item) => this._seriailizeModel(item)) : array;
    }

    isPaymentRequired() {
        const hasServiceQuote = !isBlank(this.selectedServiceQuote);
        const stripeConfigured = typeof config.stripe.publishableKey === 'string' && this.customerPayment.loaded === true;
        const paymentsEnabled = this.paymentsEnabled === true;
        const paymentsOnboardCompleted = this.paymentsOnboardCompleted === true;

        return hasServiceQuote && stripeConfigured && paymentsEnabled && paymentsOnboardCompleted;
    }

    async fetchClientSecret() {
        try {
            const { clientSecret } = await this.fetch.post('service-quotes/stripe-checkout-session', { service_quote: this.selectedServiceQuote, uri: window.location.pathname });

            return clientSecret;
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    async startCheckoutSession() {
        const checkout = await this.customerPayment.initEmbeddedCheckout({
            fetchClientSecret: this.fetchClientSecret.bind(this),
        });

        const serviceQuote = this.store.peekRecord('service-quote', this.selectedServiceQuote);
        if (!serviceQuote) {
            return;
        }

        // save order state to restore afterwards
        this.saveCurrentOrderForCurrentServiceQuote(serviceQuote);

        await this.modalsManager.done();
        later(
            this,
            () => {
                this.modalsManager.show('modals/service-quote-purchase-form', {
                    title: `Complete Payment for ${this.orderConfig.name} Service`,
                    modalClass: 'service-quote-extension-purchase',
                    modalFooterClass: 'hidden-i',
                    serviceQuote,
                    checkoutElementInserted: (el) => {
                        checkout.mount(el);
                    },
                    decline: async (modal) => {
                        checkout.destroy();
                        await modal.done();
                    },
                });
            },
            100
        );
    }

    async displayCompletingOrderDialog() {
        later(
            this,
            async () => {
                await this.modalsManager.done();
                if (this.urlSearchParams.has('checkout_session_id') && this.urlSearchParams.has('service_quote')) {
                    this.modalsManager.show('modals/confirm-service-quote-purchase', {
                        title: 'Finalizing Purchase',
                        modalClass: 'finalize-service-quote-purchase',
                        loadingMessage: 'Completing purchase do not refresh or exit window...',
                        modalFooterClass: 'hidden-i',
                        backdropClose: false,
                    });
                }
            },
            300
        );
    }

    @task *checkForCheckoutSession() {
        if (!this.urlSearchParams.has('checkout_session_id') || !this.urlSearchParams.has('service_quote')) {
            return;
        }

        const checkoutSessionId = this.urlSearchParams.get('checkout_session_id');
        const serviceQuoteId = this.urlSearchParams.get('service_quote');

        // Restore from service quote id
        yield this.restoreFromServiceQuote(serviceQuoteId);
        if (this.selectedServiceQuote !== serviceQuoteId) {
            this.notifications.error('Something went wrong trying to complete purchase.');
            return;
        }

        if (checkoutSessionId && this.selectedServiceQuote === serviceQuoteId) {
            // give time for page to prepate
            yield timeout(300);

            try {
                const { status, purchaseRate } = yield this.fetch.get('service-quotes/stripe-checkout-session', {
                    checkout_session_id: checkoutSessionId,
                    service_quote: this.selectedServiceQuote,
                });

                // Set purchased rate to order
                const purchaseRateModel = this.fetch.jsonToModel(purchaseRate, 'purchase-rate');
                if (isModel(purchaseRateModel)) {
                    this.purchaseRate = purchaseRateModel;
                }

                if (status === 'complete' || status === 'purchase_complete') {
                    // remove checkout session id
                    this.urlSearchParams.removeParamFromCurrentUrl('checkout_session_id');

                    // finish creating order
                    yield this.createOrder.perform();

                    // remove the saved orser state
                    this.currentUser.setOption(`order:state:${serviceQuoteId}`, undefined);

                    // close confirmation dialog and notify payment completed
                    yield this.modalsManager.done();
                }
            } catch (error) {
                this.notifications.serverError(error);
            }
        }
    }

    async restoreFromServiceQuote(serviceQuoteId) {
        const serviceQuote = await this.store.findRecord('service-quote', serviceQuoteId);
        if (!serviceQuote) {
            throw new Error('Unable to restore order from service quote.');
        }

        this.serviceQuotes = [serviceQuote];
        this.selectedServiceQuote = serviceQuote.id;

        // Get service quote order state
        const orderState = this.currentUser.getOption(`order:state:${serviceQuote.id}`);
        if (orderState) {
            // restore custom field values
            if (orderState.customFieldValues) {
                this.customFieldValues = orderState.customFieldValues;
            }

            // restore order config selected
            const orderConfigId = orderState.order_config_uuid;
            if (orderConfigId) {
                const orderConfigIsLoaded = this.store.peekRecord('order-config', orderConfigId);
                if (!orderConfigIsLoaded) {
                    await this.store.findRecord('order-config', orderConfigId);
                }
                this._setOrderConfig(orderConfigId);
            }

            // restore order selection state
            this.order.setProperties({
                pod_required: orderState.pod_required,
                pod_method: orderState.pod_method,
                notes: orderState.notes,
            });

            // restore entities from state
            const entities = get(orderState, 'payload.entities');
            if (isArray(entities) && entities.length) {
                entities.forEach((entityJson) => {
                    const entityModel = entityJson.uuid ? this.fetch.jsonToModel(entityJson, 'entity') : this.store.createRecord('entity', entityJson);
                    this.entities.pushObject(entityModel);
                });
            }

            // restore files if any
            if (isArray(orderState.files)) {
                for (let i = 0; i < orderState.files.length; i++) {
                    const fileId = orderState.files[i];
                    const file = await this.store.findRecord('file', fileId);
                    if (file) {
                        this.order.files.pushObject(file);
                    }
                }
            }
        }

        const pickup = serviceQuote.get('meta.preliminary_query.payload.pickup');
        const dropoff = serviceQuote.get('meta.preliminary_query.payload.dropoff');
        const returnPlace = serviceQuote.get('meta.preliminary_query.payload.return');
        const waypoints = serviceQuote.get('meta.preliminary_query.payload.waypoints') ?? [];
        const isMultipleDropoffOrder = !pickup && !dropoff && !isBlank(waypoints);

        // set multidrop flag
        this.isMultipleDropoffOrder = isMultipleDropoffOrder;

        if (pickup) {
            const pickupModel = this.fetch.jsonToModel(pickup, 'place');
            this.setPayloadPlace('pickup', pickupModel);
        }

        if (dropoff) {
            const dropoffModel = this.fetch.jsonToModel(dropoff, 'place');
            this.setPayloadPlace('dropoff', dropoffModel);
        }

        if (returnPlace) {
            const returnModel = this.fetch.jsonToModel(returnPlace, 'place');
            this.setPayloadPlace('return', returnModel);
        }

        if (isArray(waypoints) && waypoints.length) {
            waypoints.forEach((waypointPlace) => {
                const waypointPlaceModel = this.fetch.jsonToModel(waypointPlace, 'place');
                this.addWaypoint({ place: waypointPlaceModel, customer: this.customer });
            });
        }
    }

    saveCurrentOrderForCurrentServiceQuote(serviceQuote) {
        const payload = this.payload.serialize();
        setProperties(payload, {
            type: this.order.type,
            waypoints: this.waypoints.map((waypoint) => waypoint.place),
            entities: this.entities,
        });

        const state = {
            serviceQuote: serviceQuote.id,
            order_config_uuid: this.orderConfig.id,
            type: this.orderConfig.key,
            pod_required: this.order.pod_required,
            pod_method: this.order.pod_method,
            payload: this._getSerializedPayload(payload),
            notes: this.order.notes,
            files: this.order.files.map((file) => file.id),
            customFieldValues: this.customFieldValues,
        };

        this.currentUser.setOption(`order:state:${serviceQuote.id}`, state);
    }
}
