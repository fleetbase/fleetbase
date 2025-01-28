import calculateBounds from './calculate-bounds';
import EmberObject from '@ember/object';

const excludeFromJSON = ['length'];

export default class GeoJson extends EmberObject {
    toJSON() {
        var obj = {};
        for (var key in this) {
            if (this.hasOwnProperty(key) && excludeFromJSON.indexOf(key) === -1) {
                obj[key] = this[key];
            }
        }
        obj.bbox = calculateBounds(this);
        return obj;
    }
}
