import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { computed } from '@ember/object';
import { notEmpty } from '@ember/object/computed';
import { format as formatDate, isValid as isValidDate, formatDistanceToNow } from 'date-fns';

export default class PayloadModel extends Model {
    /** @ids */
    @attr('string') public_id;
    @attr('string') current_waypoint_uuid;
    @attr('string') pickup_uuid;
    @attr('string') dropoff_uuid;
    @attr('string') return_uuid;

    /** @relationships */
    @belongsTo('place', { async: false }) pickup;
    @belongsTo('place', { async: false }) dropoff;
    @belongsTo('place', { async: false }) return;
    @hasMany('waypoint', { async: false }) waypoints;
    @hasMany('entity', { async: false }) entities;

    /** @attributes */
    @attr('string') meta;
    @attr('string') cod_amount;
    @attr('string') cod_currency;
    @attr('string') cod_payment_method;
    @attr('string') type;
    @attr('date') deleted_at;
    @attr('date') created_at;
    @attr('date') updated_at;
    @attr({ defaultValue: () => [] }) route_segments;

    /** @computed */
    @notEmpty('entities') hasEntities;
    @notEmpty('waypoints') hasWaypoints;
    @notEmpty('pickup_uuid') hasPickup;
    @notEmpty('dropoff_uuid') hasDropoff;
    @notEmpty('return_uuid') hasReturn;

    @computed('waypoints.[]', 'pickup_uuid', 'dropoff_uuid') get isMultiDrop() {
        return this.waypoints.length > 0 && !this.pickup_uuid && !this.dropoff_uuid;
    }

    @computed('waypoints.firstObject') get firstWaypoint() {
        return this.waypoints.firstObject;
    }

    @computed('waypoints.{lastObject,length}') get lastWaypoint() {
        if (1 >= this.waypoints.length) {
            return null;
        }

        return this.waypoints.lastObject;
    }

    @computed('current_waypoint_uuid', 'waypoints.@each.id') get currentWaypoint() {
        return this.waypoints.find((waypoint) => waypoint.id === this.current_waypoint_uuid);
    }

    @computed('currentWaypoint', 'firstWaypoint', 'isMultiDrop', 'dropoff') get nextStop() {
        const { currentWaypoint, firstWaypoint, isMultiDrop, dropoff } = this;

        if (isMultiDrop) {
            return currentWaypoint ?? firstWaypoint;
        }

        return dropoff;
    }

    // eslint-disable-next-line ember/use-brace-expansion
    @computed('waypoints.[]', 'waypoints.@each.id') get middleWaypoints() {
        const waypoints = this.waypoints;
        const middleWaypoints = waypoints.slice(1, waypoints.length - 1);

        return middleWaypoints;
    }

    @computed('entities', 'model.payload.{entities.[],waypoints.[]}', 'waypoints') get entitiesByDestination() {
        const groups = [];

        // create groups
        this.waypoints.forEach((waypoint) => {
            const destinationId = waypoint.id;
            if (destinationId) {
                const entities = this.entities.filter((entity) => entity.destination_uuid === destinationId);
                if (entities.length === 0) {
                    return;
                }

                const group = {
                    destinationId,
                    waypoint,
                    entities,
                };

                groups.pushObject(group);
            }
        });

        return groups;
    }

    @computed('model.payload.waypoints', 'waypoints.toArray') get orderWaypoints() {
        if (this.waypoints && typeof this.waypoints.toArray === 'function') {
            return this.waypoints.toArray();
        }

        return this.waypoints;
    }

    @computed('{dropoff,pickup,waypoints}', 'waypoints.[]') get payloadCoordinates() {
        let waypoints = [];
        let coordinates = [];

        waypoints.pushObjects([this.pickup, ...this.waypoints.toArray(), this.dropoff]);
        waypoints.forEach((place) => {
            if (place && place.get('longitude') && place.get('latitude')) {
                if (place.hasInvalidCoordinates) {
                    return;
                }

                coordinates.pushObject([place.get('longitude'), place.get('latitude')]);
            }
        });

        return coordinates;
    }

    @computed('dropoff', 'model.payload.{dropoff,pickup,waypoints}', 'pickup', 'waypoints') get routeWaypoints() {
        let waypoints = [];
        let coordinates = [];

        waypoints.pushObjects([this.pickup, ...this.waypoints.toArray(), this.dropoff]);
        waypoints.forEach((place) => {
            if (place && place.get('longitude') && place.get('latitude')) {
                if (place.hasInvalidCoordinates) {
                    return;
                }

                coordinates.pushObject([place.get('latitude'), place.get('longitude')]);
            }
        });

        return coordinates;
    }

    /** computed dates */
    @computed('updated_at') get updatedAgo() {
        return formatDistanceToNow(this.updated_at);
    }

    @computed('updated_at') get updatedAt() {
        return formatDate(this.updated_at, 'PPP p');
    }

    @computed('updated_at') get updatedAtShort() {
        return formatDate(this.updated_at, 'dd, MMM');
    }

    @computed('created_at') get createdAgo() {
        return formatDistanceToNow(this.created_at);
    }

    @computed('created_at') get createdAt() {
        if (!isValidDate(this.created_at)) {
            return null;
        }
        return formatDate(this.created_at, 'PPP p');
    }

    @computed('created_at') get createdAtShort() {
        return formatDate(this.created_at, 'dd, MMM');
    }

    /** @methods */
    setWaypoints(_waypoints = []) {
        let waypoints = [..._waypoints];

        waypoints.forEach((waypoint, index) => waypoint.set('order', index));

        this.setProperties({ waypoints });

        return this;
    }

    setEntities(_entities = []) {
        let entities = [..._entities];

        this.setProperties({ entities });
        return this;
    }
}
