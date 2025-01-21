import Transform from '@ember-data/serializer/transform';
import Point from '../utils/geojson/point';
import { isNone } from '@ember/utils';

export default class PointTransform extends Transform {
    deserialize(serialized) {
        if (isNone(serialized)) {
            return new Point(0, 0);
        }

        return new Point(serialized);
    }

    serialize(deserialized) {
        if (isNone(deserialized)) {
            return new Point(0, 0);
        }

        return new Point(deserialized);
    }
}
