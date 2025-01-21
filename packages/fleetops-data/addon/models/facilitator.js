import Model, { attr } from '@ember-data/model';
import { computed } from '@ember/object';
import { equal } from '@ember/object/computed';
import { format as formatDate, isValid as isValidDate, formatDistanceToNow } from 'date-fns';

export default class FacilitatorModel extends Model {
    /** @ids */
    @attr('string') public_id;

    /** @attributes */
    @attr('string') name;
    @attr('string') facilitator_type;
    @attr('string') provider;
    @attr('string') photo_url;
    @attr('raw') provider_settings;
    @attr('raw') service_types;
    @attr('raw') supported_countries;

    /** @computed */
    @equal('facilitator_type', 'vendor') isVendor;
    @equal('facilitator_type', 'integrated-vendor') isIntegratedVendor;
    @equal('facilitator_type', 'contact') isContact;

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
