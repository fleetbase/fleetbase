import Model, { attr, hasMany } from '@ember-data/model';
import { computed } from '@ember/object';
import { slugify } from 'ember-string';

export default class ChatChannel extends Model {
  /** @attributes */
  @attr('string') name;
  @attr('string') slug;
  @attr meta;

  /** @relationships */
  @hasMany('chat-participant', { async: true }) participants;
  @hasMany('chat-message', { async: true }) messages;
  @hasMany('chat-attachment', { async: true }) attachments;
  @hasMany('chat-presence', { async: true }) presences;

  /** @computed */
  @computed('name') get slugifiedName() {
    return slugify(this.name);
  }

  /** @dates */
  @attr('date') created_at;
  @attr('date') updated_at;
  @attr('date') deleted_at;
}
