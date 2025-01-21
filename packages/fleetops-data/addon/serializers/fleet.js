import ApplicationSerializer from '@fleetbase/ember-core/serializers/application';
import { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';

export default class FleetSerializer extends ApplicationSerializer.extend(EmbeddedRecordsMixin) {
    /**
     * Embedded relationship attributes
     *
     * @var {Object}
     */
    get attrs() {
        return {
            vendor: { embedded: 'always' },
            parent_fleet: { embedded: 'always' },
            subfleets: { embedded: 'always' },
            service_area: { embedded: 'always' },
            zone: { embedded: 'always' },
            drivers: { embedded: 'always' },
            vehicles: { embedded: 'always' },
        };
    }

    serializeBelongsTo(snapshot, json, relationship) {
        let key = relationship.key;

        if (key === 'parent_fleet') {
            return;
        }

        return super.serializeBelongsTo(...arguments);
    }
}
