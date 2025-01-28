import { helper } from '@ember/component/helper';
import Point from '../utils/geojson/point';

export default helper(function pointCoordinates([point]) {
    if (point instanceof Point) {
        return `${point.coordinates[1]} ${point.coordinates[0]}`;
    }

    return 'Invalid coordinates';
});
