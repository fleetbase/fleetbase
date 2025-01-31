import Transform from '@ember-data/serializer/transform';
import isIterable from '../utils/is-iterable';
import { isArray } from '@ember/array';

export default class ArrayTransform extends Transform {
    deserialize(serialized) {
        if (isArray(serialized)) {
            return serialized;
        }

        if (!isIterable(serialized)) {
            return [];
        }

        return Array.from(serialized);
    }

    serialize(deserialized) {
        if (isArray(deserialized)) {
            return deserialized;
        }

        if (!isIterable(deserialized)) {
            return [];
        }

        return Array.from(deserialized);
    }
}
