import Model, { attr, belongsTo } from '@ember-data/model';
import { computed } from '@ember/object';
import { getOwner } from '@ember/application';
import { format as formatDate, isValid as isValidDate, formatDistanceToNow } from 'date-fns';
import isRelationMissing from '@fleetbase/ember-core/utils/is-relation-missing';

export default class IssueModel extends Model {
    /** @ids */
    @attr('string') public_id;
    @attr('string') issue_id;
    @attr('string') company_uuid;
    @attr('string') reported_by_uuid;
    @attr('string') assigned_to_uuid;
    @attr('string') driver_uuid;
    @attr('string') vehicle_uuid;

    /** @relationships */
    @belongsTo('user') reporter;
    @belongsTo('user') assignee;
    @belongsTo('vehicle') vehicle;
    @belongsTo('driver') driver;

    /** @attributes */
    @attr('string') driver_name;
    @attr('string') vehicle_name;
    @attr('string') assignee_name;
    @attr('string') reporter_name;
    @attr('string') type;
    @attr('string') category;
    @attr('string') report;
    @attr('string') priority;
    @attr('string') status;
    @attr('point') location;
    @attr('raw') tags;
    @attr('raw') meta;

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
}
