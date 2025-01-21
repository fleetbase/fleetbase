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
            driver: { embedded: 'always' },
            vendor: { embedded: 'always' },
            devices: { embedded: 'always' },
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
}
