import Model, { attr, belongsTo } from '@ember-data/model';

export default class ChatMessage extends Model {
   /** @attributes */
  @attr('string') content;

   /** @relationships */
  @belongsTo('user', { async: true }) sender;
  @belongsTo('chat-channel', { async: true }) chatChannel;

  /** @dates */
  @attr('date') created_at;
  @attr('date') updated_at;
  @attr('date') deleted_at;
}

