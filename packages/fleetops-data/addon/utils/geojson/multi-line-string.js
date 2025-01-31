import GeoJson from './geo-json';
import LineString from './line-string';
import { isArray } from '@ember/array';

export default class MultiLineString extends GeoJson {
    constructor(input) {
        super();

        if (input && input.type === 'MultiLineString' && input.coordinates) {
            Object.assign(this, input);
        } else if (isArray(input)) {
            this.coordinates = input;
        } else {
            throw 'GeoJSON: invalid input for new MultiLineString';
        }

        this.type = 'MultiLineString';
    }

    forEach(func) {
        for (var i = 0; i < this.coordinates.length; i++) {
            func.apply(this, [this.coordinates[i], i, this.coordinates]);
        }
    }

    get(i) {
        return new LineString(this.coordinates[i]);
    }
}
