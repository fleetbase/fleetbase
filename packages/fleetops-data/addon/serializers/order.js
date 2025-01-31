import ApplicationSerializer from '@fleetbase/ember-core/serializers/application';
import { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';
import { isBlank } from '@ember/utils';

export default class OrderSerializer extends ApplicationSerializer.extend(EmbeddedRecordsMixin) {
    /**
     * Embedded relationship attributes
     *
     * @var {Object}
     */
    get attrs() {
        return {
            order_config: { embedded: 'always' },
            payload: { embedded: 'always' },
            driver_assigned: { embedded: 'always' },
            vehicle_assigned: { embedded: 'always' },
            facilitator: { embedded: 'always' },
            customer: { embedded: 'always' },
            transaction: { embedded: 'always' },
            purchase_rate: { embedded: 'always' },
            route: { embedded: 'always' },
            tracking_number: { embedded: 'always' },
            tracking_statuses: { embedded: 'always' },
            files: { embedded: 'always' },
            comments: { embedded: 'always' },
            custom_field_values: { embedded: 'always' },
        };
    }

    /**
     * Serialize the record and remove unwanted attributes.
     *
     * @param {Snapshot} snapshot
     * @param {Object} options
     * @returns {Object}
     */
    serialize(snapshot, options) {
        const json = super.serialize(snapshot, options);
        const unshiftAttributes = [
            'order_config',
            'driver_name',
            'tracking',
            'total_entities',
            'transaction_amount',
            'customer_name',
            'facilitator_name',
            'customer_is_vendor',
            'customer_is_contact',
            'pickup_name',
            'dropoff_name',
            'payload_id',
            'driver_id',
            'created_by_name',
            'updated_by_name',
            'purchase_rate_id',
        ];

        unshiftAttributes.forEach((attr) => {
            delete json[attr];
        });

        return json;
    }

    serializeBelongsTo(snapshot, json, relationship) {
        let key = relationship.key;

        if (key === 'order_config' || key === 'driver_assigned') {
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
