import Model, { attr, belongsTo } from '@ember-data/model';
import { computed } from '@ember/object';
import { getOwner } from '@ember/application';
import { format, formatDistanceToNow } from 'date-fns';
import autoSerialize from '../utils/auto-serialize';

export default class Company extends Model {
    /** @ids */
    @attr('string') uuid;
    @attr('string') public_id;
    @attr('string') owner_uuid;
    @attr('string') logo_uuid;
    @attr('string') backdrop_uuid;
    @attr('string') place_uuid;

    /** @relationships */
    @belongsTo('user') owner;
    @belongsTo('file') logo;
    @belongsTo('file') backdrop;

    /** @attributes */
    @attr('string') name;
    @attr('string') website_url;
    @attr('string') logo_url;
    @attr('string') backdrop_url;
    @attr('string') description;
    @attr('raw') options;
    @attr('number') users_count;
    @attr('string') type;
    @attr('string') currency;
    @attr('string') country;
    @attr('string') timezone;
    @attr('string') phone;
    @attr('string') status;
    @attr('string') slug;

    /** @dates */
    @attr('date') joined_at;
    @attr('date') deleted_at;
    @attr('date') created_at;
    @attr('date') updated_at;

    /** @computed */
    @computed('phone_country_code', 'country') get phoneCountryCode() {
        return this.phone_country_code || this.country;
    }

    @computed('updated_at') get updatedAgo() {
        return formatDistanceToNow(this.updated_at);
    }

    @computed('updated_at') get updatedAt() {
        return format(this.updated_at, 'yyyy-MM-dd HH:mm');
    }

    @computed('updated_at') get updatedAtShort() {
        return format(this.updated_at, 'PP');
    }

    @computed('created_at') get createdAgo() {
        return formatDistanceToNow(this.created_at);
    }

    @computed('created_at') get createdAt() {
        return format(this.created_at, 'yyyy-MM-dd HH:mm');
    }

    @computed('created_at') get createdAtShort() {
        return format(this.created_at, 'PP');
    }

    /** @methods */
    toJSON() {
        return autoSerialize(this);
    }

    async transferOwnership(newOwner, params = {}) {
        const owner = getOwner(this);
        const fetch = owner.lookup('service:fetch');

        return fetch.post('companies/transfer-ownership', { company: this.id, newOwner, ...params });
    }

    async leave(user = null, params = {}) {
        const owner = getOwner(this);
        const fetch = owner.lookup('service:fetch');

        return fetch.post('companies/leave', { company: this.id, user, ...params });
    }

    async loadUsers(params = {}) {
        const owner = getOwner(this);
        const fetch = owner.lookup('service:fetch');

        try {
            const users = await fetch.get(`companies/${this.id}/users`, { ...params }, { normalizeToEmberData: true, normalizeModelType: 'user' });
            this.set('users', users);
            return users;
        } catch (error) {
            this.set('users', []);
            return [];
        }
    }
}
