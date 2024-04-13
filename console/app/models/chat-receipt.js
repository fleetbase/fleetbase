import Model, { attr, belongsTo } from '@ember-data/model';
import { computed } from '@ember/object';
import { format as formatDate, formatDistanceToNow, isValid as isValidDate } from 'date-fns';

export default class ChatReceipt extends Model {
    /** @ids */
    @attr('string') participant_uuid;
    @attr('string') chat_message_uuid;

    /** @relationships */
    @belongsTo('chat-participant', { async: true }) participant;
    @belongsTo('chat-message', { async: true }) chatMessage;

    /** @attributes */
    @attr('string') participant_name;

    /** @dates */
    @attr('date') created_at;
    @attr('date') updated_at;
    @attr('date') read_at;

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

    @computed('read_at') get readAgo() {
        if (!isValidDate(this.read_at)) {
            return null;
        }

        return formatDistanceToNow(this.read_at, { addSuffix: true });
    }

    @computed('read_at') get readAt() {
        if (!isValidDate(this.read_at)) {
            return null;
        }

        return formatDate(this.read_at, 'PP HH:mm');
    }
}
