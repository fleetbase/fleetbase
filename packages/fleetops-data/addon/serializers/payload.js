import ApplicationSerializer from '@fleetbase/ember-core/serializers/application';
import { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';

export default class PayloadSerializer extends ApplicationSerializer.extend(EmbeddedRecordsMixin) {
    /**
     * Embedded relationship attributes
     *
     * @var {Object}
     */
    get attrs() {
        return {
            pickup: { embedded: 'always' },
            dropoff: { embedded: 'always' },
            return: { embedded: 'always' },
            waypoints: { embedded: 'always' },
            entities: { embedded: 'always' },
        };
    }
}
