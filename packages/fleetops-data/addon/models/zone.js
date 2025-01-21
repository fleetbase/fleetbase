import Model, { attr, belongsTo } from '@ember-data/model';
import { computed } from '@ember/object';
import { isArray } from '@ember/array';
import { format as formatDate, isValid as isValidDate, formatDistanceToNow } from 'date-fns';
import getWithDefault from '@fleetbase/ember-core/utils/get-with-default';
import first from '@fleetbase/ember-core/utils/first';

export default class ZoneModel extends Model {
    /** @ids */
    @attr('string') public_id;
    @attr('string') service_area_uuid;

    /** @relationships */
    @belongsTo('service-area') service_area;

    /** @attributes */
    @attr('string') name;
    @attr('string') description;
    @attr('string') color;
    @attr('string') stroke_color;
    @attr('string') status;
    @attr('polygon') border;
    @attr('point') center;

    /** @dates */
    @attr('date') deleted_at;
    @attr('date') created_at;
    @attr('date') updated_at;

    /** @computed */
    @computed('border.coordinates', 'isNew') get locations() {
        let coordinates = getWithDefault(this.border, 'coordinates', []);
        let isCoordinatesWrapped = isArray(coordinates) && isArray(coordinates[0]) && coordinates[0].length > 2;
        // hotfix patch when coordinates are wrapped in array
        if (isCoordinatesWrapped) {
            coordinates = first(coordinates);
        }

        if (this.isNew) {
            return coordinates;
        }

        return coordinates.map((coord) => {
            let [longitude, latitude] = coord;

            return [latitude, longitude];
        });
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
