import PlaceModel from './place';
import { attr } from '@ember-data/model';
import { belongsTo } from '@ember-data/model';

export default class WaypointModel extends PlaceModel {
    /** @relationships */
    @belongsTo('place', { async: false }) place;
    @belongsTo('tracking-number', { async: false }) tracking_number;
    @belongsTo('customer', { polymorphic: true, async: false, inverse: 'waypoints' }) customer;

    /** @attributes */
    @attr('string') public_id;
    @attr('string') _import_id;
    @attr('string') waypoint_uuid;
    @attr('string') waypoint_public_id;
    @attr('string') tracking_number_uuid;
    @attr('string') customer_uuid;
    @attr('string') customer_type;
    @attr('string') tracking;
    @attr('string') status;
    @attr('string') status_code;
    @attr('string') type;
    @attr('number') order;
    @attr('string') place_uuid;
}

