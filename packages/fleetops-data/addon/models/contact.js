import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { computed } from '@ember/object';
import { format as formatDate, isValid as isValidDate, formatDistanceToNow } from 'date-fns';

export default class ContactModel extends Model {
    /** @ids */
    @attr('string') public_id;
    @attr('string') company_uuid;
    @attr('string') user_uuid;
    @attr('string') photo_uuid;
    @attr('string') place_uuid;
    @attr('string') internal_id;

    /** @relationships */
    @belongsTo('file') photo;
    @belongsTo('user') user;
    @belongsTo('place') place;
    @hasMany('place') places;

    /** @attributes */
    @attr('string') name;
    @attr('string') title;
    @attr('string') email;
    @attr('string') phone;
    @attr('string') address;
    @attr('string') address_street;
    @attr('string') type;
    @attr('string', {
        defaultValue: 'https://s3.ap-southeast-1.amazonaws.com/flb-assets/static/no-avatar.png',
    })
    photo_url;
    @attr('string') slug;

    /** @dates */
    @attr('date') deleted_at;
    @attr('date') created_at;
    @attr('date') updated_at;

    /** @computed */
    @computed('public_id') get customerId() {
        return this.public_id.replace('contact_', 'customer_');
    }

    @computed('updated_at') get updatedAgo() {
        if (!isValidDate(this.updated_at)) {
            return null;
        }
        return formatDistanceToNow(this.updated_at);
    }

    @computed('updated_at') get updatedAt() {
        if (!isValidDate(this.updated_at)) {
            return null;
        }
        return formatDate(this.updated_at, 'PPP p');
    }

    @computed('updated_at') get updatedAtShort() {
        if (!isValidDate(this.updated_at)) {
            return null;
        }
        return formatDate(this.updated_at, 'dd, MMM');
    }

    @computed('created_at') get createdAgo() {
        if (!isValidDate(this.created_at)) {
            return null;
        }
        return formatDistanceToNow(this.created_at);
    }

    @computed('created_at') get createdAt() {
        if (!isValidDate(this.created_at)) {
            return null;
        }
        return formatDate(this.created_at, 'PPP p');
    }

    @computed('created_at') get createdAtShort() {
        if (!isValidDate(this.created_at)) {
            return null;
        }
        return formatDate(this.created_at, 'dd, MMM');
    }
}
