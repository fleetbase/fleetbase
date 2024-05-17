import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { computed } from '@ember/object';
import { format as formatDate, formatDistanceToNow, isValid as isValidDate } from 'date-fns';

export default class ChatMessage extends Model {
    /** @ids */
    @attr('string') chat_channel_uuid;
    @attr('string') sender_uuid;

    /** @attributes */
    @attr('string') content;
    @attr('array') attachment_files;

    /** @relationships */
    @belongsTo('chat-participant', { async: false }) sender;
    @hasMany('chat-attachment', { async: false }) attachments;
    @hasMany('chat-receipt', { async: false }) receipts;

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

    /** @methods */
    hasReadReceipt(chatParticipant) {
        return chatParticipant && this.receipts.find((receipt) => chatParticipant.id === receipt.participant_uuid) !== undefined;
    }

    doesntHaveReadReceipt(chatParticipant) {
        return !this.hasReadReceipt(chatParticipant);
    }
}
