import { isArray } from '@ember/array';
import isLatitude from './is-latitude';
import isLongitude from './is-longitude';
import isObject from './is-object';

/**
 * Validates coordinates
 *
 * ```
 * isValidCoordinates([0, 0]);
 * isValidCoordinates({lat: 0, lng: 0});
 * isValidCoordinates({latitude: 0, longitude: 0});
 * isValidCoordinates(0, 0);
 * ```
 *
 * @param {Array|Object|Integer} latitude
 * @param {Array|Object|Integer} longitude
 */
export default function isValidCoordinates(latitude, longitude = null) {
    let testLatitude, testLongitude;

    if (isArray(latitude) && longitude === null) {
        testLatitude = latitude[0];
        testLongitude = latitude[1];
    }

    if (!isArray(latitude) && isObject(latitude) && longitude === null) {
        testLatitude = latitude.lat || latitude.latitude;
        testLongitude = latitude.lng || latitude.longitude;
    }

    if (longitude !== null) {
        testLatitude = latitude;
        testLongitude = longitude;
    }

    return isLatitude(testLatitude) && isLongitude(testLongitude);
}
