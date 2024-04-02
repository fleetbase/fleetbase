import Model, { attr, belongsTo } from '@ember-data/model';

export default class ChatReceipt extends Model {
  /** @attributes */
  @attr('date') readAt;

  /** @relationships */
  @belongsTo('user', { async: true }) user;
  @belongsTo('chat-message', { async: true }) chatMessage;
  
  /** @dates */
  @attr('date') created_at;
  @attr('date') updated_at;
  @attr('date') deleted_at;
}