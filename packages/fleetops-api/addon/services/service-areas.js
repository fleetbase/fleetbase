import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isArray } from '@ember/array';
import { dasherize } from '@ember/string';
import { later } from '@ember/runloop';
import GeoJson from '@fleetbase/fleetops-data/utils/geojson/geo-json';
import MultiPolygon from '@fleetbase/fleetops-data/utils/geojson/multi-polygon';
import Polygon from '@fleetbase/fleetops-data/utils/geojson/polygon';
import FeatureCollection from '@fleetbase/fleetops-data/utils/geojson/feature-collection';

const L = window.L;
export default class ServiceAreasService extends Service {
    @service store;
    @service modalsManager;
    @service notifications;
    @service crud;
    @service appCache;

    /**
     * The Leaflet map instance used by the service for map-related operations.
     *
     * @type {Object|null}
     */
    @tracked leafletMap;

    /**
     * An array of service area types available within the application.
     *
     * @type {string[]}
     */
    @tracked serviceAreaTypes = ['neighborhood', 'city', 'region', 'state', 'province', 'country', 'continent'];

    /**
     * A context variable that stores the current context for layer creation.
     *
     * @type {string|null}
     */
    @tracked layerCreationContext;

    /**
     * A context variable that stores information related to the service area in which zones are being created.
     *
     * @type {Object|null}
     */
    @tracked zoneServiceAreaContext;

    /**
     * Retrieves service areas from the cache.
     *
     * @function
     * @returns {Array} An array of service areas retrieved from the cache.
     */
    getFromCache() {
        return this.appCache.getEmberData('serviceAreas', 'service-area');
    }

    /**
     * Removes a service area from the cache.
     *
     * @function
     * @param {Object} serviceArea - The service area to remove from the cache.
     */
    removeFromCache(serviceArea) {
        const serviceAreas = this.getFromCache();
        const index = serviceAreas?.findIndex((sa) => sa.id === serviceArea.id);

        if (index > 0) {
            const updatedServiceAreas = serviceAreas.removeAt(index);
            this.appCache.setEmberData('serviceAreas', updatedServiceAreas);
        }
    }

    /**
     * Adds a service area to the cache.
     *
     * @function
     * @param {ServiceAreaModel} serviceArea - The service area to add to the cache.
     */
    addToCache(serviceArea) {
        const serviceAreas = this.getFromCache();

        if (isArray(serviceAreas)) {
            this.appCache.setEmberData('serviceAreas', [...serviceAreas, serviceArea]);
        } else {
            this.appCache.setEmberData('serviceAreas', [serviceArea]);
        }
    }

    /**
     * Converts a Leaflet layer to a Terraformer primitive.
     *
     * @function
     * @param {Object} layer - The Leaflet layer to convert.
     * @returns {Object} The Terraformer primitive.
     */
    layerToTerraformerPrimitive(layer) {
        const leafletLayerGeoJson = layer.toGeoJSON();
        let featureCollection, feature;

        if (leafletLayerGeoJson.type === 'FeatureCollection') {
            featureCollection = new FeatureCollection(leafletLayerGeoJson);
            feature = featureCollection.features.lastObject;
        } else if (leafletLayerGeoJson.type === 'Feature') {
            feature = leafletLayerGeoJson;
        }

        const primitive = new GeoJson(feature.geometry);

        return primitive;
    }

    /**
     * Converts a Leaflet layer to a Terraformer MultiPolygon.
     *
     * @function
     * @param {Object} layer - The Leaflet layer to convert.
     * @returns {Object} The Terraformer MultiPolygon.
     */
    layerToTerraformerMultiPolygon(layer) {
        const leafletLayerGeoJson = layer.toGeoJSON();
        let featureCollection, feature, coordinates;

        if (leafletLayerGeoJson.type === 'FeatureCollection') {
            featureCollection = new FeatureCollection(leafletLayerGeoJson);
            feature = featureCollection.features.lastObject;
        } else if (leafletLayerGeoJson.type === 'Feature') {
            feature = leafletLayerGeoJson;
        }

        coordinates = feature?.geometry?.coordinates ?? [];
        const multipolygon = new MultiPolygon([coordinates]);

        return multipolygon;
    }

    /**
     * Converts a Leaflet layer to a Terraformer Polygon.
     *
     * @function
     * @param {Object} layer - The Leaflet layer to convert.
     * @returns {Object} The Terraformer Polygon.
     */
    layerToTerraformerPolygon(layer) {
        const leafletLayerGeoJson = layer.toGeoJSON();
        let featureCollection, feature, coordinates;

        if (leafletLayerGeoJson.type === 'FeatureCollection') {
            featureCollection = new FeatureCollection(leafletLayerGeoJson);
            feature = featureCollection.features.lastObject;
        } else if (leafletLayerGeoJson.type === 'Feature') {
            feature = leafletLayerGeoJson;
        }

        coordinates = feature?.geometry?.coordinates ?? [];
        const polygon = new Polygon(coordinates);

        return polygon;
    }

    /**
     * Converts a Leaflet circle to a polygon that approximates the circle's shape.
     * @param {L.Circle} circle - The Leaflet circle layer to convert.
     * @param {number} [numPoints=64] - The number of points used to approximate the circle.
     * @param {Object} [options={}] - Optional parameters for the polygon layer.
     * @returns {L.Polygon} - The resulting Leaflet polygon layer.
     */
    circleToPolygon(circle, numPoints = 64, options = {}) {
        // Get circle details
        const center = circle.getLatLng();
        const radius = circle.getRadius();

        // Convert radius from meters to degrees (approximation)
        const radiusInDegrees = radius / 111320;

        // Generate points around the circle's circumference
        const latLngs = [];
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * 2 * Math.PI;
            const latOffset = radiusInDegrees * Math.sin(angle);
            const lngOffset = radiusInDegrees * Math.cos(angle);
            latLngs.push([center.lat + latOffset, center.lng + lngOffset]);
        }

        // Close the polygon by repeating the first point at the end
        latLngs.push(latLngs[0]);

        // Create a polygon from the generated points
        const polygon = L.polygon(latLngs, options);

        return polygon;
    }

    /**
     * Clears the layer creation context.
     *
     * @function
     */
    clearLayerCreationContext() {
        this.layerCreationContext = undefined;
    }

    /**
     * Sets the layer creation context.
     *
     * @function
     * @param {string} context - The context to set.
     */
    setLayerCreationContext(context) {
        this.layerCreationContext = context;
    }

    /**
     * Clears the zone service area context.
     *
     * @function
     */
    clearZoneServiceAreaContext() {
        this.zoneServiceAreaContext = undefined;
    }

    /**
     * Sets the zone service area context.
     *
     * @function
     * @param {Object} serviceArea - The service area to set as the context.
     */
    setZoneServiceAreaContext(serviceArea) {
        this.zoneServiceAreaContext = serviceArea;
    }

    /**
     * Retrieves the zone service area context.
     *
     * @function
     * @returns {Object} The zone service area context.
     */
    getZoneServiceAreaContext() {
        return this.zoneServiceAreaContext;
    }

    /**
     * Sets the Leaflet map instance for the service.
     *
     * @function
     * @param {Object} map - The Leaflet map instance to set.
     */
    setMapInstance(map) {
        this.leafletMap = map;
    }

    /**
     * Sends a command to the LiveMap through the Leaflet map instance.
     *
     * @function
     * @param {string} fn - The function name to call on the LiveMap.
     * @param {...any} params - Additional parameters to pass to the function.
     */
    triggerLiveMapFn(fn, ...params) {
        this.leafletMap.liveMap[fn](...params);
    }

    /**
     * Initiates the creation of a service area on the map.
     *
     * @function
     */
    @action createServiceArea() {
        this.triggerLiveMapFn('showDrawControls', { text: true });
        this.setLayerCreationContext('service-area');

        this.notifications.info('Use drawing controls to the right to draw a service area, complete point connections to save service area.', {
            clearDuration: 1000 * 9,
        });
    }

    /**
     * Creates a generic layer on the map, such as a service area or zone.
     *
     * @function
     * @param {Object} event - The event that triggered the creation.
     * @param {Object} layer - The layer being created.
     * @param {Object} options - Additional options for the creation (optional).
     */
    @action createGenericLayer(event, layer, options = {}) {
        if (this.layerCreationContext === 'service-area') {
            return this.saveServiceArea(...arguments);
        }

        if (this.layerCreationContext === 'zone') {
            return this.saveZone(...arguments);
        }

        const drawFeatureGroupLayer = layer;
        const map = this.leafletMap;
        layer = drawFeatureGroupLayer.lastCreatedLayer;
        if (event.layerType === 'circle') {
            layer = this.circleToPolygon(drawFeatureGroupLayer.lastCreatedLayer);
        }

        const border = this.layerToTerraformerMultiPolygon(layer);
        if (!border) {
            return;
        }

        this.modalsManager.show('modals/map-layer-form', {
            title: 'Create new Layer',
            acceptButtonText: 'Create',
            acceptButtonIcon: 'magic',
            declineButtonIcon: 'times',
            declineButtonIconPrefix: 'fas',
            layerTypes: ['Service Area', 'Zone'],
            selectedLayerType: 'Service Area',
            serviceAreaTypes: this.serviceAreaTypes,
            layerOptions: {},
            confirm: (modal) => {
                modal.startLoading();

                const selectedLayerType = modal.getOption('selectedLayerType');
                const layerOptions = modal.getOption('layerOptions');
                let serviceArea;

                // parse service area for zone
                if (selectedLayerType === 'Zone' && !layerOptions?.service_area) {
                    this.notifications.error('Service Area required to create Zone!');
                    return;
                } else {
                    serviceArea = layerOptions.service_area;
                }

                const record = this.store.createRecord(dasherize(selectedLayerType), layerOptions);
                record.setProperties({ border });

                return record.save().then((record) => {
                    this.notifications.success(`New ${selectedLayerType} '${record.name}' saved.`);

                    // remove drawn layer
                    map.removeLayer(drawFeatureGroupLayer);
                    // Hide draw controls on finish
                    this.triggerLiveMapFn('hideDrawControls');

                    // if service area has been created, add to the active service areas
                    if (selectedLayerType === 'Service Area') {
                        this.triggerLiveMapFn('activateServiceArea', record);
                        this.triggerLiveMapFn('focusLayerBoundsByRecord', record);
                    } else {
                        // if zone was created then we simply add the zone to the serviceArea selected
                        // then we focus the service area
                        serviceArea?.zones.pushObject(record);
                        this.triggerLiveMapFn('activateServiceArea', serviceArea);
                        this.triggerLiveMapFn('focusLayerBoundsByRecord', serviceArea);
                    }

                    // rebuild context menu
                    this.triggerLiveMapFn('rebuildMapContextMenu');
                    this.clearLayerCreationContext();
                });
            },
            decline: (modal) => {
                map.removeLayer(drawFeatureGroupLayer);
                // Hide draw controls on finish
                this.triggerLiveMapFn('hideDrawControls');
                modal.done();
            },
            ...options,
        });
    }

    /**
     * Saves a service area to the database.
     *
     * @function
     * @param {Object} event - The event that triggered the saving.
     * @param {Object} layer - The layer to be saved as a service area.
     */
    @action saveServiceArea(event, layer) {
        const drawFeatureGroupLayer = layer;
        const map = this.leafletMap;
        layer = drawFeatureGroupLayer.lastCreatedLayer;
        if (event.layerType === 'circle') {
            layer = this.circleToPolygon(drawFeatureGroupLayer.lastCreatedLayer);
        }

        const border = this.layerToTerraformerMultiPolygon(layer);
        if (!border) {
            return;
        }

        const serviceArea = this.store.createRecord('service-area', {
            border,
            status: 'active',
        });

        return this.editServiceAreaDetails(serviceArea, {
            title: 'Save Service Area',
            acceptButtonText: 'Confirm & Save',
            onFinish: () => {
                map.removeLayer(drawFeatureGroupLayer);
                // Hide draw controls on finish
                this.triggerLiveMapFn('hideDrawControls');
            },
        });
    }

    /**
     * Edits and saves details of a service area.
     *
     * @function
     * @param {Object} serviceArea - The service area to edit.
     * @param {Object} options - Additional options for the edit (optional).
     */
    @action editServiceAreaDetails(serviceArea, options = {}) {
        this.modalsManager.show('modals/service-area-form', {
            title: 'Edit Service Area',
            acceptButtonText: 'Save Changes',
            acceptButtonIcon: 'save',
            declineButtonIcon: 'times',
            declineButtonIconPrefix: 'fas',
            serviceAreaTypes: this.serviceAreaTypes,
            serviceArea,
            confirm: (modal) => {
                modal.startLoading();

                return serviceArea.save().then((serviceArea) => {
                    this.notifications.success(`New service area '${serviceArea.name}' saved.`);

                    this.clearLayerCreationContext();
                    this.addToCache(serviceArea);
                    this.triggerLiveMapFn('focusServiceArea', serviceArea);
                    this.triggerLiveMapFn('rebuildMapContextMenu');
                });
            },
            decline: (modal) => {
                this.clearLayerCreationContext();
                this.triggerLiveMapFn('hideDrawControls');

                if (serviceArea.isNew) {
                    serviceArea.destroyRecord();
                }
                modal.done();
            },
            ...options,
        });
    }

    /**
     * Deletes a service area from the database.
     *
     * @function
     * @param {Object} serviceArea - The service area to delete.
     * @param {Object} options - Additional options for the deletion (optional).
     */
    @action deleteServiceArea(serviceArea, options = {}) {
        this.triggerLiveMapFn('focusLayerBoundsByRecord', serviceArea);

        this.crud.delete(serviceArea, {
            onConfirm: () => {
                this.triggerLiveMapFn('blurServiceArea', serviceArea);
                this.removeFromCache(serviceArea);
            },
            ...options,
        });
    }

    /**
     * Initiates the creation of a zone within a service area on the map.
     *
     * @function
     * @param {Object} serviceArea - The service area within which the zone is being created.
     */
    @action createZone(serviceArea) {
        this.triggerLiveMapFn('showDrawControls', { text: true });
        this.triggerLiveMapFn('focusServiceArea', serviceArea);
        this.setZoneServiceAreaContext(serviceArea);
        this.setLayerCreationContext('zone');

        this.notifications.info('Use the drawing controls to the right to draw a zone within the service area, complete point connections to save the zone.', {
            clearDuration: 1000 * 9,
        });
    }

    /**
     * Saves a zone to the database.
     *
     * @function
     * @param {Object} event - The event that triggered the saving.
     * @param {Object} layer - The layer to be saved as a zone.
     * @returns {Promise} A promise that resolves when the zone is saved.
     */
    @action saveZone(event, layer) {
        const drawFeatureGroupLayer = layer;
        const map = this.leafletMap;
        layer = drawFeatureGroupLayer.lastCreatedLayer;
        if (event.layerType === 'circle') {
            layer = this.circleToPolygon(drawFeatureGroupLayer.lastCreatedLayer);
        }

        const border = this.layerToTerraformerPolygon(layer);
        const serviceArea = this.getZoneServiceAreaContext();
        const zone = this.store.createRecord('zone', {
            service_area_uuid: serviceArea.id,
            serviceArea,
            border,
        });

        return this.editZone(zone, serviceArea, {
            title: 'Save Zone',
            acceptButtonText: 'Confirm & Save',
            onFinish: () => {
                map.removeLayer(drawFeatureGroupLayer);
                // Hide draw controls on finish
                this.triggerLiveMapFn('hideDrawControls');
            },
        });
    }

    /**
     * Edits and saves details of a zone.
     *
     * @function
     * @param {Object} zone - The zone to edit.
     * @param {Object} serviceArea - The service area to which the zone belongs.
     * @param {Object} options - Additional options for the edit (optional).
     * @returns {Promise} A promise that resolves when the zone is successfully saved.
     */
    @action editZone(zone, serviceArea, options = {}) {
        this.modalsManager.show('modals/zone-form', {
            title: 'Edit Zone',
            acceptButtonText: 'Save Changes',
            acceptButtonIcon: 'save',
            declineButtonIcon: 'times',
            declineButtonIconPrefix: 'fas',
            zone,
            confirm: (modal) => {
                modal.startLoading();

                return zone.save().then(() => {
                    this.notifications.success(`New zone '${zone.name}' added to '${serviceArea.name}' service area.`);

                    this.clearLayerCreationContext();
                    this.clearZoneServiceAreaContext();
                    this.triggerLiveMapFn('hideDrawControls', { text: true });
                    this.triggerLiveMapFn('blurAllServiceAreas');

                    later(
                        this,
                        () => {
                            this.triggerLiveMapFn('focusServiceArea', serviceArea);
                        },
                        300
                    );
                    this.triggerLiveMapFn('rebuildMapContextMenu');
                });
            },
            decline: (modal) => {
                this.clearLayerCreationContext();
                this.clearZoneServiceAreaContext();
                this.triggerLiveMapFn('hideDrawControls', { text: true });

                if (zone.isNew) {
                    zone.destroyRecord();
                }
                modal.done();
            },
            ...options,
        });
    }

    /**
     * Deletes a zone from the database.
     *
     * @function
     * @param {Object} zone - The zone to delete.
     * @param {Object} options - Additional options for the deletion (optional).
     */
    @action deleteZone(zone, options = {}) {
        this.crud.delete(zone, {
            ...options,
        });
    }

    /**
     * Displays a service area in a dialog for viewing.
     *
     * @function
     * @param {Object} serviceArea - The service area to view in the dialog.
     * @param {Object} options - Additional options for the dialog (optional).
     */
    @action viewServiceAreaInDialog(serviceArea, options = {}) {
        this.modalsManager.show('modals/view-service-area', {
            title: `Service Area (${serviceArea.get('name')})`,
            modalClass: 'modal-lg',
            acceptButtonText: 'Done',
            acceptButtonIcon: 'check',
            acceptButtonIconPrefix: 'fas',
            hideDeclineButton: true,
            serviceArea,
            ...options,
        });
    }

    /**
     * Displays a zone in a dialog for viewing.
     *
     * @function
     * @param {Object} zone - The zone to view in the dialog.
     * @param {Object} options - Additional options for the dialog (optional).
     */
    @action viewZoneInDialog(zone, options = {}) {
        this.modalsManager.show('modals/view-zone', {
            title: `Zone (${zone.get('name')})`,
            modalClass: 'modal-lg',
            acceptButtonText: 'Done',
            acceptButtonIcon: 'check',
            acceptButtonIconPrefix: 'fas',
            hideDeclineButton: true,
            zone,
            ...options,
        });
    }
}
