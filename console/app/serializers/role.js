import ApplicationSerializer from '@fleetbase/ember-core/serializers/application';
import { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';

export default class RoleSerializer extends ApplicationSerializer.extend(EmbeddedRecordsMixin) {
    primaryKey = 'id';

    /**
     * Embedded relationship attributes
     *
     * @var {Object}
     */
    get attrs() {
        return {
            policies: { serialize: 'ids', deserialize: 'records' },
            permissions: { serialize: 'ids', deserialize: 'records' },
        };
    }
}
