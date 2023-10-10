import Model, { attr, hasMany } from '@ember-data/model';
import { computed } from '@ember/object';
import { format, formatDistanceToNow } from 'date-fns';

export default class GroupModel extends Model {
    /** @attributes */
    @attr('string') name;
    @attr('string') description;

    /** @dates */
    @attr('date') created_at;
    @attr('date') updated_at;

    /** @relationships */
    @hasMany('policy') policies;
    @hasMany('permission') permissions;
    @hasMany('user', { async: false }) users;

    /** @computed */
    @computed('users.@each.name') get membersList() {
        return this.users.map((user) => user.name);
    }

    @computed('updated_at') get updatedAgo() {
        return formatDistanceToNow(this.updated_at);
    }

    @computed('updated_at') get updatedAt() {
        return format(this.updated_at, 'PPP p');
    }

    @computed('created_at') get createdAgo() {
        return formatDistanceToNow(this.created_at);
    }

    @computed('created_at') get createdAt() {
        return format(this.created_at, 'PPP p');
    }
}
