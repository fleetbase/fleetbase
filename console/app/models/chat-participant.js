import Model, { attr, belongsTo } from '@ember-data/model';
import { computed } from '@ember/object';
import { format as formatDate, formatDistanceToNow, isValid as isValidDate } from 'date-fns';

export default class ChatParticipant extends Model {
    /** @ids */
    @attr('string') user_uuid;
    @attr('string') chat_channel_uuid;

    /** @attributes */
    @attr('string') name;
    @attr('string') username;
    @attr('string') phone;
    @attr('string') email;
    @attr('string') avatar_url;
    @attr('boolean') is_online;

    /** @relationships */
    @belongsTo('user', { async: true }) user;
    @belongsTo('chat-channel', { async: true }) chatChannel;

    /** @dates */
    @attr('date') last_seen_at;
    @attr('date') created_at;
    @attr('date') updated_at;

    /** @computed */
    @computed('updated_at') get updatedAgo() {
        if (!isValidDate(this.updated_at)) {
            return null;
        }

        return formatDistanceToNow(this.updated_at);
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

        return formatDistanceToNow(this.created_at);
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

        return formatDistanceToNow(this.last_seen_at);
    }

    @computed('last_seen_at') get lastSeenAt() {
        if (!isValidDate(this.last_seen_at)) {
            return null;
        }

        return formatDate(this.last_seen_at, 'PP HH:mm');
    }
}
