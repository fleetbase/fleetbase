import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import getLeafletLayerById from '../utils/get-leaflet-layer-by-id';
import findLeafletLayer from '../utils/find-leaflet-layer';
import flyToLeafletLayer from '../utils/fly-to-leaflet-layer';

/**
 * Service for managing Leaflet maps and layers.
 *
 * This service provides functions to work with Leaflet maps, including accessing layers by ID,
 * finding layers based on a custom callback, and flying to specific layers with optional zoom and options.
 *
 * @class
 */
export default class LeafletMapManagerService extends Service {
    /**
     * An array of editable layers on the map.
     *
     * @memberof LeafletMapManagerService
     * @type {Array}
     */
    @tracked editableLayers = [];

    /**
     * Get a Leaflet layer by its ID from the given map.
     *
     * @memberof LeafletMapManagerService
     * @param {Object} map - The Leaflet map instance.
     * @param {string} layerId - The ID of the layer to retrieve.
     * @returns {Object|null} The Leaflet layer with the specified ID, or null if not found.
     */
    getLeafletLayerById(map, layerId) {
        return getLeafletLayerById(map, layerId);
    }

    /**
     * Find a Leaflet layer in the given map using a custom callback.
     *
     * @memberof LeafletMapManagerService
     * @param {Object} map - The Leaflet map instance.
     * @param {Function} findCallback - A custom callback function to find the desired layer.
     * @returns {Object|null} The found Leaflet layer, or null if not found.
     */
    findLeafletLayer(map, findCallback) {
        return findLeafletLayer(map, findCallback);
    }

    /**
     * Fly to a specific Leaflet layer on the map with optional zoom and options.
     *
     * @memberof LeafletMapManagerService
     * @param {Object} map - The Leaflet map instance.
     * @param {Object} layer - The Leaflet layer to fly to.
     * @param {number} zoom - The zoom level to apply (optional).
     * @param {Object} options - Additional options for the fly animation (optional).
     * @returns {Object} The Leaflet map instance.
     */
    flyToLayer(map, layer, zoom, options = {}) {
        return flyToLeafletLayer(map, layer, zoom, options);
    }
}
