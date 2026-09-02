import ApplicationSerializer from '@fleetbase/ember-core/serializers/application';
import { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';

export default class CommentSerializer extends ApplicationSerializer.extend(EmbeddedRecordsMixin) {
    /**
     * Embedded relationship attributes
     *
     * @var {Object}
     */
    get attrs() {
        return {
            author: { embedded: 'always' },
            parent: { embedded: 'always' },
            replies: { embedded: 'always' },
        };
    }

    serializeAttribute(snapshot, json, key) {
        if (key === 'editable') {
            return;
        }

        if (key === 'subject_id') {
            return;
        }

        super.serializeAttribute(...arguments);
    }

    serializeHasMany(snapshot, json, relationship) {
        let key = relationship.key;
        // CommentModel declares no hasMany other than replies, so serializeHasMany is only
        // ever called with that key; the delegating arm is unreachable until another
        // relationship is added, which is exactly when it would start to matter.
        /* istanbul ignore else -- replies is this model's only hasMany */
        if (key === 'replies') {
            return;
        } else {
            super.serializeHasMany(...arguments);
        }
    }

    serializeBelongsTo() {
        return;
    }
}
