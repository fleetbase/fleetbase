import pointsEqual from './points-equal';

export default function closedPolygon(coordinates) {
    var outer = [];

    for (var i = 0; i < coordinates.length; i++) {
        var inner = coordinates[i].slice();
        if (pointsEqual(inner[0], inner[inner.length - 1]) === false) {
            inner.push(inner[0]);
        }

        outer.push(inner);
    }

    return outer;
}
