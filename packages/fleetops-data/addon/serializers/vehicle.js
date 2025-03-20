import ApplicationSerializer from '@fleetbase/ember-core/serializers/application';
import { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';

export default class VehicleSerializer extends ApplicationSerializer.extend(EmbeddedRecordsMixin) {
    /**
     * Embedded relationship attributes
     *
     * @var {Object}
     */
    get attrs() {
        return {
            driver: { embedded: 'always', serialize: false },  // Add serialize: false
            vendor: { embedded: 'always' },
            devices: { embedded: 'always' },
            driver_uuid: { serialize: false }  // Also exclude driver_uuid from serialization
        };
    }

    serializeBelongsTo(snapshot, json, relationship) {
        let key = relationship.key;

        if (key === 'driver') {
            return;
        } else {
            super.serializeBelongsTo(...arguments);
        }
    }

    // You might also need to exclude driver_uuid from the JSON
    serialize(snapshot, options) {
        let json = super.serialize(snapshot, options);
        
        // Remove driver_uuid from the serialized data
        delete json.driver_uuid;
        
        return json;
    }
}