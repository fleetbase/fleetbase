import Model, { attr } from '@ember-data/model';
import { tracked } from '@glimmer/tracking';
import { computed, get } from '@ember/object';
import { not } from '@ember/object/computed';
import { format as formatDate, isValid as isValidDate, formatDistanceToNow } from 'date-fns';
import isValidCoordinates from '@fleetbase/ember-core/utils/is-valid-coordinates';
import config from 'ember-get-config';

export default class PlaceModel extends Model {
    /** @ids */
    @attr('string') public_id;
    @attr('string') company_uuid;
    @attr('string') vendor_uuid;

    /** @attributes */
    @attr('string') name;
    @attr('string') phone;
    @attr('string') type;
    @attr('string', {
        defaultValue: get(config, 'defaultValues.placeAvatar'),
    })
    avatar_url;
    @attr('string') avatar_value;
    @attr('string') address;
    @attr('string') address_html;
    @attr('string') street1;
    @attr('string') street2;
    @attr('string') city;
    @attr('string') province;
    @attr('string') postal_code;
    @attr('string') neighborhood;
    @attr('string') district;
    @attr('string') building;
    @attr('string') security_access_code;
    @attr('string') country;
    @attr('string') country_name;
    @attr('string') vendor_name;
    @attr('string') _import_id;
    @attr('string') eta;
    @attr('point') location;
    @attr('raw') meta;

    /** @dates */
    @attr('date') deleted_at;
    @attr('date') created_at;
    @attr('date') updated_at;

    /** @tracked */
    @tracked selected = false;

    /** @methods */
    toJSON() {
        return {
            uuid: this.id,
            vendor_uuid: this.vendor_uuid,
            name: this.name,
            phone: this.phone,
            type: this.type,
            address: this.address,
            address_html: this.address_html,
            street1: this.street1,
            street2: this.street2,
            city: this.city,
            province: this.province,
            postal_code: this.postal_code,
            neighborhood: this.neighborhood,
            district: this.district,
            building: this.building,
            security_access_code: this.security_access_code,
            country: this.country,
            country_name: this.country_name,
            vendor_name: this.vendor_name,
            location: this.location,
            meta: this.meta,
            created_at: this.created_at,
            updated_at: this.updated_at,
        };
    }

    /** @computed */
    @computed('location') get longitude() {
        return get(this.location, 'coordinates.0');
    }

    @computed('location') get latitude() {
        return get(this.location, 'coordinates.1');
    }

    @computed('latitude', 'longitude') get coordinates() {
        // eslint-disable-next-line ember/no-get
        return [get(this, 'latitude'), get(this, 'longitude')];
    }

    @computed('latitude', 'longitude') get positionString() {
        // eslint-disable-next-line ember/no-get
        return `${get(this, 'latitude')} ${get(this, 'longitude')}`;
    }

    @computed('latitude', 'longitude') get latlng() {
        return {
            // eslint-disable-next-line ember/no-get
            lat: get(this, 'latitude'),
            // eslint-disable-next-line ember/no-get
            lng: get(this, 'longitude'),
        };
    }

    @computed('latitude', 'longitude') get latitudelongitude() {
        return {
            // eslint-disable-next-line ember/no-get
            latitude: get(this, 'latitude'),
            // eslint-disable-next-line ember/no-get
            longitude: get(this, 'longitude'),
        };
    }

    @computed('coordinates', 'latitude', 'longitude') get hasValidCoordinates() {
        if (this.longitude === 0 || this.latitude === 0) {
            return false;
        }

        return isValidCoordinates(this.coordinates);
    }

    @not('hasValidCoordinates') hasInvalidCoordinates;

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
