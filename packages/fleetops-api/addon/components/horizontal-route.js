import Component from '@glimmer/component';
import { computed } from '@ember/object';
import { isArray } from '@ember/array';

export default class HorizontalRouteComponent extends Component {
    @computed('args.payload') get locations() {
        const { payload } = this.args;
        const { pickup, dropoff, waypoints } = payload;
        const locations = [];

        if (pickup) {
            locations.pushObject(pickup);
        }

        if (isArray(waypoints) && waypoints.length) {
            for (let i = 0; i < waypoints.length; i++) {
                const waypoint = waypoints.objectAt(i);

                locations.pushObject(waypoint);
            }
        }

        if (dropoff) {
            locations.pushObject(dropoff);
        }

        return locations;
    }

    @computed('args.payload') get destination() {
        const { payload } = this.args;
        const { dropoff, waypoints } = payload;

        if (isArray(waypoints) && waypoints.length) {
            const waypoint = waypoints.find((location, index) => {
                if (payload.current_waypoint_uuid) {
                    return payload.current_waypoint_uuid === location.uuid;
                }

                return index === 0;
            });

            return waypoint;
        }

        return dropoff;
    }
}
