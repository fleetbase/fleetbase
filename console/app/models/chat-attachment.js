import Model, { attr, belongsTo } from '@ember-data/model';
import { getOwner } from '@ember/application';
import { computed } from '@ember/object';
import { format, formatDistanceToNow, isValid as isValidDate } from 'date-fns';

export default class ChatAttachment extends Model {
    /** @ids */
    @attr('string') chat_channel_uuid;
    @attr('string') sender_uuid;
    @attr('string') file_uuid;
    @attr('string') chat_message_uuid;

    /** @relationships */
    @belongsTo('user', { async: true }) sender;
    @belongsTo('chat-channel', { async: true }) chatChannel;
    @belongsTo('file', { async: true }) file;

    /** @attributes */
    @attr('string') chat_channel_uuid;
    @attr('string') sender_uuid;
    @attr('string') file_uuid;
    @attr('string') url;

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
    downloadFromApi() {
        window.open(ENV.api.host + '/' + ENV.api.namespace + '/files/download?file=' + this.file_uuid, '_self');
    }

    download() {
        const owner = getOwner(this);
        const fetch = owner.lookup(`service:store`);

        return fetch.download('files/download', { file: this.file_uuid });
    }
}
