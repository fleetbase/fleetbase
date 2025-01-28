import { helper } from '@ember/component/helper';
import { isArray } from '@ember/array';

export default helper(function formatPoint([point]) {
    // array assumes  [latitude, longitude]
    if (isArray(point)) {
        return `(${point[0]}, ${point[1]})`;
    }

    let [longitude, latitude] = [0, 0];
    if (point && isArray(point.coordinates)) {
        [longitude, latitude] = point.coordinates;
    }

    return `(${latitude}, ${longitude})`;
});
