import Model, { attr } from '@ember-data/model';
import { computed } from '@ember/object';
import { format as formatDate, isValid as isValidDate, formatDistanceToNow } from 'date-fns';

export default class ServiceRateParcelFeeModel extends Model {
    /** @ids */
    @attr('string') service_rate_uuid;

    /** @attributes */
    @attr('string') size;
    @attr('string') length;
    @attr('string') width;
    @attr('string') height;
    @attr('string') dimensions_unit;
    @attr('string') weight;
    @attr('string') weight_unit;
    @attr('string') fee;
    @attr('string') currency;

    /** @dates */
    @attr('date') deleted_at;
    @attr('date') created_at;
    @attr('date') updated_at;

    /** @computed */
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

    /** @methods */
    toJSON() {
        return {
            service_rate_uuid: this.service_rate_uuid,
            size: this.size,
            length: this.length,
            width: this.width,
            height: this.height,
            dimensions_unit: this.dimensions_unit,
            weight: this.weight,
            weight_unit: this.weight_unit,
            fee: this.fee,
            currency: this.currency,
        };
    }
}
