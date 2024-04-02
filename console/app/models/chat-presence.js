import Model, { attr, belongsTo } from '@ember-data/model';

export default class ChatPresence extends Model {
  /** @attributes */
  @attr('date') lastSeenAt;
  @attr('boolean') isOnline;

  /** @relationships */
  @belongsTo('user', { async: true }) user;
  @belongsTo('chat-channel', { async: true }) chatChannel;

  /** @dates */
  @attr('date') created_at;
  @attr('date') updated_at;
  @attr('date') deleted_at;
}