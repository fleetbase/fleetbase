import Service from '@ember/service';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
// import { action } from '@ember/object';
// import { isArray } from '@ember/array';
// import { isBlank } from '@ember/utils';
// import { dasherize } from '@ember/string';
// import { later, next } from '@ember/runloop';
// import { task } from 'ember-concurrency-decorators';
// import { OSRMv1, Control as RoutingControl } from '@fleetbase/leaflet-routing-machine';
// import polyline from '@fleetbase/ember-core/utils/polyline';
// import findClosestWaypoint from '@fleetbase/ember-core/utils/find-closest-waypoint';
// import isNotEmpty from '@fleetbase/ember-core/utils/is-not-empty';
// import getRoutingHost from '@fleetbase/ember-core/utils/get-routing-host';
// import getWithDefault from '@fleetbase/ember-core/utils/get-with-default';
// import isModel from '@fleetbase/ember-core/utils/is-model';

export default class OrderCreationService extends Service {
    @service store;
    @service fetch;
    @service location;
    @tracked map;
    @tracked latitude;
    @tracked longitude;
    @tracked order = this.store.createRecord('order');
    @tracked payload = this.store.createRecord('payload');

    setMap(map) {
        this.map = map;
    }

    setOrder(order) {
        this.order = order;
    }
}
