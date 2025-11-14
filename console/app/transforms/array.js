import Transform from '@ember-data/serializer/transform';
import { isArray } from '@ember/array';

export default class ArrayTransform extends Transform {
    deserialize(serialized) {
        if (serialized === null || serialized === undefined) {
            return [];
        }

        if (isArray(serialized)) {
            return serialized;
        }

        if (typeof serialized !== 'string') {
            return Array.from(serialized);
        }

        try {
            return JSON.parse(serialized);
        } catch (e) {
            // Fallback: return empty array if parsing fails
            return [];
        }
    }

    serialize(deserialized) {
        if (deserialized === null || deserialized === undefined) {
            return [];
        }

        if (isArray(deserialized)) {
            return deserialized;
        }

        if (typeof deserialized !== 'string') {
            return Array.from(deserialized);
        }

        // Fallback: attempt to parse if it’s a string
        try {
            return JSON.parse(deserialized);
        } catch (e) {
            return [];
        }
    }
}
