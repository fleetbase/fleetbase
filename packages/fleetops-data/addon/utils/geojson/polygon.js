import GeoJson from './geo-json';
import closedPolygon from './closed-polygon';
import { isArray } from '@ember/array';

export default class Polygon extends GeoJson {
    constructor(input) {
        super();

        if (input && input.type === 'Polygon' && input.coordinates) {
            Object.assign(this, input);
        } else if (isArray(input)) {
            this.coordinates = input;
        } else {
            throw 'GeoJSON: invalid input for new Polygon';
        }

        this.type = 'Polygon';
    }

    addVertex(point) {
        this.insertVertex(point, this.coordinates[0].length - 1);
        return this;
    }

    insertVertex(point, index) {
        this.coordinates[0].splice(index, 0, point);
        return this;
    }

    removeVertex(remove) {
        this.coordinates[0].splice(remove, 1);
        return this;
    }

    close() {
        this.coordinates = closedPolygon(this.coordinates);
    }

    hasHoles() {
        return this.coordinates.length > 1;
    }

    holes() {
        var holes = [];
        if (this.hasHoles()) {
            for (var i = 1; i < this.coordinates.length; i++) {
                holes.push(new Polygon([this.coordinates[i]]));
            }
        }
        return holes;
    }
}
