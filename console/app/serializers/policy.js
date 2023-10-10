import ApplicationSerializer from '@fleetbase/ember-core/serializers/application';
import { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';

export default class PolicySerializer extends ApplicationSerializer.extend(EmbeddedRecordsMixin) {
    primaryKey = 'id';

    /**
     * Embedded relationship attributes
     *
     * @var {Object}
     */
    get attrs() {
        return {
            permissions: { serialize: 'ids', deserialize: 'records' },
        };
    }
}
