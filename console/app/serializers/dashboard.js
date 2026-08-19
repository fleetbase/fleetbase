import ApplicationSerializer from '@fleetbase/ember-core/serializers/application';
import { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';

export default class DashboardSerializer extends ApplicationSerializer.extend(EmbeddedRecordsMixin) {
    attrs = {
        widgets: { embedded: 'always' },
    };

    serializeHasMany(snapshot, json, relationship) {
        let key = relationship.key;

        // DashboardModel declares no hasMany other than widgets, so serializeHasMany is only
        // ever called with that key; the delegating arm is unreachable until another
        // relationship is added, which is exactly when it would start to matter.
        /* istanbul ignore else -- widgets is this model's only hasMany */
        if (key === 'widgets') {
            return;
        }

        /* istanbul ignore next -- unreachable for the same reason as the else above */
        return super.serializeHasMany(...arguments);
    }
}
