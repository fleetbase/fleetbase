import Model, { attr, belongsTo } from '@ember-data/model';
import { getOwner } from '@ember/application';
import { computed } from '@ember/object';
import { format as formatDate, formatDistanceToNow, isValid as isValidDate } from 'date-fns';
import isVideoFile from '@fleetbase/ember-core/utils/is-video-file';
import isImageFile from '@fleetbase/ember-core/utils/is-image-file';
import config from '@fleetbase/console/config/environment';

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
    @attr('string') url;
    @attr('string') filename;
    @attr('string') content_type;

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

    @computed('content_type') get isVideo() {
        return isVideoFile(this.content_type);
    }

    @computed('content_type') get isImage() {
        return isImageFile(this.content_type);
    }

    /** @methods */
    downloadFromApi() {
        window.open(config.api.host + '/' + config.api.namespace + '/files/download?file=' + this.file_uuid, '_self');
    }

    download() {
        const owner = getOwner(this);
        const fetch = owner.lookup('service:fetch');

        return fetch.download('files/download', { file: this.file_uuid }, { fileName: this.filename, mimeType: this.content_type });
    }
}
