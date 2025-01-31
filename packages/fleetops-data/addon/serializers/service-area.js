import ApplicationSerializer from '@fleetbase/ember-core/serializers/application';
import { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';

export default class ServiceAreaSerializer extends ApplicationSerializer.extend(EmbeddedRecordsMixin) {
    /**
     * Embedded relationship attributes
     *
     * @var {Object}
     */
    get attrs() {
        return {
            zones: { embedded: 'always' },
        };
    }

    serializeHasMany(snapshot, json, relationship) {
        let key = relationship.key;
        if (key === 'zones') {
            return;
        } else {
            super.serializeHasMany(...arguments);
        }
    }
}
