import GeoJson from './geo-json';
import { isArray } from '@ember/array';

export default class LineString extends GeoJson {
    constructor(input) {
        super();

        if (input && input.type === 'LineString' && input.coordinates) {
            Object.assign(this, input);
        } else if (isArray(input)) {
            this.coordinates = input;
        } else {
            throw 'GeoJSON: invalid input for new LineString';
        }

        this.type = 'LineString';
    }

    addVertex(point) {
        this.coordinates.push(point);
        return this;
    }

    insertVertex(point, index) {
        this.coordinates.splice(index, 0, point);
        return this;
    }

    removeVertex(remove) {
        this.coordinates.splice(remove, 1);
        return this;
    }
}
