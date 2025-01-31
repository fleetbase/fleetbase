import ApplicationSerializer from '@fleetbase/ember-core/serializers/application';
import { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';
import { getProperties, setProperties } from '@ember/object';
import { isBlank } from '@ember/utils';

export default class WaypointSerializer extends ApplicationSerializer.extend(EmbeddedRecordsMixin) {
    /**
     * Embedded relationship attributes
     *
     * @var {Object}
     */
    get attrs() {
        return {
            place: { embedded: 'always' },
            customer: { embedded: 'always' },
            tracking_number: { embedded: 'always' },
        };
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
        // if waypoint is being loaded from a place model,
        // alias the attributes into the place belongsTo relationship
        if (typeof hash?.id === 'string' && hash.id.startsWith('place_')) {
            setProperties(hash, {
                place: {
                    public_id: hash.id,
                    ...getProperties(hash, [
                        'uuid',
                        'name',
                        'address',
                        'address_html',
                        'location',
                        'street1',
                        'street2',
                        'city',
                        'province',
                        'country',
                        'postal_code',
                        'phone',
                        'security_access_code',
                        'building',
                        'district',
                        'neighhborhood',
                    ]),
                },
            });
        }

        return super.normalize(model, hash, prop);
    }

    serializePolymorphicType(snapshot, json, relationship) {
        let key = relationship.key;
        let belongsTo = snapshot.belongsTo(key);
        let type = belongsTo.modelName;

        // if snapshot already has type filled respect manual input
        const isPolymorphicTypeBlank = isBlank(snapshot.attr(key + '_type'));
        if (isPolymorphicTypeBlank) {
            key = this.keyForAttribute ? this.keyForAttribute(key, 'serialize') : key;

            if (!isBlank(belongsTo.attr(`${key}_type`))) {
                type = belongsTo.attr(`${key}_type`);
            }

            // hotfix polymprohpic model types that do not exists as models like `customer-contact` `customer-vendor` should be `contact` or `vendor`
            if (typeof type === 'string') {
                if (type.startsWith('customer-')) {
                    type = type.replace('customer-', '');
                }
                if (type.startsWith('facilitator-')) {
                    type = type.replace('facilitator-', '');
                }
            }

            if (!belongsTo) {
                json[key + '_type'] = null;
            } else {
                json[key + '_type'] = `fleet-ops:${type}`;
            }
        }
    }
}
