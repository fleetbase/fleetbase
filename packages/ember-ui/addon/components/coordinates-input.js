import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { isArray } from '@ember/array';
import { later } from '@ember/runloop';
import getWithDefault from '@fleetbase/ember-core/utils/get-with-default';

const DEFAULT_LATITUDE = 1.3521;
const DEFAULT_LONGITUDE = 103.8198;

export default class CoordinatesInputComponent extends Component {
    /**
     * Service for fetching data.
     * @type {Service}
     * @memberof CoordinatesInputComponent
     */
    @service fetch;

    /**
     * Service for accessing current user information.
     * @type {Service}
     * @memberof CoordinatesInputComponent
     */
    @service currentUser;

    /**
     * Current zoom level of the map.
     * @type {number}
     * @memberof CoordinatesInputComponent
     */
    @tracked zoom;

    /**
     * Controls whether zoom controls are shown.
     * @type {boolean}
     * @memberof CoordinatesInputComponent
     */
    @tracked zoomControl;

    /**
     * Reference to the Leaflet map instance.
     * @type {Object}
     * @memberof CoordinatesInputComponent
     */
    @tracked leafletMap;

    /**
     * Current latitude of the map center.
     * @type {number}
     * @memberof CoordinatesInputComponent
     */
    @tracked latitude = '';

    /**
     * Current longitude of the map center.
     * @type {number}
     * @memberof CoordinatesInputComponent
     */
    @tracked longitude = '';

    /**
     * Latitude for map positioning.
     * @type {number}
     * @memberof CoordinatesInputComponent
     */
    @tracked mapLat;

    /**
     * Longitude for map positioning.
     * @type {number}
     * @memberof CoordinatesInputComponent
     */
    @tracked mapLng;

    /**
     * Query used for location lookup.
     * @type {string}
     * @memberof CoordinatesInputComponent
     */
    @tracked lookupQuery;

    /**
     * Indicates if the component is loading data.
     * @type {boolean}
     * @memberof CoordinatesInputComponent
     */
    @tracked isLoading = false;

    /**
     * Indicates if the map is ready.
     * @type {boolean}
     * @memberof CoordinatesInputComponent
     */
    @tracked isReady = false;

    /**
     * Flag to track if the initial map movement has ended.
     * @type {boolean}
     * @memberof CoordinatesInputComponent
     */
    @tracked isInitialMoveEnded = false;

    /**
     * The URL for the map's tile source.
     * @type {string}
     * @memberof CoordinatesInputComponent
     */
    @tracked tileSourceUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';

    /**
     * Disable input.
     *
     * @memberof CoordinatesInputComponent
     */
    @tracked disabled = false;
    @tracked latitudeInput = '';
    @tracked longitudeInput = '';

    /**
     * Constructor for CoordinatesInputComponent. Sets initial map coordinates and values.
     * @memberof CoordinatesInputComponent
     */
    constructor() {
        super(...arguments);

        this.setInitialMapCoordinates();
        this.setInitialValueFromPoint(this.args.value);
        this.zoom = getWithDefault(this.args, 'zoom', 9);
        this.zoomControl = getWithDefault(this.args, 'zoomControl', false);
        this.disabled = getWithDefault(this.args, 'disabled', false);

        if (typeof this.args.onInit === 'function') {
            this.args.onInit(this);
        }
    }

    /**
     * Checks if the provided object is a geographical point.
     * @param {Object} point - Object to check.
     * @returns {boolean} True if the object is a geographical point, false otherwise.
     * @memberof CoordinatesInputComponent
     */
    isPoint(point) {
        return typeof point === 'object' && !isBlank(point.type) && point.type === 'Point' && isArray(point.coordinates);
    }
    /**
     * Handles input changes to the latitude field.
     * Parses the value, updates the latitude, and calls updateCoordinates
     * only if both latitude and longitude are valid numbers.
     *
     * @param {InputEvent} event - The input event triggered by typing in the latitude field.
     * @memberof CoordinatesInputComponent
     */
    @action
    onLatitudeInput(event) {
        this.latitudeInput = event.target.value;
        this._handleCoordinateInput();
    }

    @action
    onLongitudeInput(event) {
        this.longitudeInput = event.target.value;
        this._handleCoordinateInput();
    }

    _handleCoordinateInput() {
        const parsedLat = parseFloat(this.latitudeInput);
        const parsedLng = parseFloat(this.longitudeInput);

        const lat = isNaN(parsedLat) ? null : parsedLat;
        const lng = isNaN(parsedLng) ? null : parsedLng;

        this.updateCoordinates(lat, lng);
    }

    /**
     * Sets the initial value of the map's coordinates from a geographical point.
     * @param {Object} point - Geographical point to set the initial value from.
     * @memberof CoordinatesInputComponent
     */
    setInitialValueFromPoint(point) {
        if (this.isPoint(point)) {
            const [longitude, latitude] = point.coordinates;

            if (longitude === 0 && latitude === 0) {
                return;
            }

            this.updateCoordinates(latitude, longitude, { fireCallback: false });
        }
    }

    /**
     * Sets the initial map coordinates based on the current user's location.
     * @memberof CoordinatesInputComponent
     */
    setInitialMapCoordinates() {
        const whois = this.currentUser.getOption('whois', {});

        this.mapLat = getWithDefault(whois, 'latitude', DEFAULT_LATITUDE);
        this.mapLng = getWithDefault(whois, 'longitude', DEFAULT_LONGITUDE);
    }

    /**
     * Updates the coordinates of the map.
     * @param {number|Object} lat - Latitude or object with coordinates.
     * @param {number} [lng] - Longitude.
     * @param {Object} [options={}] - Additional options.
     * @memberof CoordinatesInputComponent
     */
    updateCoordinates(lat, lng, options = {}) {
        // Allow updating null/undefined coordinates
        const fireCallback = getWithDefault(options, 'fireCallback', true);
        const updateMap = getWithDefault(options, 'updateMap', true);
        const { onChange } = this.args;

        if (typeof lat !== 'number' || isNaN(lat) || typeof lng !== 'number' || isNaN(lng)) {
            console.warn('[updateCoordinates] Invalid or incomplete coordinates:', lat, lng);

            if (fireCallback && typeof onChange === 'function') {
                onChange({ latitude: lat, longitude: lng }); // ✅ Fire callback even when invalid
                console.log('[updateCoordinates] Firing onChange with INVALID values');
            }

            return;
        }

        this.latitude = lat;
        this.longitude = lng;

        if (updateMap === true) {
            this.mapLat = lat;
            this.mapLng = lng;
        }

        if (fireCallback === true && typeof onChange === 'function') {
            onChange({ latitude: lat, longitude: lng });
        }
    }

    /**
     * Leaflet event triggered when the map has loaded. Sets the leafletMap property.
     * @param {Object} event - The event object containing the map target.
     * @memberof CoordinatesInputComponent
     */
    @action onMapLoaded({ target }) {
        this.leafletMap = target;

        later(
            this,
            () => {
                this.isReady = true;
            },
            300
        );
    }

    /**
     * Ember action to zoom in on the map.
     * @memberof CoordinatesInputComponent
     */
    @action onZoomIn() {
        if (this.leafletMap) {
            this.leafletMap.zoomIn();
        }
    }

    /**
     * Ember action to zoom out on the map.
     * @memberof CoordinatesInputComponent
     */
    @action onZoomOut() {
        if (this.leafletMap) {
            this.leafletMap.zoomOut();
        }
    }

    /**
     * Ember action to handle closing the map or the component. Resets the map coordinates to the current latitude and longitude.
     * @memberof CoordinatesInputComponent
     */
    @action onClose() {
        this.mapLat = this.latitude;
        this.mapLng = this.longitude;
    }

    /**
     * Ember action to set coordinates based on the map's current position.
     * @param {Object} event - The event object containing map details.
     * @memberof CoordinatesInputComponent
     */
    @action setCoordinatesFromMap(event) {
        const { target } = event;
        const { onUpdatedFromMap } = this.args;
        const { lat, lng } = target.getCenter();

        this.updateCoordinates(lat, lng, { updateMap: false });

        if (typeof onUpdatedFromMap === 'function') {
            onUpdatedFromMap({ latitude: lat, longitude: lng });
        }
    }
    
    /**
     * Restricts input to valid float-compatible characters for latitude and longitude fields.
     * Allows numbers, a single dot for decimals, and a minus sign (only at the start).
     * Prevents invalid characters and duplicate dots or misplaced minus signs.
     *
     * @param {KeyboardEvent} event - The keydown event triggered by the input field.
     * @memberof CoordinatesInputComponent
     */
    @action
    allowOnlyFloatKeys(event) {
        const allowedKeys = [
            '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
            '.', '-', 'Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete'
        ];

        if (!allowedKeys.includes(event.key)) {
            event.preventDefault();
        }

        // Prevent duplicate dot
        if (event.key === '.' && event.target.value.includes('.')) {
            event.preventDefault();
        }

        // Prevent invalid minus sign
        if (event.key === '-' && (event.target.selectionStart !== 0 || event.target.value.includes('-'))) {
            event.preventDefault();
        }
    }

    /**
     * Ember action for performing a reverse geolocation lookup. Updates the coordinates based on the lookup query result.
     * @memberof CoordinatesInputComponent
     */
    @action reverseLookup() {
        const { onGeocode, onGeocodeError } = this.args;
        const query = this.lookupQuery;

        if (isBlank(query)) {
            return;
        }

        this.isLoading = true;

        this.fetch
            .get('geocoder/query', { query, single: true })
            .then((place) => {
                if (isBlank(place)) {
                    return;
                }

                const [longitude, latitude] = place.location.coordinates;

                this.updateCoordinates(latitude, longitude);

                if (typeof onGeocode === 'function') {
                    onGeocode(place);
                }
            })
            .catch((error) => {
                if (typeof onGeocodeError === 'function') {
                    onGeocodeError(error);
                }
            })
            .finally(() => {
                this.isLoading = false;
            });
    }
}
