import isLatitude from './is-latitude';
import isLongitude from './is-longitude';

export default function extractCoordinates(coordinates = [], format = 'latlng') {
    let latitude = null,
        longitude = null;

    for (let i = 0; i < coordinates.length; i++) {
        let coord = coordinates[i];

        if (isLatitude(coord) && latitude === null) {
            latitude = coord;
            continue;
        }

        if (isLongitude(coord) && longitude === null) {
            longitude = coord;
            continue;
        }
    }

    if (latitude === null) {
        latitude = 0;
    }

    if (longitude === null) {
        latitude = 0;
    }

    if (format === 'lnglat') {
        return [longitude, latitude];
    }

    return [latitude, longitude];
}
