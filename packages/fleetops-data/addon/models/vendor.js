import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { computed, get } from '@ember/object';
import { notEmpty } from '@ember/object/computed';
import { capitalize } from '@ember/string';
import { format as formatDate, isValid as isValidDate, formatDistanceToNow } from 'date-fns';
import config from 'ember-get-config';

export default class VendorModel extends Model {
    /** @ids */
    @attr('string') public_id;
    @attr('string') company_uuid;
    @attr('string') type_uuid;
    @attr('string') place_uuid;
    @attr('string') connect_company_uuid;
    @attr('string') logo_uuid;
    @attr('string') internal_id;
    @attr('string') business_id;

    /** @relationships */
    @belongsTo('place') place;
    @hasMany('contact') personnels;

    /** @attributes */
    @attr('string') name;
    @attr('string') email;
    @attr('string') website_url;
    @attr('string', {
        defaultValue: get(config, 'defaultValues.vendorImage'),
    })
    logo_url;
    @attr('string') phone;
    @attr('string') address;
    @attr('string') address_street;
    @attr('string') country;
    @attr('string') status;
    @attr('string') slug;
    @attr('string') type;
    @attr('string') customer_type;
    @attr('string') facilitator_type;
    @attr('raw') meta;
    @attr('raw') callbacks;

    /** @dates */
    @attr('date') deleted_at;
    @attr('date') created_at;
    @attr('date') updated_at;

    /** @computed */
    @notEmpty('place_uuid') has_place;

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

    @computed('type') get prettyType() {
        if (typeof this.type !== 'string') {
            return '';
        }

        return this.type.replace('-', ' ').split(' ').map(capitalize).join(' ');
    }
}
