import ApplicationSerializer from '@fleetbase/ember-core/serializers/application';
import { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';
import { isBlank } from '@ember/utils';

export default class EntitySerializer extends ApplicationSerializer.extend(EmbeddedRecordsMixin) {
    /**
     * Embedded relationship attributes
     *
     * @var {Object}
     */
    get attrs() {
        return {
            payload: { serialize: 'ids' },
            destination: { embedded: 'always' },
            trackingNumber: { embedded: 'always' },
            driver: { embedded: 'always' },
            photo: { embedded: 'always' },
            supplier: { embedded: 'always' },
            customer: { embedded: 'always' },
        };
    }

    serializeBelongsTo(snapshot, json, relationship) {
        let key = relationship.key;

        if (key === 'payload' || key === 'supplier' || key === 'customer' || key === 'driver') {
            return;
        }

        super.serializeBelongsTo(...arguments);
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

            if (!belongsTo) {
                json[key + '_type'] = null;
            } else {
                json[key + '_type'] = `fleet-ops:${type}`;
            }
        }
    }
}
