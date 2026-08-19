import ApplicationSerializer from '@fleetbase/ember-core/serializers/application';
import { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';

export default class CategorySerializer extends ApplicationSerializer.extend(EmbeddedRecordsMixin) {
    /**
     * Embedded relationship attributes
     *
     * @var {Object}
     */
    get attrs() {
        return {
            parent: { embedded: 'always' },
            subcategories: { embedded: 'always' },
            icon_file: { embedded: 'always' },
        };
    }

    serializeBelongsTo(snapshot, json, relationship) {
        let key = relationship.key;

        if (key === 'parent') {
            return;
        }

        return super.serializeBelongsTo(...arguments);
    }

    serializeHasMany(snapshot, json, relationship) {
        let key = relationship.key;

        // CategoryModel declares no hasMany other than subcategories, so serializeHasMany is only
        // ever called with that key; the delegating arm is unreachable until another
        // relationship is added, which is exactly when it would start to matter.
        /* istanbul ignore else -- subcategories is this model's only hasMany */
        if (key === 'subcategories') {
            return;
        }

        /* istanbul ignore next -- unreachable for the same reason as the else above */
        return super.serializeHasMany(...arguments);
    }
}
