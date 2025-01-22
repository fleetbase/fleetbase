import RESTSerializer from '@ember-data/serializer/rest';
import { isNone } from '@ember/utils';
import { underscore } from '@ember/string';
import normalizePolymorphicTypeWithinHash from '../utils/serialize/normalize-polymorphic-type-within-hash';

export default class ApplicationSerializer extends RESTSerializer {
    /**
     * Default primary keys to uuid
     *
     * @var {string}
     */
    primaryKey = 'uuid';

    /**
     * keyForPolymorphicType can be used to define a custom key when serializing and deserializing a polymorphic type.
     * By default, the returned key is ${key}Type.
     *
     * @var {String}
     */
    keyForPolymorphicType(key) {
        return `${underscore(key)}_type`;
    }

    /**
     * Customize serializer so that any attributes that are instances of Models or objects
     * that are to accept and ID get serialized into the id only
     *
     * @param {Snapshot} snapshot
     * @param {Object} options
     * @return {Object} json
     */
    serialize(snapshot) {
        const json = super.serialize(...arguments);

        // for each relationship make sure the id is set
        snapshot.eachRelationship((key, relationship) => {
            const { kind } = relationship.meta;

            if (kind === 'belongsTo') {
                const relationSnapshot = snapshot.belongsTo(key);

                key = this.keyForRelationship ? this.keyForRelationship(key, 'belongsTo', 'serialize') : key;

                if (isNone(relationSnapshot)) {
                    return;
                }

                json[`${key}_uuid`] = relationSnapshot.id;
            }
        });

        return json;
    }

    /**
     * Normalizes a part of the JSON payload returned by the server.
     *
     * @method normalize
     * @param {Model} modelClass
     * @param {Object} resourceHash
     * @param {String} prop
     * @return {Object}
     */
    normalize(model, hash, prop) {
        hash = normalizePolymorphicTypeWithinHash(hash);

        return super.normalize(model, hash, prop);
    }
}
