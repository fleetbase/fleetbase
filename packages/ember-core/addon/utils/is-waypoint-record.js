import WaypointModel from '../models/waypoint';

export default function isWaypointRecord(record) {
    return record instanceof WaypointModel;
}
