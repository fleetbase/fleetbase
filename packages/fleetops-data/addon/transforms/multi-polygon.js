import Transform from '@ember-data/serializer/transform';
import MultiPolygon from '../utils/geojson/multi-polygon';
import { isNone } from '@ember/utils';

export default class MultiPolygonTransform extends Transform {
    deserialize(serialized) {
        if (isNone(serialized)) {
            return serialized;
        }

        return new MultiPolygon(serialized);
    }

    serialize(deserialized) {
        if (isNone(deserialized)) {
            return deserialized;
        }

        return new MultiPolygon(deserialized);
    }
}
