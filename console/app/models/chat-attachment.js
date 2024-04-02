import Model, { attr, belongsTo } from '@ember-data/model';

export default class ChatAttachment extends Model {
    /** @ids */
    @attr('string') chat_channel_uuid;
    @attr('string') sender_uuid;
    @attr('string') file_uuid;

    /** @relationships */
    @belongsTo('user', { async: true }) sender;
    @belongsTo('chat-channel', { async: true }) chatChannel;
    @belongsTo('file', { async: true }) file;

    /** @attributes */
    @attr('string') chat_channel_uuid;
    @attr('string') sender_uuid;
    @attr('string') file_uuid;

    /** @dates */
    @attr('date') created_at;

}
