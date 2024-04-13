import ApplicationSerializer from '@fleetbase/ember-core/serializers/application';
import { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';

export default class ChatMessageSerializer extends ApplicationSerializer.extend(EmbeddedRecordsMixin) {
    /**
     * Embedded relationship attributes
     *
     * @var {Object}
     */
    get attrs() {
        return {
            sender: { embedded: 'always' },
            attachments: { embedded: 'always' },
            receipts: { embedded: 'always' },
        };
    }
}
