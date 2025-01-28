import { helper } from '@ember/component/helper';
import { isArray } from '@ember/array';

export default helper(function pointToCoordinates([point, format = 'array']) {
    let [longitude, latitude] = [0, 0];

    if (point && isArray(point.coordinates)) {
        [longitude, latitude] = point.coordinates;
    }

    if (format === 'array') {
        return [latitude, longitude];
    }

    if (format === 'latitudelongitude') {
        return { latitude, longitude };
    }

    if (format === 'latlng') {
        return {
            lat: latitude,
            lng: longitude,
        };
    }

    if (format === 'xy') {
        return {
            x: latitude,
            y: longitude,
        };
    }
});
