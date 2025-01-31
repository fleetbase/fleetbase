import GeoJson from './geo-json';
import { isArray } from '@ember/array';

export default class GeometryCollection extends GeoJson {
    constructor(input) {
        super();

        if (input && input.type === 'GeometryCollection' && input.geometries) {
            Object.assign(this, input);
        } else if (isArray(input)) {
            this.geometries = input;
        } else if (input.coordinates && input.type) {
            this.type = 'GeometryCollection';
            this.geometries = [input];
        } else {
            throw 'GeoJSON: invalid input for new GeometryCollection';
        }

        this.type = 'GeometryCollection';
    }

    forEach(func) {
        for (var i = 0; i < this.geometries.length; i++) {
            func.apply(this, [this.geometries[i], i, this.geometries]);
        }
    }

    get(i) {
        return new GeoJson(this.geometries[i]);
    }
}
