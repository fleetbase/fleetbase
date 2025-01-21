import GeoJson from './geo-json';
import Feature from './feature';
import { isArray } from '@ember/array';

export default class FeatureCollection extends GeoJson {
    constructor(input) {
        super();

        if (input && input.type === 'FeatureCollection' && input.features) {
            Object.assign(this, input);
        } else if (isArray(input)) {
            this.features = input;
        } else {
            throw 'GeoJSON: invalid input for new FeatureCollection';
        }

        this.type = 'FeatureCollection';
    }

    forEach(func) {
        for (var i = 0; i < this.features.length; i++) {
            func.apply(this, [this.features[i], i, this.features]);
        }
    }

    get(id) {
        var found;
        this.forEach(function (feature) {
            if (feature.id === id) {
                found = feature;
            }
        });
        return new Feature(found);
    }
}
