import Transform from '@ember-data/serializer/transform';
import Polygon from '../utils/geojson/polygon';
import { isNone } from '@ember/utils';

export default class PolygonTransform extends Transform {
    deserialize(serialized) {
        if (isNone(serialized)) {
            return serialized;
        }

        return new Polygon(serialized);
    }

    serialize(deserialized) {
        if (isNone(deserialized)) {
            return deserialized;
        }

        return new Polygon(deserialized);
    }
}
