import Model, { attr, belongsTo } from '@ember-data/model';
import { computed } from '@ember/object';
import { format, formatDistanceToNow, isValid as isValidDate } from 'date-fns';

export default class ChatMessage extends Model {
    /** @ids */
    @attr('string') chat_channel_uuid;
    @attr('string') sender_uuid;

    /** @attributes */
    @attr('string') content;

    /** @relationships */
    @belongsTo('chat-participant', { async: false }) sender;

    /** @dates */
    @attr('date') created_at;
    @attr('date') updated_at;

    /** @computed */
    @computed('updated_at') get updatedAgo() {
        if (!isValidDate(this.updated_at)) {
            return null;
        }

        return formatDistanceToNow(this.updated_at, { addSuffix: true });
    }

    @computed('updated_at') get updatedAt() {
        if (!isValidDate(this.updated_at)) {
            return null;
        }

        return formatDate(this.updated_at, 'PP HH:mm');
    }

    @computed('created_at') get createdAgo() {
        if (!isValidDate(this.created_at)) {
            return null;
        }

        return formatDistanceToNow(this.created_at, { addSuffix: true });
    }

    @computed('created_at') get createdAt() {
        if (!isValidDate(this.created_at)) {
            return null;
        }

        return formatDate(this.created_at, 'PP HH:mm');
    }
}