import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { computed, get } from '@ember/object';
import { not } from '@ember/object/computed';
import { getOwner } from '@ember/application';
import { format as formatDate, isValid as isValidDate, formatDistanceToNow } from 'date-fns';
import isRelationMissing from '@fleetbase/ember-core/utils/is-relation-missing';
import isValidCoordinates from '@fleetbase/ember-core/utils/is-valid-coordinates';
import config from 'ember-get-config';

export default class DriverModel extends Model {
    /** @ids */
    @attr('string') public_id;
    @attr('string') company_uuid;
    @attr('string') user_uuid;
    @attr('string') vehicle_uuid;
    @attr('string') vendor_uuid;
    @attr('string') current_job_uuid;
    @attr('string') photo_uuid;
    @attr('string') vehicle_id;
    @attr('string') vendor_id;
    @attr('string') current_job_id;
    @attr('string') internal_id;

    /** @relationships */
    @belongsTo('user', { async: true }) user;
    @hasMany('fleet', { async: true }) fleets;
    @hasMany('user-device', { async: true }) devices;
    @hasMany('order', { async: true }) jobs;
    @belongsTo('vehicle', { async: true }) vehicle;
    @belongsTo('order', { async: true }) current_job;
    @belongsTo('vendor', { async: true }) vendor;

    /** @attributes */
    @attr('string') name;
    @attr('string') phone;
    @attr('string') email;
    @attr('string', {
        defaultValue: get(config, 'defaultValues.driverImage'),
    })
    photo_url;
    @attr('string') vehicle_name;
    @attr('string', {
        defaultValue: get(config, 'defaultValues.vehicleImage'),
    })
    vehicle_avatar;
    @attr('string') vendor_name;
    @attr('string') drivers_license_number;
    @attr('string', {
        defaultValue: get(config, 'defaultValues.driverAvatar'),
    })
    avatar_url;
    @attr('string') avatar_value;
    @attr('point') location;
    @attr('number') heading;
    @attr('string') country;
    @attr('string') city;
    @attr('string') status;
    @attr('boolean') online;
    @attr('boolean') is_available;
    @attr('string') availability_message;
    @attr('string') button_message;
    @attr('boolean') have_no_vehicle;
    /** @dates */
    @attr('date') deleted_at;
    @attr('date') created_at;
    @attr('date') updated_at;

    /** @computed */
    @computed('photo_url') get photoUrl() {
        if (!this.photo_url) {
            return get(config, 'defaultValues.driverImage');
        }

        return this.photo_url;
    }

    @computed('name', 'public_id') get displayName() {
        if (!this.name) {
            return this.public_id;
        }

        return this.name;
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

    @computed('jobs.@each.status') get activeJobs() {
        return this.jobs.filter((order) => !['completed', 'canceled'].includes(order.status));
    }

    /** @methods */
    loadVehicle() {
        const owner = getOwner(this);
        const store = owner.lookup('service:store');

        return new Promise((resolve, reject) => {
            if (isRelationMissing(this, 'vehicle')) {
                return store
                    .findRecord('vehicle', this.vehicle_uuid)
                    .then((vehicle) => {
                        this.vehicle = vehicle;
                        resolve(vehicle);
                    })
                    .catch(reject);
            }

            resolve(this.vehicle);
        });
    }

    loadVendor() {
        const owner = getOwner(this);
        const store = owner.lookup('service:store');

        return new Promise((resolve, reject) => {
            if (isRelationMissing(this, 'vendor')) {
                return store
                    .findRecord('vendor', this.vendor_uuid)
                    .then((vendor) => {
                        this.vendor = vendor;
                        resolve(vendor);
                    })
                    .catch(reject);
            }

            resolve(this.vendor);
        });
    }
}
