import ApplicationSerializer from '@fleetbase/ember-core/serializers/application';
import { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';

export default class GroupSerializer extends ApplicationSerializer.extend(EmbeddedRecordsMixin) {
    /**
     * Embedded relationship attributes
     *
     * @var {Object}
     */
    get attrs() {
        return {
            users: { serialize: 'ids', deserialize: 'records' },
            permissions: { serialize: 'ids', deserialize: 'records' },
            policies: { serialize: 'ids', deserialize: 'records' },
        };
    }
}
