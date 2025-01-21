import ContactModel from './contact';
import { attr, hasMany } from '@ember-data/model';
import { computed } from '@ember/object';
import { equal } from '@ember/object/computed';
import { format as formatDate, isValid as isValidDate, formatDistanceToNow } from 'date-fns';

export default class CustomerModel extends ContactModel {
    /** @attributes */
    @attr('string') name;
    @attr('string') customer_type;

    /** @relations */
    @hasMany('waypoint') waypoints;

    /** @computed */
    @equal('customer_type', 'vendor') isVendor;
    @equal('customer_type', 'contact') isContact;

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
