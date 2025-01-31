import ApplicationSerializer from '@fleetbase/ember-core/serializers/application';
import { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';

export default class ServiceRateSerializer extends ApplicationSerializer.extend(EmbeddedRecordsMixin) {
    /**
     * Embedded relationship attributes
     *
     * @var {Object}
     */
    get attrs() {
        return {
            zone: { embedded: 'always' },
            service_area: { embedded: 'always' },
            parcel_fees: { embedded: 'always' },
            rate_fees: { embedded: 'always' },
        };
    }
}
