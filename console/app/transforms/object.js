import Transform from '@ember-data/serializer/transform';
import isObject from '@fleetbase/ember-core/utils/is-object';

export default class ObjectTransform extends Transform {
    deserialize(serialized) {
        if (!serialized) {
            return {};
        }

        if (isObject(serialized)) {
            return serialized;
        }

        try {
            return JSON.parse(serialized);
        } catch {
            return {};
        }
    }

    serialize(deserialized) {
        if (!deserialized) {
            return {};
        }

        if (isObject(deserialized)) {
            return deserialized;
        }

        try {
            return JSON.parse(deserialized);
        } catch {
            return {};
        }
    }
}
