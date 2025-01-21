import Model, { attr } from '@ember-data/model';
import { computed } from '@ember/object';
import { format as formatDate, isValid as isValidDate, formatDistanceToNow } from 'date-fns';

export default class VehicleDeviceModel extends Model {
    /** @ids */
    @attr('string') vehicle_uuid;
    @attr('string') device_id;

    /** @attributes */
    @attr('string') device_provider;
    @attr('string') device_type;
    @attr('string') device_name;
    @attr('string') device_location;
    @attr('string') device_model;
    @attr('string') manufacturer;
    @attr('string') serial_number;
    @attr('string') data_frequency;
    @attr('string') notes;
    @attr('string') status;
    @attr('boolean') online;
    @attr('raw') meta;
    @attr('raw') data;

    /** @dates */
    @attr('date') installation_date;
    @attr('date') last_maintenance_date;
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
}
