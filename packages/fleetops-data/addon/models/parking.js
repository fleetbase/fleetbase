import Model, { attr, belongsTo } from '@ember-data/model';
import { computed } from '@ember/object';
import { getOwner } from '@ember/application';
import { format as formatDate, isValid as isValidDate, formatDistanceToNow } from 'date-fns';
import isRelationMissing from '@fleetbase/ember-core/utils/is-relation-missing';

export default class ParkingModel extends Model {
    /** @ids */
    @attr('string') public_id;
    @attr('string') company_uuid;
    @attr('string') driver_uuid;
    @attr('string') vehicle_uuid;
    @attr('string') reported_by_uuid;

    /** @relationships */
    @belongsTo('driver') driver;
    @belongsTo('vehicle') vehicle;
    @belongsTo('user') reporter;

    /** @attributes */
    @attr('string') reporter_name;
    @attr('string') driver_name;
    @attr('string') vehicle_name;
    @attr('string') report;
    @attr('string') odometer;
    @attr('string') amount;
    @attr('string') currency;
    @attr('string') volume;
    @attr('string', { defaultValue: 'L' }) metric_unit;
    @attr('string') status;
    @attr('array') files;
    @attr('point') location;
    @attr('raw') meta;

    @attr('string') report_type; // report_type: 'Fuel', 'Toll', 'Parking'
    @attr('string') payment_method; // 'Card', 'Other'
    @attr('string') card_type;
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
    loadDriver() {
        const owner = getOwner(this);
        const store = owner.lookup('service:store');

        return new Promise((resolve, reject) => {
            if (isRelationMissing(this, 'driver')) {
                return store
                    .findRecord('driver', this.driver_uuid)
                    .then((driver) => {
                        this.driver = driver;
                        resolve(driver);
                    })
                    .catch(reject);
            }

            resolve(this.driver);
        });
    }

    loadFiles() {
        const owner = getOwner(this);
        const store = owner.lookup('fleet-ops:fuelreports');

        return new Promise((resolve, reject) => {
            if (isRelationMissing(this, 'files')) {
                return store
                    .query('file', {
                        filter: {
                            model: 'fuel-report-files',
                            model_id: this.public_id
                        }
                    })
                    .then((files) => {
                        this.files = files;
                        resolve(files);
                    })
                    .catch(reject);
            }

            resolve(this.files);
        });
    }

}
