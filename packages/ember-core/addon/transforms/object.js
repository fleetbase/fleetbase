import Transform from '@ember-data/serializer/transform';

export default class ObjectTransform extends Transform {
    deserialize(serialized) {
        return Object.assign({}, serialized);
    }

    serialize(deserialized) {
        return Object.assign({}, deserialized);
    }
}
