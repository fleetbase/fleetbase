import Model, { attr, hasMany, belongsTo } from '@ember-data/model';
import { computed } from '@ember/object';
import { getOwner } from '@ember/application';
import { format as formatDate, formatDistanceToNow, isValid as isValidDate } from 'date-fns';

export default class ChatChannelModel extends Model {
    /** @ids */
    @attr('string') public_id;
    @attr('string') company_uuid;
    @attr('string') created_by_uuid;

    /** @attributes */
    @attr('string') name;
    @attr('string') title;
    @attr('number') unread_count;
    @attr('string') slug;
    @attr('array') feed;
    @attr('array') meta;

    /** @relationships */
    @hasMany('chat-participant', { async: false }) participants;
    @belongsTo('chat-message', { async: false }) last_message;

    /** @dates */
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

    /** @methods */
    toJSON() {
        return {
            company_uuid: this.company_uuid,
            name: this.name,
            meta: this.meta,
        };
    }

    reloadParticipants() {
        const owner = getOwner(this);
        const store = owner.lookup('service:store');

        return store.query('chat-participant', { chat_channel_uuid: this.id }).then((participants) => {
            this.set('participants', participants);
            return participants;
        });
    }

    existsInFeed(type, record) {
        return this.feed.find((_) => _.type === type && _.record.id === record.id) !== undefined;
    }

    doesntExistsInFeed(type, record) {
        return this.feed.find((_) => _.type === type && _.record.id === record.id) === undefined;
    }
}
