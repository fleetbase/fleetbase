import { helper } from '@ember/component/helper';
import WaypointModel from '@fleetbase/console/models/waypoint';

export default helper(function isWaypointRecord([record]) {
    return record instanceof WaypointModel;
});
