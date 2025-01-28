import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { isBlank } from '@ember/utils';
import { isArray } from '@ember/array';
import { later } from '@ember/runloop';
import { debug } from '@ember/debug';
import getWithDefault from '@fleetbase/ember-core/utils/get-with-default';

/**
 * Service for managing and retrieving user location data.
 * It interacts with various sources to provide the most accurate location information.
 *
 * @extends Service
 */
const GeolocationPositionError = window.GeolocationPositionError;
export default class LocationService extends Service {
    /**
     * Default latitude used when location data is unavailable.
     * @type {number}
     * @static
     */
    static DEFAULT_LATITUDE = 1.369;

    /**
     * Default longitude used when location data is unavailable.
     * @type {number}
     * @static
     */
    static DEFAULT_LONGITUDE = 103.8864;

    /**
     * Service for accessing the current user's data.
     * @type {CurrentUserService}
     */
    @service currentUser;

    /**
     * A service for managing application-wide events and states.
     * @type {UniverseService}
     */
    @service universe;

    /**
     * Service for making HTTP requests, with support for caching responses.
     * @type {FetchService}
     */
    @service fetch;

    /**
     * Current latitude of the user.
     * @type {number}
     */
    @tracked latitude = this.DEFAULT_LATITUDE;

    /**
     * Current longitude of the user.
     * @type {number}
     */
    @tracked longitude = this.DEFAULT_LONGITUDE;

    /**
     * Flag indicating whether the user's location has been located.
     * @type {boolean}
     */
    @tracked located = false;

    /**
     * Retrieves the current latitude.
     * @returns {number} The current latitude.
     */
    getLatitude() {
        return this.latitude;
    }

    /**
     * Retrieves the current longitude.
     * @returns {number} The current longitude.
     */
    getLongitude() {
        return this.longitude;
    }

    /**
     * Attempts to fetch the user's location from various sources including cached data,
     * navigator geolocation, or WHOIS data. It first tries to get the cached coordinates.
     * If not available or outdated, it tries the browser's geolocation API.
     * As a fallback, it uses WHOIS data associated with the user's account.
     *
     * @returns {Promise<Object>} A promise that resolves to an object containing latitude and longitude.
     */
    async getUserLocation() {
        // If the location has already been located, return the existing coordinates
        if (this.located) {
            return { latitude: this.latitude, longitude: this.longitude };
        }

        try {
            const coordinates = await this.fetch.cachedGet('fleet-ops/live/coordinates', {}, { expirationInterval: 1, expirationIntervalUnit: 'hour' });

            if (isBlank(coordinates)) {
                return await this.getUserLocationFromNavigator();
            }

            if (isArray(coordinates) && coordinates.length > 0) {
                // Ensure the coordinates array contains valid data
                const validCoordinates = coordinates.find((point) => point.coordinates[0] !== 0 && point.coordinates[1] !== 0);
                if (validCoordinates) {
                    const [longitude, latitude] = validCoordinates.coordinates;
                    this.updateLocation({ latitude, longitude });
                    return { latitude, longitude };
                }
            }

            return await this.getUserLocationFromWhois();
        } catch (error) {
            return await this.getUserLocationFromWhois();
        }
    }

    /**
     * Retrieves the user's location using the browser's navigator geolocation API.
     * If the geolocation is not available, times out, or the user denies permission,
     * it falls back to WHOIS data.
     *
     * @returns {Promise<Object>} A promise that resolves to geolocation coordinates or WHOIS data.
     */
    async getUserLocationFromNavigator() {
        if (window.navigator && window.navigator.geolocation) {
            try {
                const position = await Promise.race([
                    new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(
                            (position) => {
                                resolve(position);
                            },
                            (error) => {
                                reject(error);
                            },
                            {
                                enableHighAccuracy: true,
                                timeout: 5000,
                            }
                        );
                    }),
                    new Promise((_, reject) => later(this, () => reject(new Error('Geolocation request timed out')), 7000)),
                ]);

                const { latitude, longitude } = position.coords;
                this.updateLocation({ latitude, longitude });
                return { latitude, longitude };
            } catch (error) {
                // Handle specific geolocation errors
                if (error instanceof GeolocationPositionError) {
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            debug('LocationService Error: Geolocation permission denied.');
                            break;
                        case error.POSITION_UNAVAILABLE:
                            debug('LocationService Error: Position unavailable.');
                            break;
                        case error.TIMEOUT:
                            debug('LocationService Error: Geolocation request timed out.');
                            break;
                        default:
                            debug('LocationService Error: An unknown geolocation error occurred.');
                            break;
                    }
                } else {
                    debug('LocationService Error: Geolocation request failed:', error.message);
                }
                return await this.getUserLocationFromWhois();
            }
        } else {
            // Navigator geolocation is not available
            return await this.getUserLocationFromWhois();
        }
    }

    /**
     * Retrieves the user's location based on WHOIS data associated with their account.
     * Defaults to predefined coordinates if WHOIS data is not available.
     *
     * @returns {Object} An object containing latitude and longitude from WHOIS data or default values.
     */
    getUserLocationFromWhois() {
        const whois = this.currentUser.getOption('whois', {});
        const coordinates = {
            latitude: getWithDefault(whois, 'latitude', this.DEFAULT_LATITUDE),
            longitude: getWithDefault(whois, 'longitude', this.DEFAULT_LONGITUDE),
        };

        this.updateLocation(coordinates);
        return coordinates;
    }

    /**
     * Updates the service's tracked properties with the new location data.
     * Triggers an event to notify other parts of the application that the user's location has been updated.
     *
     * @param {Object} coordinates - An object containing the latitude and longitude to be set.
     */
    updateLocation({ latitude, longitude }) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.located = true;
        this.universe.trigger('user.located', { latitude, longitude });
    }
}
