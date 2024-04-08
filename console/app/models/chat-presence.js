import Model, { attr, belongsTo } from '@ember-data/model';
import { computed } from '@ember/object';
import { format, formatDistanceToNow, isValid as isValidDate } from 'date-fns';

export default class ChatPresence extends Model {
    /** @ids */
    @attr('string') participant_uuid;
    @attr('string') chat_channel_uuid;

    /** @attributes */
    @attr('boolean') is_online;

    /** @relationships */
    @belongsTo('chat-participant', { async: true }) participant;
    @belongsTo('chat-channel', { async: true }) chatChannel;

    /** @dates */
    @attr('date') created_at;
    @attr('date') updated_at;
    @attr('date') last_seen_at;

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

    @computed('last_seen_at') get lastSeenAgo() {
        if (!isValidDate(this.last_seen_at)) {
            return null;
        }

        return formatDistanceToNow(this.last_seen_at, { addSuffix: true });
    }

    @computed('last_seen_at') get lastSeenAt() {
        if (!isValidDate(this.last_seen_at)) {
            return null;
        }

        return formatDate(this.last_seen_at, 'PP HH:mm');
    }
}
