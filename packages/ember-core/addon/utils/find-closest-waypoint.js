import haversine from './haversine';
import { get } from '@ember/object';

export default function findClosestWaypoint(latitude, longitude, waypoints = []) {
    let distances = [];

    for (let i = 0; i < waypoints.length; i++) {
        let waypoint = waypoints.objectAt(i);
        let distance = haversine({ latitude, longitude }, waypoint.place.get('latitudelongitude'));

        distances.pushObject({
            distance,
            waypoint,
        });
    }

    distances = distances.sortBy('distance');

    return get(distances, 'firstObject.waypoint');
}
