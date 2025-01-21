import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { computed } from '@ember/object';
import { format as formatDate, isValid as isValidDate, formatDistanceToNow } from 'date-fns';

export default class FleetModel extends Model {
    /** @ids */
    @attr('string') public_id;
    @attr('string') company_uuid;
    @attr('string') image_uuid;
    @attr('string') service_area_uuid;
    @attr('string') zone_uuid;
    @attr('string') vendor_uuid;
    @attr('string') parent_fleet_uuid;

    /** @relationships */
    @belongsTo('vendor') vendor;
    @belongsTo('service-area') service_area;
    @belongsTo('zone') zone;
    @belongsTo('fleet', { inverse: 'subfleets', async: false }) parent_fleet;
    @hasMany('fleet', { inverse: 'parent_fleet' }) subfleets;
    @hasMany('driver') drivers;
    @hasMany('vehicle') vehicles;

    /** @attributes */
    @attr('number') drivers_count;
    @attr('number') drivers_online_count;
    @attr('number') vehicles_count;
    @attr('number') vehicles_online_count;
    @attr('string') photo_url;
    @attr('string') name;
    @attr('string') color;
    @attr('string') task;
    @attr('string') status;
    @attr('string') slug;

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
}
