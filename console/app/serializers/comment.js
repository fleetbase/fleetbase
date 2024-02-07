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

        super.serializeAttribute(...arguments);
    }

    serializeHasMany(snapshot, json, relationship) {
        let key = relationship.key;
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
