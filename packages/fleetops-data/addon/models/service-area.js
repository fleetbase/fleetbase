import Model, { attr, hasMany } from '@ember-data/model';
import { computed } from '@ember/object';
import { format as formatDate, isValid as isValidDate, formatDistanceToNow } from 'date-fns';
import getWithDefault from '@fleetbase/ember-core/utils/get-with-default';
import first from '@fleetbase/ember-core/utils/first';

export default class ServiceAreaModel extends Model {
    /** @ids */
    @attr('string') public_id;
    @attr('string') company_uuid;
    @attr('string') parent_uuid;

    /** @relationships */
    @hasMany('zone', { async: false }) zones;

    /** @attributes */
    @attr('string') name;
    @attr('string') type;
    @attr('string') country;
    @attr('string') color;
    @attr('string') stroke_color;
    @attr('string') status;
    @attr('multi-polygon') border;
    @attr('point') center;

    /** @dates */
    @attr('date') deleted_at;
    @attr('date') created_at;
    @attr('date') updated_at;

    /** @computed */
    @computed('border', 'boundaries') get bounds() {
        const polygon = this.border.get(0);
        const coordinates = getWithDefault(polygon, 'coordinates', []);
        const bounds = first(coordinates);

        return bounds.map((coord) => {
            let [longitude, latitude] = coord;

            return [latitude, longitude];
        });
    }

    @computed('border.coordinates.[]') get boundaries() {
        return getWithDefault(this.border, 'coordinates', []);
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
