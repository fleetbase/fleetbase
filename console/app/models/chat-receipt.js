import Model, { attr, belongsTo } from '@ember-data/model';

export default class ChatReceipt extends Model {
    /** @ids */
    /** @attributes */

    /** @relationships */
    @belongsTo('user', { async: true }) user;
    @belongsTo('chat-message', { async: true }) chatMessage;

    /** @dates */
    @attr('date') created_at;
    @attr('date') updated_at;
    @attr('date') deleted_at;
    @attr('date') read_at;
}
