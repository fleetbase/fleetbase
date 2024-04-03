import Model, { attr, belongsTo } from '@ember-data/model';

export default class ChatPresence extends Model {
    /** @ids */
    /** @attributes */
    @attr('boolean') is_online;

    /** @relationships */
    @belongsTo('user', { async: true }) user;
    @belongsTo('chat-channel', { async: true }) chatChannel;

    /** @dates */
    @attr('date') created_at;
    @attr('date') updated_at;
    @attr('date') last_seen_at;
}
