import ApplicationSerializer from '@fleetbase/ember-core/serializers/application';
import { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';

export default class DashboardSerializer extends ApplicationSerializer.extend(EmbeddedRecordsMixin) {
    attrs = {
        widgets: { embedded: 'always' },
    };

    serializeHasMany(snapshot, json, relationship) {
        let key = relationship.key;

        if (key === 'widgets') {
            return;
        }

        return super.serializeHasMany(...arguments);
    }
}
