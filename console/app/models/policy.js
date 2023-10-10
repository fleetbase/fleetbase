import Model, { attr, hasMany } from '@ember-data/model';
import { computed } from '@ember/object';
import { format, formatDistanceToNow } from 'date-fns';

export default class PolicyModel extends Model {
    /** @ids */
    @attr('string') company_uuid;

    /** @relationships */
    @hasMany('permission') permissions;

    /** @attributes */
    @attr('string') name;
    @attr('string') type;
    @attr('string') guard_name;
    @attr('string') description;
    @attr('boolean') is_mutable;
    @attr('boolean') is_deletable;

    /** @dates */
    @attr('date') created_at;
    @attr('date') updated_at;

    /** @methods */
    toJSON() {
        return this.serialize();
    }

    /** @computed */
    @computed('permissions') get permissionsArray() {
        return this.permissions.toArray();
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
