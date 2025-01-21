import GeoJson from './geo-json';
import Point from './point';
import { isArray } from '@ember/array';

export default class MultiPoint extends GeoJson {
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

    addPoint(point) {
        this.coordinates.push(point);
        return this;
    }

    insertPoint(point, index) {
        this.coordinates.splice(index, 0, point);
        return this;
    }

    removePoint(remove) {
        if (typeof remove === 'number') {
            this.coordinates.splice(remove, 1);
        } else {
            this.coordinates.splice(this.coordinates.indexOf(remove), 1);
        }
        return this;
    }

    get(i) {
        return new Point(this.coordinates[i]);
    }
}
