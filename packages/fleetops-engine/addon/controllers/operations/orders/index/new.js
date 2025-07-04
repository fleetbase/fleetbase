import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { inject as controller } from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action, computed, setProperties, set, get } from '@ember/object';
import { not, equal, alias } from '@ember/object/computed';
import { isArray } from '@ember/array';
import { isBlank } from '@ember/utils';
import { dasherize } from '@ember/string';
import { later, next } from '@ember/runloop';
import { task } from 'ember-concurrency-decorators';
import { OSRMv1, Control as RoutingControl } from '@fleetbase/leaflet-routing-machine';
import polyline from '@fleetbase/ember-core/utils/polyline';
import findClosestWaypoint from '@fleetbase/ember-core/utils/find-closest-waypoint';
import isNotEmpty from '@fleetbase/ember-core/utils/is-not-empty';
import getRoutingHost from '@fleetbase/ember-core/utils/get-routing-host';
import getWithDefault from '@fleetbase/ember-core/utils/get-with-default';
import isModel from '@fleetbase/ember-core/utils/is-model';
import ENV from '@fleetbase/console/config/environment';

L.Bounds.prototype.intersects = function (bounds) {
    var min = this.min,
        max = this.max,
        min2 = bounds.min,
        max2 = bounds.max,
        xIntersects = max2.x >= min.x && min2.x <= max.x,
        yIntersects = max2.y >= min.y && min2.y <= max.y;

    return xIntersects && yIntersects;
};

export default class OperationsOrdersIndexNewController extends BaseController {
    @controller('operations.orders.index') ordersController;

    /**
     * Inject the `modalsManager` service
     *
     * @var {Service}
     */
    @service modalsManager;

    /**
     * Inject the `notifications` service
     *
     * @var {Service}
     */
    @service notifications;

    /**
     * Inject the `loader` service
     *
     * @var {Service}
     */
    @service loader;

    /**
     * Inject the `currentUser` service
     *
     * @var {Service}
     */
    @service currentUser;

    /**
     * Inject the `hostRouter` service
     *
     * @var {Service}
     */
    @service hostRouter;

    /**
     * Inject the `fileQueue` service
     *
     * @var {Service}
     */
    @service fileQueue;

    /**
     * Inject the `intl` service
     *
     * @var {Service}
     */
    @service intl;

    /**
     * Inject the `fetch` service
     *
     * @var {Service}
     */
    @service fetch;

    /**
     * Inject the `store` service
     *
     * @var {Service}
     */
    @service store;

    /**
     * Inject the `contextPanel` service
     *
     * @var {Service}
     */
    @service contextPanel;

    /**
     * Inject the `universe` service
     *
     * @var {Service}
     */
    @service universe;

    /**
     * Create an OrderModel instance.
     *
     * @var {OrderModel}
     */
    @tracked order = this.store.createRecord('order', { meta: [] });

    /**
     * Create an PayloadModel instance.
     *
     * @var {OrderModel}
     */
    @tracked payload = this.store.createRecord('payload');
    @tracked driversQuery = {};
    @tracked vehiclesQuery = {};
    @tracked meta = [];
    @tracked entities = [];
    @tracked waypoints = [];
    @tracked payloadCoordinates = [];
    @tracked orderConfig;
    @tracked orderConfigs = [];
    @tracked customFieldGroups = [];
    @tracked customFields = [];
    @tracked customFieldValues = {};
    @tracked serviceRates = [];
    @tracked selectedServiceRate;
    @tracked selectedServiceQuote;
    @tracked isCustomFieldsValid = true;
    @tracked isCreatingOrder = false;
    @tracked isMultipleDropoffOrder = true;
    @tracked isViewingRoutePreview = false;
    @tracked isOptimizingRoute = false;
    @tracked optimizedRouteMarkers = [];
    @tracked optimizedRoutePolyline;
    @tracked isFetchingQuotes = false;
    @tracked servicable = false;
    @tracked scheduledDate;
    @tracked estimatedEndaDate;
    @tracked scheduledTime;
    @tracked estimatedEndDateTime;
    @tracked leafletRoute;
    @tracked leafletOptimizedRoute;
    @tracked currentLeafletRoute;
    @tracked leafletLayers = [];
    @tracked routeProfile = 'driving';
    @tracked routeProfileOptions = ['driving', 'bycicle', 'walking'];
    @tracked podOptions = ['scan', 'signature', 'photo'];
    @tracked isCsvImportedOrder = false;
    @tracked routePreviewArray = [];
    @tracked previewRouteControl;
    @tracked isSubscriptionValid = true;
    @tracked isUsingIntegratedVendor = false;
    @tracked integratedVendorServiceType;
    @tracked invalidReason;
    @tracked lastErrorMessage = null;
    @tracked metadataButtons = [
        {
            type: 'default',
            text: this.intl.t('fleet-ops.operations.orders.index.new.edit-metadata'),
            icon: 'edit',
            onClick: this.editMetaData,
        },
    ];
    @tracked uploadQueue = [];
    acceptedFileTypes = [
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

    get renderableComponents() {
        const renderableComponents = this.universe.getRenderableComponentsFromRegistry('fleet-ops:template:operations:orders:new');
        return renderableComponents;
    }

    get renderableEntityInputComponents() {
        const renderableComponents = this.universe.getRenderableComponentsFromRegistry('fleet-ops:template:operations:orders:new:entities-input');
        return renderableComponents;
    }

    @not('isServicable') isNotServicable;
    @alias('currentUser.latitude') userLatitude;
    @alias('currentUser.longitude') userLongitude;
    @alias('ordersController.leafletMap') leafletMap;
    @equal('isCsvImportedOrder', false) isNotCsvImportedOrder;

    constructor() {
        super(...arguments); // Always call the parent class constructor first
        // Initialize waypoints with a default value
       // this.waypoints = [{ place: 'Default Place' }];   

        // If needed, you can load waypoints from the store
        this.loadWaypoints();
    }

    async loadWaypoints() {
        // Start with one default empty waypoint
        const defaultWaypoint = this.store.createRecord('waypoint', {
            place: null,  // Will show the empty dropdown
            customer: this.order ? this.order.customer : null
        });
        
        this.set('waypoints', [defaultWaypoint]);
    }

    @computed('isCustomFieldsValid', 'entities.length', 'isMultipleDropoffOrder', 'isFetchingQuotes', 'isSubscriptionValid', 'payload.{dropoff,pickup}', 'waypoints.length')
    get isValid() {
        const { isMultipleDropoffOrder, isSubscriptionValid, isFetchingQuotes } = this;
        // const isOrderTypeSet = isNotEmpty(this.order?.type);
        const isWaypointsSet = this.waypoints?.length > 1;
        const isPickupSet = isNotEmpty(this.payload?.pickup);
        const isDropoffSet = isNotEmpty(this.payload?.dropoff);
        // const isPayloadSet = this.entities?.length > 0;
        if (isFetchingQuotes) {
            return false;
        }

        if (!isSubscriptionValid) {
            return false;
        }

        if (isMultipleDropoffOrder) {
            if (!this.waypoints || this.waypoints.length < 2) {
                return false;
            }
            return isWaypointsSet;
        }

        return isPickupSet && isDropoffSet && this.isCustomFieldsValid;
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

    @computed('payloadCoordinates.length', 'waypoints.[]') get isServicable() {
        return this.payloadCoordinates.length >= 2;
    }

    @computed('routePreviewArray.[]') get routePreviewCoordinates() {
        // return this.routePreviewArray.filter((place) => place.get('hasValidCoordinates')).map((place) => place.get('latlng'));
        return (
            this.routePreviewArray
                // .filter((place) => place.get('hasValidCoordinates'))
                .map((place) => place.get('latlng'))
        );
    }

    @computed('entities.[]', 'waypoints.[]') get entitiesByImportId() {
        const groups = [];

        // create groups
        this.waypoints.forEach((waypoint) => {
            const importId = waypoint.place._import_id ?? null;

            if (importId) {
                const entities = this.entities.filter((entity) => entity._import_id === importId);
                const group = {
                    importId,
                    waypoint,
                    entities,
                };

                groups.pushObject(group);
            }
        });

        return groups;
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
    @action createOrder() {
        const WAYPOINTS_ERROR = this.intl.t('common.valid-waypoints-error');
        if (!this.order.scheduled_at || !this.order.estimated_end_date) {
            let missingFields = [];
            if (!this.order.scheduled_at) missingFields.push("Start Date");
            if (!this.order.estimated_end_date) missingFields.push("End Date");
        
            this.errorMessage = `${missingFields.join(" and ")} ${missingFields.length > 1 ? "are" : "is"} required.`;
            this.showErrorOnce(this.errorMessage);
            return;
        }
        if (new Date(this.order.estimated_end_date) < new Date(this.order.scheduled_at)) {
            this.errorMessage = "End Date cannot be earlier than the start date.";
            this.showErrorOnce(this.errorMessage);
            return;
        }
        if (this.isMultipleDropoffOrder) {
            // Check if we have at least 2 waypoints
            if (!this.waypoints || this.waypoints.length < 2) {
                this.showErrorOnce(WAYPOINTS_ERROR);
                return;
            }
             // Validate that all non-empty waypoints are valid
            const hasInvalidWaypoint = this.waypoints.some(waypoint => 
                !waypoint.place || 
                !waypoint.place.latitude || 
                !waypoint.place.longitude || 
                waypoint.place.hasInvalidCoordinates
            );
            
            if (hasInvalidWaypoint) {
                this.showErrorOnce(WAYPOINTS_ERROR);
                return;
            }
            // Check for consecutive duplicate waypoints
            let hasConsecutiveDuplicates = false;
    
            for (let i = 1; i < this.waypoints.length; i++) {
                const currentWaypoint = this.waypoints[i];
                const previousWaypoint = this.waypoints[i-1];
                
                // Check if current and previous have the same public_id
                if (currentWaypoint.place && 
                    previousWaypoint.place && 
                    currentWaypoint.place.public_id && 
                    previousWaypoint.place.public_id && 
                    currentWaypoint.place.public_id === previousWaypoint.place.public_id) {
                    hasConsecutiveDuplicates = true;
                    break;
                }
            }
            //Show error if duplicates present
            if (hasConsecutiveDuplicates) {
                this.showErrorOnce(this.intl.t('common.duplicate-waypoint-error'));
                return;
            }

        }
        if (!this.isValid) {
            return;
        }

        this.previewRoute(false);
        this.loader.showLoader('body', { loadingMessage: this.intl.t('common.creating-order')});

        const { order, groupedMetaFields, payload, entities, waypoints } = this;
        const route = this.leafletOptimizedRoute ? this.getOptimizedRoute() : this.getRoute();
        console.log(this.order.estimated_end_date);
        // set service quote if applicable
        if (this.selectedServiceQuote) {
            order.service_quote_uuid = this.selectedServiceQuote;
        }

        try {
            order.serializeMeta().serializeMetaFromGroupedFields(groupedMetaFields).setPayload(payload).setRoute(route).get('payload').setWaypoints(waypoints).setEntities(entities);
        } catch (error) {
            this.notifications.serverError(error);
            this.loader.removeLoader();
            return;
        }

        // valiadate custom field inputs
        for (let i = 0; i < this.customFields.length; i++) {
            const customField = this.customFields[i];
            if (customField.required) {
                const customFieldValue = this.customFieldValues[customField.id];
                if (!customFieldValue || isBlank(customFieldValue.value)) {
                    this.loader.removeLoader();
                    return this.notifications.error(this.intl.t('fleet-ops.operations.orders.index.new.input-field-required', { inputFieldName: customField.label }));
                }
            }
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

        // send event that fleetops is `creating` an order
        this.universe.trigger('fleet-ops.order.creating', order);
        this.isCreatingOrder = true;

        try {
            return order
                .save()
                .then((order) => {
                    // trigger event that fleet-ops created an order
                    this.universe.trigger('fleet-ops.order.created', order);

                    // transition to order view
                    return this.hostRouter.transitionTo(`console.fleet-ops.operations.orders.index.view`, order).then(() => {
                        this.notifications.success(this.intl.t('fleet-ops.operations.orders.index.new.success-message', { orderId: order.public_id }));
                        this.loader.removeLoader();
                        this.resetForm();
                        later(
                            this,
                            () => {
                                this.hostRouter.refresh();
                            },
                            100
                        );
                    });
                })
                .catch((error) => {
                    this.isCreatingOrder = false;
                    this.notifications.serverError(error);
                    this.loader.removeLoader();
                });
        } catch (error) {
            this.notifications.error(error.message);
            this.loader.removeLoader();
        }
    }

    @action importOrder() {
        let path = `${ENV.AWS.FILE_PATH}/order-imports/${this.currentUser.companyId}`;
        let disk = ENV.AWS.DISK;
        let bucket = ENV.AWS.BUCKET;
        
        const checkQueue = () => {
            const uploadQueue = this.modalsManager.getOption('uploadQueue');
            if (uploadQueue.length) {
                this.modalsManager.setOption('acceptButtonDisabled', false);
            } else {
                this.modalsManager.setOption('acceptButtonDisabled', true);
            }
        };
    
        // Store reference to original confirm function
        const originalConfirm = async (modal) => {
            const uploadQueue = this.modalsManager.getOption('uploadQueue');
            const uploadedFiles = [];
            
            const uploadTask = (file) => {
                return new Promise((resolve) => {
                    this.fetch.uploadFile.perform(
                        file,
                        {
                            path: path,
                            disk: disk,
                            bucket: bucket,
                            type: `order_import`,
                        },
                        (uploadedFile) => {
                            uploadedFiles.pushObject(uploadedFile);
                            resolve(uploadedFile);
                        }
                    );
                });
            };
    
            if (!uploadQueue.length) {
                return this.notifications.warning(this.intl.t('fleet-ops.operations.orders.index.new.warning-message'));
            }
    
            modal.startLoading();
            modal.setOption('acceptButtonText', this.intl.t('fleet-ops.component.modals.order-import.uploading'));
    
            // Upload all files
            for (let i = 0; i < uploadQueue.length; i++) {
                const file = uploadQueue.objectAt(i);
                await uploadTask(file);
            }
    
            this.modalsManager.setOption('acceptButtonText', this.intl.t('fleet-ops.component.modals.order-import.processing'));
            this.modalsManager.setOption('isProcessing', true);
    
            const files = uploadedFiles.map((file) => file.id);
            let results;
    
            try {
                results = await this.fetch.post('orders/process-imports', { files });
                console.log(results);
                
                // Handle error log case
                if (results && results.error_log_url) {
                    this.handleErrorLogDownload(modal, results);
                    return;
                }
            } catch (error) {
                console.log("Processing error:", error);
                modal.stopLoading();
                this.modalsManager.setOption('isProcessing', false);
                return this.notifications.serverError(error);
            }
    
            // Success case - process the results
            this.handleSuccessfulImport(results, modal);
        };
    
        // Error log download handler
        const downloadErrorLog = (modal) => {
            const errorLogUrl = this.modalsManager.getOption('errorLogUrl');
            if (errorLogUrl) {
                this.downloadFile(errorLogUrl);
                // Optionally close modal after download
                modal.done();
            }
        };
    
        this.modalsManager.show('modals/order-import', {
            title: this.intl.t('fleet-ops.component.modals.order-import.title'),
            acceptButtonText: this.intl.t('fleet-ops.component.modals.order-import.start-upload-button'),
            acceptButtonScheme: 'magic',
            acceptButtonIcon: 'upload',
            acceptButtonDisabled: true,
            isProcessing: false,
            uploadQueue: [],
            keepOpen: true,
            errorLogUrl: null,
            isErrorState: false,
            fileQueueColumns: [
                { name: this.intl.t('fleet-ops.component.modals.order-import.type'), valuePath: 'extension', key: 'type' },
                { name: this.intl.t('fleet-ops.component.modals.order-import.file-name'), valuePath: 'name', key: 'fileName' },
                { name: this.intl.t('fleet-ops.component.modals.order-import.file-size'), valuePath: 'size', key: 'fileSize' },
                { name: this.intl.t('fleet-ops.component.modals.order-import.upload-date'), valuePath: 'file.lastModifiedDate', key: 'uploadDate' },
                { name: '', valuePath: '', key: 'delete' },
            ],
            acceptedFileTypes: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
            queueFile: (file) => {
                const uploadQueue = this.modalsManager.getOption('uploadQueue');
                uploadQueue.pushObject(file);
                checkQueue();
            },
            removeFile: (file) => {
                const { queue } = file;
                const uploadQueue = this.modalsManager.getOption('uploadQueue');
                uploadQueue.removeObject(file);
                queue.remove(file);
                checkQueue();
            },
            confirm: (modal) => {
                // Check if we're in error state (download mode)
                const isErrorState = this.modalsManager.getOption('isErrorState');
                if (isErrorState) {
                    downloadErrorLog(modal);
                } else {
                    originalConfirm(modal);
                }
            },
            // Add a secondary action for "Try Again" when in error state
            secondaryAction: (modal) => {
                const isErrorState = this.modalsManager.getOption('isErrorState');
                if (isErrorState) {
                    // Reset modal to initial state
                    this.resetModalToInitialState();
                }
            },
            decline: (modal) => {
                const uploadQueue = this.modalsManager.getOption('uploadQueue');
                try {
                    if (Array.isArray(uploadQueue) && uploadQueue.length) {
                        const files = [...uploadQueue];
                        files.forEach(file => {
                            const { queue } = file;
                            if (typeof uploadQueue.removeObject === 'function') {
                                uploadQueue.removeObject(file);
                            }
                            if (queue && typeof queue.remove === 'function') {
                                queue.remove(file);
                            }
                        });
                    }
                } catch (error) {
                    console.error('Error during upload queue cleanup:', error);
                } finally {
                    this.modalsManager.setOption('uploadQueue', []);
                    modal.done();
                }
            },
        });
    }
    
    // Helper method to handle error log download setup
    handleErrorLogDownload(modal, results) {
        // if (results.message) {
        //     this.notifications.warning(results.message);
        // } else {
        //     this.notifications.warning(this.intl.t('fleet-ops.operations.orders.index.new.import-error-log-warning'));
        // }
        
        // Set modal to error state
        this.modalsManager.setOption('errorLogUrl', results.error_log_url);
        this.modalsManager.setOption('acceptButtonText', this.intl.t('common.download-error-log'));
        this.modalsManager.setOption('acceptButtonIcon', 'download');
        this.modalsManager.setOption('acceptButtonScheme', 'primary');
        this.modalsManager.setOption('keepOpen', true);
        this.modalsManager.setOption('isProcessing', false);
        this.modalsManager.setOption('isErrorState', true);
        
        modal.stopLoading();
    }
    
    // Helper method to handle successful import
    handleSuccessfulImport(results, modal) {
        const places = get(results, 'places');
        const entities = get(results, 'entities');
    
        if (isArray(places)) {
            this.isMultipleDropoffOrder = true;
            this.waypoints = places.map((_place) => {
                const place = this.store.createRecord('place', _place);
                return this.store.createRecord('waypoint', { place });
            });
        }
    
        if (isArray(entities)) {
            this.entities = entities.map((entity) => {
                return this.store.createRecord('entity', entity);
            });
        }
    
        this.notifications.success(this.intl.t('fleet-ops.operations.orders.index.new.import-success'));
        this.isCsvImportedOrder = true;
        this.previewDraftOrderRoute(this.payload, this.waypoints, this.isMultipleDropoffOrder);
        modal.done();
    }
    
    // Improved download method
    downloadFile(url) {
        try {
            // Method 1: Try using fetch for better browser support
            fetch(url)
                .then(response => response.blob())
                .then(blob => {
                    const downloadUrl = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = downloadUrl;
                    
                    // Extract filename from URL or use default
                    const filename = url.split('/').pop() || 'error_log.xlsx';
                    link.download = filename;
                    
                    // Append to body, click, and cleanup
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    // Release the blob URL
                    window.URL.revokeObjectURL(downloadUrl);
                })
                .catch(error => {
                    console.error('Fetch download failed, trying direct method:', error);
                    this.directDownload(url);
                });
        } catch (error) {
            console.error('Download error:', error);
            this.directDownload(url);
        }
    }
    
    // Fallback direct download method
    directDownload(url) {
        const link = document.createElement('a');
        link.href = url;
        link.download = url.split('/').pop() || 'error_log.xlsx';
        link.target = '_blank'; // Open in new tab as fallback
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // Helper method to reset modal to initial state
    resetModalToInitialState() {
        this.modalsManager.setOption('isErrorState', false);
        this.modalsManager.setOption('errorLogUrl', null);
        this.modalsManager.setOption('uploadQueue', []);
        this.modalsManager.setOption('acceptButtonText', this.intl.t('fleet-ops.component.modals.order-import.start-upload-button'));
        this.modalsManager.setOption('acceptButtonIcon', 'upload');
        this.modalsManager.setOption('acceptButtonScheme', 'magic');
        this.modalsManager.setOption('acceptButtonDisabled', true);
        this.modalsManager.setOption('isProcessing', false);
    }

    @action async toggleAdhoc(on) {
        const defaultDistanceInMeters = 5000;

        if (on) {
            const company = this.store.peekRecord('company', this.currentUser.companyId);
            this.order.adhoc_distance = getWithDefault(company, 'options.fleetops.adhoc_distance', defaultDistanceInMeters);
        } else {
            this.order.adhoc_distance = defaultDistanceInMeters;
        }

        this.order.adhoc = on;
    }

    @action async toggleProofOfDelivery(on) {
        this.order.pod_required = on;

        if (on) {
            this.order.pod_method = 'scan';
        } else {
            this.order.pod_method = null;
        }
    }

    @action async checkServiceRates(shouldCheck) {
        this.servicable = shouldCheck;
        const params = {
            coordinates: this.getCoordinatesFromPayload().join(';'),
        };
        let serviceRates = [];

        if (this.isUsingIntegratedVendor) {
            params.facilitator = this.order.facilitator.public_id;
        }

        // filter by order config type
        if (this.orderConfig) {
            params.service_type = this.orderConfig.key;
        }

        if (shouldCheck) {
            try {
                serviceRates = await this.fetch.get(`service-rates/for-route`, params);

                serviceRates.unshiftObject({
                    service_name: 'Quote from all Service Rates',
                    id: 'all',
                });
            } catch (error) {
                this.notifications.serverError(error);
            }

            this.serviceRates = serviceRates;
        }
    }

    @action createPlace() {
        const place = this.store.createRecord('place');
        this.contextPanel.focus(place, 'editing', {
            onAfterSave: () => {
                this.contextPanel.clear();
            },
        });
    }

    @action editPlace(place) {
        this.contextPanel.focus(place, 'editing', {
            onAfterSave: () => {
                this.contextPanel.clear();
            },
        });
    }

    @action async getQuotes(service) {
        this.isFetchingQuotes = true;

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

        if (this.payloadCoordinates?.length < 2) {
            this.isFetchingQuotes = false;
            return;
        }

        if (this.isUsingIntegratedVendor && this.integratedVendorServiceType) {
            service_type = this.integratedVendorServiceType;
        }

        // get place instances from WaypointModel
        for (let i = 0; i < waypoints.length; i++) {
            let place = await waypoints[i].place;

            places.pushObject(place);
        }

        setProperties(payload, { waypoints: places, entities });

        if (!payload.type && this.order.type) {
            setProperties(payload, { type: this.order.type });
        }

        this.fetch
            .post('service-quotes/preliminary', {
                payload: this._getSerializedPayload(payload),
                distance,
                time,
                service,
                service_type,
                facilitator,
                scheduled_at,
                is_route_optimized,
            })
            .then((serviceQuotes) => {
                set(this, 'serviceQuotes', isArray(serviceQuotes) ? serviceQuotes : []);

                if (this.serviceQuotes.length && this.isUsingIntegratedVendor) {
                    set(this, 'selectedServiceQuote', this.serviceQuotes.firstObject?.uuid);
                }
            })
            .catch(() => {
                this.notifications.warning(this.intl.t('fleet-ops.operations.orders.index.new.service-warning'));
            })
            .finally(() => {
                this.isFetchingQuotes = false;
            });
    }

    _getSerializedPayload(payload) {
        const serialized = {
            pickup: this._seriailizeModel(payload.pickup),
            dropoff: this._seriailizeModel(payload.dropoff),
            entitities: this._serializeArray(payload.entities),
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

    @action scheduleOrder(dateInstance) {
        this.order.scheduled_at = dateInstance;
    }

    @action EndDateOrder(dateInstance) {
        this.order.estimated_end_date = dateInstance;
    }

    @action setupInterface() {
        if (this.leafletMap && this.leafletMap.liveMap) {
            this.leafletMap.liveMap.hideAll();

            // track all layers added from this view
            this.leafletMap.on('layeradd', ({ layer }) => {
                // disable dragging of layer
                if (layer.dragging && typeof layer.dragging.disable === 'function') {
                    layer.dragging.disable();
                }

                next(this, function () {
                    if (isArray(this.leafletLayers) && !this.leafletLayers.includes(layer)) {
                        this.leafletLayers.pushObject(layer);
                    }
                });
            });
        } else {
            // setup interface when livemap is ready
            this.universe.on('fleet-ops.live-map.ready', () => {
                this.setupInterface();
            });
        }
         // Make sure there's at least one waypoint
    if (this.isMultipleDropoffOrder && (!this.waypoints || this.waypoints.length === 0)) {
        this.addWaypoint();
    }
        // switch to map mode
        this.ordersController.setLayoutMode('map');
    }

    @action resetInterface() {
        if (this.leafletMap && this.leafletMap.liveMap) {
            this.leafletMap.liveMap.show(['drivers', 'vehicles', 'routes']);
        }
    }

    @action getRoute() {
        const details = this.leafletRoute;
        const route = this.store.createRecord('route', { details });

        return route;
    }

    @action getOptimizedRoute() {
        const details = this.leafletOptimizedRoute;
        const route = this.store.createRecord('route', { details });

        return route;
    }

    @action setOptimizedRoute(route, trip, waypoints) {
        let summary = { totalDistance: trip.distance, totalTime: trip.duration };
        let payload = {
            optimized: true,
            coordinates: route,
            waypoints,
            trip,
            summary,
        };

        this.leafletOptimizedRoute = payload;
    }

    @action removeRoutingControlPreview() {
        const leafletMap = this.leafletMap;
        const previewRouteControl = this.previewRouteControl;
        // Safety check
    if (!leafletMap || !previewRouteControl) {
        return;
    }
        let removed = false;

        if (leafletMap && previewRouteControl instanceof RoutingControl) {
            try {
                previewRouteControl.remove();
                removed = true;
            } catch (e) {
                // silent
            }

            if (!removed) {
                try {
                    leafletMap.removeControl(previewRouteControl);
                } catch (e) {
                    // silent
                }
            }
        }

        if (!removed) {
            this.forceRemoveRoutePreview();
        }
    }

    @action forceRemoveRoutePreview() {
        const { leafletMap } = this;
        // Safety check
        if (!leafletMap) {
            return;
        }
        leafletMap.eachLayer((layer) => {
            if (layer instanceof L.Polyline || layer instanceof L.Marker) {
                try {
                    layer.remove();
                } catch (error) {
                    // silent error just continue with order processing if any
                }
            }
        });
    }

    @action removePreviewRouteLayers() {
        const { currentLeafletRoute, leafletMap } = this;

        if (currentLeafletRoute) {
            // target is the route, and waypoints is the markers
            const { target, waypoints } = currentLeafletRoute;

            leafletMap.removeLayer(target);
            waypoints?.forEach((waypoint) => {
                try {
                    leafletMap.removeLayer(waypoint);
                } catch (error) {
                    // silent error just continue with order processing if any
                }
            });
        }
    }

    @action clearLayers() {
        if (!this.leafletMap) {
            return;
        }
        if (this.leafletMap) {
            try {
                this.leafletMap.eachLayer((layer) => {
                    if (isArray(this.leafletLayers) && this.leafletLayers.includes(layer)) {
                        this.leafletMap.removeLayer(layer);
                    }
                });
            } catch (error) {
                // fallback method with tracked layers
                if (isArray(this.leafletLayers)) {
                    this.leafletLayers.forEach((layer) => {
                        try {
                            this.leafletMap.removeLayer(layer);
                        } catch (error) {
                            // silent error just continue with order processing if any
                        }
                    });
                }
            }
        }
    }

    @action clearAllLayers() {
        if (this.leafletMap) {
            try {
                this.leafletMap.eachLayer((layer) => {
                    this.leafletMap.removeLayer(layer);
                });
            } catch (error) {
                // fallback method with tracked layers
                if (isArray(this.leafletLayers)) {
                    this.leafletLayers.forEach((layer) => {
                        try {
                            this.leafletMap.removeLayer(layer);
                        } catch (error) {
                            // silent error just continue with order processing if any
                        }
                    });
                }
            }
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

    @action createCoordinatesFromRoutePlaceArray(array) {
        return array.filter((place) => place.get('hasValidCoordinates')).map((place) => place.get('latlng'));
    }

    @action previewDraftOrderRoute(payload, waypoints, isMultipleDropoffOrder = false) {
        const leafletMap = this.leafletMap;
        if (!leafletMap) {
            return;
        }
        // if existing route preview on the map - remove it
        this.removeRoutingControlPreview();
        this.removeOptimizedRoute();
        this.clearLayers();
        if (!waypoints.length) {
            return;
        }

        if (!this.isRoutePreviewAnimationActive) {
            this.previewRoute(true);
        }

        this.isViewingRoutePreview = true;
        this.routePreviewArray = this.createPlaceArrayFromPayload(payload, waypoints, isMultipleDropoffOrder);

        const canPreviewRoute = this.routePreviewArray.length > 0;

        if (canPreviewRoute) {
            const routingHost = getRoutingHost(payload, waypoints);
            const router = new OSRMv1({
                serviceUrl: `${routingHost}/route/v1`,
                profile: 'driving',
            });

            this.previewRouteControl = new RoutingControl({
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
                },
                router,
            }).addTo(leafletMap);

            this.previewRouteControl.on('routesfound', (event) => {
                const { routes } = event;
                const leafletRoute = routes.firstObject;
                this.currentLeafletRoute = event;

                this.setProperties({ leafletRoute });
            });

            if (this.routePreviewCoordinates.length === 1) {
                leafletMap.flyTo(this.routePreviewCoordinates[0], 18);
                leafletMap.once('moveend', function () {
                    leafletMap.panBy([200, 0]);
                });
            } else {
                leafletMap.flyToBounds(this.routePreviewCoordinates, {
                    paddingBottomRight: [300, 0],
                    maxZoom: this.routePreviewCoordinates.length === 2 ? 15 : 14,
                    animate: true,
                });
                leafletMap.once('moveend', function () {
                    leafletMap.panBy([150, 0]);
                });
            }
        } else {
            this.showErrorOnce(this.intl.t('fleet-ops.operations.orders.index.new.no-route-warning'));
        }
    }

    @action previewRoute(isViewingRoutePreview) {
        this.isViewingRoutePreview = isViewingRoutePreview;
        this.isRoutePreviewAnimationActive = isViewingRoutePreview;

        if (isViewingRoutePreview === true) {
            this.previewDraftOrderRoute(this.payload, this.waypoints, this.isMultipleDropoffOrder);
        }

        if (isViewingRoutePreview === false) {
            this.removeRoutingControlPreview();
            this.removeOptimizedRoute();
            this.removePreviewRouteLayers();
            this.clearLayers();
        }
    }

    @action async optimizeRoute() {
        this.isOptimizingRoute = true;

        const leafletMap = this.leafletMap;
        const coordinates = this.getCoordinatesFromPayload();
        const routingHost = getRoutingHost(this.payload, this.waypoints);

        const response = await this.fetch.routing(coordinates, { source: 'any', destination: 'any', annotations: true }, { host: routingHost }).catch(() => {
            this.showErrorOnce(this.intl.t('fleet-ops.operations.orders.index.new.route-error'));
            this.isOptimizingRoute = false;
        });

        this.isOptimizingRoute = false;

        if (response && response.code === 'Ok') {
            // remove current route display
            this.removeRoutingControlPreview();
            this.removeOptimizedRoute(leafletMap);

            let trip = response.trips.firstObject;
            let route = polyline.decode(trip.geometry);
            let sortedWaypoints = [];
            let optimizedRouteMarkers = [];

            if (response.waypoints && isArray(response.waypoints)) {
                const responseWaypoints = response.waypoints.sortBy('waypoint_index');

                this.setOptimizedRoute(route, trip, responseWaypoints);

                for (let i = 0; i < responseWaypoints.length; i++) {
                    const optimizedWaypoint = responseWaypoints.objectAt(i);
                    const optimizedWaypointLongitude = optimizedWaypoint.location.firstObject;
                    const optimizedWaypointLatitude = optimizedWaypoint.location.lastObject;
                    const waypointModel = findClosestWaypoint(optimizedWaypointLatitude, optimizedWaypointLongitude, this.waypoints);
                    // eslint-disable-next-line no-undef
                    // const optimizedWaypointMarker = new L.Marker(optimizedWaypoint.location.reverse()).addTo(leafletMap);
                    const [longitude, latitude] = getWithDefault(optimizedWaypoint.location, 'coordiantes', [0, 0]);
                    const optimizedWaypointMarker = new L.Marker([latitude, longitude]).addTo(leafletMap);

                    sortedWaypoints.pushObject(waypointModel);
                    optimizedRouteMarkers.pushObject(optimizedWaypointMarker);
                }

                this.waypoints = sortedWaypoints;
                this.optimizedRouteMarkers = optimizedRouteMarkers;
            }

            // set order as route optimized
            this.order.set('is_route_optimized', true);

            // refetch quotes
            if (this.isUsingIntegratedVendor) {
                this.getQuotes();
            }

            // eslint-disable-next-line no-undef
            let optimizedRoute = (this.optimizedRoutePolyline = new L.Polyline(route, { color: 'red' }).addTo(leafletMap));
            // leafletMap.addLayer(optimizedRoute);
            leafletMap.flyToBounds(optimizedRoute.getBounds(), {
                paddingBottomRight: [0, 600],
                animate: true,
                maxZoom: 13,
            });
        } else {
            this.showErrorOnce(this.intl.t('fleet-ops.operations.orders.index.new.route-error'));
            this.isOptimizingRoute = false;
        }
    }

    @action removeOptimizedRoute(_leafletMap = null) {
        this.leafletOptimizedRoute = undefined;

        const leafletMap = _leafletMap || this.leafletMap;

        if (!leafletMap) {
            return;
        }

        if (this.optimizedRoutePolyline) {
            leafletMap.removeLayer(this.optimizedRoutePolyline);
        }

        for (let i = 0; i < this.optimizedRouteMarkers.length; i++) {
            let marker = this.optimizedRouteMarkers.objectAt(i);

            leafletMap.removeLayer(marker);
        }
    }

    @action getCoordinatesFromPayload() {
        this.notifyPropertyChange('payloadCoordinates');

        return this.payloadCoordinates;
    }

    @action toggleMultiDropOrder(isMultipleDropoffOrder) {
        this.isMultipleDropoffOrder = isMultipleDropoffOrder;

        const { pickup, dropoff } = this.payload || {};

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
            if (this.waypoints && this.waypoints.length) {
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
    }

    @action resetForm() {
        if (this.isViewingRoutePreview) {
            this.previewRoute(false);
        }
        if (this.leafletMap) {
            this.removeRoutingControlPreview();
            this.removeOptimizedRoute();
            this.clearLayers();
        }
        const order = this.store.createRecord('order', { meta: [] });
        const payload = this.store.createRecord('payload');
        const driversQuery = {};
        const meta = [];
        const entities = [];
        const waypoints = [];
        const orderConfigs = [];
        const orderConfig = undefined;
        const isCreatingOrder = false;
        const isMultipleDropoffOrder = true;
        const leafletRoute = undefined;
        const serviceRates = [];
        const selectedServiceRate = undefined;
        const selectedServiceQuote = undefined;
        const servicable = false;
        this.set('waypoints', []);
        // this.removeRoutingControlPreview();
        // this.removeOptimizedRoute();
        // this.set('waypoints', []);
        this.setProperties({
            order,
            payload,
            driversQuery,
            meta,
            entities,
            waypoints,
            orderConfigs,
            orderConfig,
            isCreatingOrder,
            isMultipleDropoffOrder,
            leafletRoute,
            serviceRates,
            selectedServiceQuote,
            selectedServiceRate,
            servicable,
        });
        this.resetInterface();
        this.loadWaypoints();
    }

    @action setConfig(event) {
        const orderConfigId = event.target.value;
        if (!orderConfigId) {
            return;
        }

        const orderConfig = this.store.peekRecord('order-config', orderConfigId);
        this.orderConfig = orderConfig;
        this.order.set('order_config_uuid', orderConfig.id);
        this.order.set('type', orderConfig.key);

        // load custom fields
        this.loadCustomFields.perform(orderConfig);
    }

    /**
     * A task method to load custom fields from the store and group them.
     * @task
     */
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

    @action setOrderFacilitator(model) {
        this.order.set('facilitator', model);
        // this.order.set('facilitator_type', `fleet-ops:${model.facilitator_type}`);
        this.order.set('driver', null);

        this.isUsingIntegratedVendor = model.isIntegratedVendor;
        this.servicable = model.isIntegratedVendor;

        if (model.service_types?.length) {
            this.integratedVendorServiceType = model.service_types.firstObject.key;
        }

        if (model.isIntegratedVendor) {
            this.getQuotes();
        }

        if (model) {
            this.driversQuery = { facilitator: model.id };
        }
    }

    @action setOrderCustomer(model) {
        this.order.set('customer', model);
    }

    @action setWaypointCustomer(waypoint, model) {
        waypoint.set('customer', model);
        waypoint.set('customer_type', `fleet-ops:${model.customer_type}`);
    }

    @action selectIntegratedServiceType(key) {
        this.integratedVendorServiceType = key;

        if (this.isUsingIntegratedVendor) {
            this.getQuotes();
        }
    }

    @action async selectDriver(driver) {
        this.order.set('driver_assigned', driver);
        if (driver && driver.vehicle) {
            const vehicle = await driver.vehicle;
            this.order.set('vehicle_assigned', vehicle);
        }
    }

    @action addCustomField() {
        let label, value;

        this.modalsManager.show('modals/meta-field-form', {
            title: this.intl.t('fleet-ops.operations.orders.index.new.custom-field-title'),
            acceptButtonIcon: 'check',
            acceptButtonIconPrefix: 'fas',
            acceptButtonText: this.intl.t('common.done'),
            declineButtonIcon: 'times',
            declineButtonIconPrefix: 'fas',
            label,
            value,
            confirm: (modal) => {
                const label = modal.getOption('label');
                const value = modal.getOption('value');

                if (!label) {
                    return this.notifications.warning(this.intl.t('fleet-ops.operations.orders.index.new.label-warning'));
                }

                if (!value) {
                    return this.notifications.warning(this.intl.t('fleet-ops.operations.orders.index.new.value-warning'));
                }

                modal.startLoading();

                this.order.meta.pushObject({
                    key: dasherize(label),
                    label,
                    value,
                });

                modal.done();
            },
        });
    }

    @action editCustomField(index) {
        const metaField = this.order.meta.objectAt(index);
        const { label, value } = metaField;

        this.modalsManager.show('modals/meta-field-form', {
            title: this.intl.t('fleet-ops.operations.orders.index.new.edit-field-title'),
            acceptButtonIcon: 'save',
            acceptButtonText: this.intl.t('common.save-changes'),
            label,
            value,
            confirm: (modal) => {
                const label = modal.getOption('label');
                const value = modal.getOption('value');

                if (!label) {
                    return this.notifications.warning(this.intl.t('fleet-ops.operations.orders.index.new.label-warning'));
                }

                if (!value) {
                    return this.notifications.warning(this.intl.t('fleet-ops.operations.orders.index.new.value-warning'));
                }

                modal.startLoading();

                this.order.meta.replace(index, 1, [
                    {
                        key: dasherize(label),
                        label,
                        value,
                    },
                ]);

                modal.done();
            },
        });
    }

    @action editMetaData() {
        let { meta } = this.order;

        if (!isArray(meta)) {
            meta = [];
        }

        this.modalsManager.show('modals/edit-meta-form', {
            title: this.intl.t('fleet-ops.operations.orders.index.new.edit-metadata'),
            hideDeclineButton: true,
            acceptButtonIcon: 'check',
            acceptButtonIconPrefix: 'fas',
            acceptButtonText: this.intl.t('common.done'),
            meta,
            addMetaField: (meta) => {
                const label = this.intl.t('common.new-field');
                meta.pushObject({
                    key: dasherize(label),
                    label,
                    value: null,
                });
            },
            removeMetaField: (meta, index) => {
                meta.removeAt(index);
            },
            confirm: (modal) => {
                const meta = modal.getOption('meta');

                this.order.meta = meta;

                modal.done();
            },
        });
    }

    @action removeMeta(meta) {
        this.meta.removeObject(meta);
    }

    @action setPayloadPlace(prop, place) {
        this.payload[prop] = place;

        // this.previewRoute(true);
        this.previewDraftOrderRoute(this.payload, this.waypoints, this.isMultipleDropoffOrder);

        if (this.isUsingIntegratedVendor) {
            this.getQuotes();
        }

        this.updatePayloadCoordinates();
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
    }

    @action setWaypointPlace(index, place) {
        if (!this.waypoints[index]) {
            return;
        }

        this.waypoints[index].place = place;

        if (this.waypoints.length) {
            this.previewDraftOrderRoute(this.payload, this.waypoints, this.isMultipleDropoffOrder);
        }

        if (this.isUsingIntegratedVendor) {
            this.getQuotes();
        }

        this.updatePayloadCoordinates();
    }

    @action removeWaypoint(waypoint) {
        if (this.isMultipleDropoffOrder && this.waypoints.length === 1) {
            return;
        }

        this.waypoints.removeObject(waypoint);

        if (this.waypoints.length === 1) {
            this.previewRoute(false);
        } else {
            this.previewDraftOrderRoute(this.payload, this.waypoints, this.isMultipleDropoffOrder);
        }

        this.updatePayloadCoordinates();
    }

    @action clearWaypoints() {
        this.waypoints.clear();

        if (this.isViewingRoutePreview) {
            this.previewRoute(false);
        }
    }

    @action setEntityDestionation(index, { target }) {
        const { value } = target;

        this.entities[index].destination_uuid = value;
    }

    @action addFromCustomEntity(customEntity) {
        const entity = this.store.createRecord('entity', {
            ...customEntity,
            id: undefined,
        });

        this.entities.pushObject(entity);
    }

    @action addEntities(entities = []) {
        if (isArray(entities)) {
            this.entities.pushObjects(entities);
        }
    }

    @action addEntity(importId = null) {
        const entity = this.store.createRecord('entity', {
            _import_id: typeof importId === 'string' ? importId : null,
        });

        this.entities.pushObject(entity);
    }

    @action removeEntity(entity) {
        if (this.entities.length === 1) {
            return;
        }

        if (!entity.get('isNew')) {
            return entity.destroyRecord();
        }

        this.entities.removeObject(entity);
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

    @action transitionBack() {
        return this.transitionToRoute('operations.orders.index');
    }

    @action async newFacilitator() {
        const type = await this.modalsManager.userSelectOption('Select facilitator type', ['contact', 'vendor']);

        if (type === 'vendor') {
            const vendor = this.store.createRecord('vendor', { type: 'facilitator', status: 'active' });
            return this.contextPanel.focus(vendor, 'editing', {
                onAfterSave: (vendor) => {
                    this.setOrderFacilitator(vendor);
                    this.contextPanel.clear();
                },
            });
        }

        if (type === 'contact') {
            const contact = this.store.createRecord('contact', { type: 'facilitator', status: 'active' });
            return this.contextPanel.focus(contact, 'editing', {
                onAfterSave: (contact) => {
                    this.setOrderFacilitator(contact);
                    this.contextPanel.clear();
                },
            });
        }
    }

    @action async newCustomer() {
        const type = await this.modalsManager.userSelectOption('Select customer type', ['contact', 'vendor']);

        if (type === 'vendor') {
            const vendor = this.store.createRecord('vendor', { type: 'customer', status: 'active' });
            return this.contextPanel.focus(vendor, 'editing', {
                onAfterSave: (vendor) => {
                    this.setOrderCustomer(vendor);
                    this.contextPanel.clear();
                },
            });
        }

        if (type === 'contact') {
            const contact = this.store.createRecord('contact', { type: 'customer', status: 'active' });
            return this.contextPanel.focus(contact, 'editing', {
                onAfterSave: (contact) => {
                    this.setOrderCustomer(contact);
                    this.contextPanel.clear();
                },
            });
        }
    }

    @action applyCustomMetaFields(typeKey) {
        const type = this.types.find((type) => type.key === typeKey);

        if (!type || !type.meta) {
            return;
        }

        if (isArray(type.meta.fields)) {
            for (let i = 0; i < type.meta.fields.length; i++) {
                let field = type.meta.fields[i];

                this.meta.pushObject({
                    ...field,
                    value: null,
                });
            }
        }
    }

    @action queueFile(file) {
        // since we have dropzone and upload button within dropzone validate the file state first
        // as this method can be called twice from both functions
        if (['queued', 'failed', 'timed_out', 'aborted'].indexOf(file.state) === -1) {
            return;
        }

        // Queue and upload immediatley
        this.uploadQueue.pushObject(file);
        this.fetch.uploadFile.perform(
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
}
