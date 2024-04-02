import Model, { belongsTo } from '@ember-data/model';

export default class ChatParticipant extends Model {
  /** @relationships */
  @belongsTo('user', { async: true }) user;
  @belongsTo('chat-channel', { async: true }) chatChannel;

  /** @dates */
  @attr('date') created_at;
  @attr('date') updated_at;
  @attr('date') deleted_at;
}