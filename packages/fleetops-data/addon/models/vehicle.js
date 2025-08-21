import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { get, computed } from '@ember/object';
import { not } from '@ember/object/computed';
import { format as formatDate, isValid as isValidDate, formatDistanceToNow } from 'date-fns';
import { getOwner } from '@ember/application';
import isRelationMissing from '@fleetbase/ember-core/utils/is-relation-missing';
import isValidCoordinates from '@fleetbase/ember-core/utils/is-valid-coordinates';
import config from 'ember-get-config';

export default class VehicleModel extends Model {
    /** @ids */
    @attr('string') uuid;
    @attr('string') public_id;
    @attr('string') company_uuid;
    @attr('string') photo_uuid;
    @attr('string') vendor_uuid;
    @attr('boolean') online;
    @attr('array') fleet_uuid;

    /** @relationships */
    @belongsTo('driver', { async: false }) driver;
    @belongsTo('vendor', { async: false }) vendor;
    @hasMany('vehicle-device', { async: false }) devices;

    /** @attributes */
    @attr('string', {
        defaultValue: get(config, 'defaultValues.vehicleImage'),
    })
    photo_url;
    @attr('number') is_vehicle_available;
    @attr('string') driver_name;
    @attr('string') vendor_name;
    @attr('string') display_name;
    @attr('string', {
        defaultValue: get(config, 'defaultValues.vehicleAvatar'),
    })
    avatar_url;
    @attr('string') avatar_value;
    @attr('point') location;
    @attr('string') make;
    @attr('string') model;
    @attr('string') year;
    @attr('string') trim;
    @attr('string') type;
    @attr('string') plate_number;
    @attr('array') fleet_vehicles;
    @attr('string') vin;
    @attr('raw') vin_data;
    @attr('raw') model_data;
    @attr('raw') telematics;
    @attr('raw') meta;
    @attr('string') status;
    @attr('string') slug;

    /** @dates */
    @attr('date') deleted_at;
    @attr('date') created_at;
    @attr('date') updated_at;

    /** @computed */
    @computed('year', 'make', 'model', 'trim', 'plate_number', 'internal_id') get displayName() {
        const nameSegments = [this.year, this.make, this.model, this.trim, this.plate_number, this.internal_id];
        return nameSegments.filter(Boolean).join(' ').trim();
    }

    @computed('plate_number', 'model') get plateNumberModel() {
        const segments = [this.plate_number, this.model];
        return segments.filter(segment => segment != null && segment !== '').join(' ').trim();
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

    @computed('fleet_vehicles.@each.fleet')
    get fleetNames() {
        return (this.fleet_vehicles || [])
            .map(fv => fv.fleet?.name)
            .filter(Boolean)
            .join(', ');
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

    /** @methods */
    loadDriver() {
        const owner = getOwner(this);
        const store = owner.lookup('service:store');

        return new Promise((resolve) => {
            if (isRelationMissing(this, 'driver')) {
                return store
                    .findRecord('driver', this.driver_uuid)
                    .then((driver) => {
                        this.driver = driver;

                        resolve(driver);
                    })
                    .catch(() => {
                        resolve(null);
                    });
            }

            resolve(this.driver);
        });
    }
    loadDevices() {
        const owner = getOwner(this);
        const store = owner.lookup('service:store');

        return new Promise((resolve, reject) => {
            return store
                .findRecord('vehicle-device', { vehicle_uuid: this.id })
                .then((devices) => {
                    this.vehicle_devices = devices;

                    resolve(devices);
                })
                .catch(reject);
        });
    }
}
