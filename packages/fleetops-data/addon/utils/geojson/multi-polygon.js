import GeoJson from './geo-json';
import Polygon from './polygon';
import closedPolygon from './closed-polygon';
import { isArray } from '@ember/array';

export default class MultiPolygon extends GeoJson {
    constructor(input) {
        super();

        if (input && input.type === 'MultiPolygon' && input.coordinates) {
            Object.assign(this, input);
        } else if (isArray(input)) {
            this.coordinates = input;
        } else {
            throw 'GeoJSON: invalid input for new MultiPolygon';
        }

        this.type = 'MultiPolygon';
    }

    forEach(func) {
        for (var i = 0; i < this.coordinates.length; i++) {
            func.apply(this, [this.coordinates[i], i, this.coordinates]);
        }
    }

    get(i) {
        return new Polygon(this.coordinates[i]);
    }

    close() {
        var outer = [];
        this.forEach(function (polygon) {
            outer.push(closedPolygon(polygon));
        });
        this.coordinates = outer;
        return this;
    }
}
