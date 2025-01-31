import calculateBounds from './calculate-bounds';
import EmberObject from '@ember/object';

export const EarthRadius = 6378137;
export const DegreesPerRadian = 57.29577951308232;
export const RadiansPerDegree = 0.017453292519943;
export const MercatorCRS = {
    type: 'link',
    properties: {
        href: 'http://spatialreference.org/ref/sr-org/6928/ogcwkt/',
        type: 'ogcwkt',
    },
};
export const GeographicCRS = {
    type: 'link',
    properties: {
        href: 'http://spatialreference.org/ref/epsg/4326/ogcwkt/',
        type: 'ogcwkt',
    },
};

const excludeFromJSON = ['length'];

export default class GeoJson extends EmberObject {
    toJSON() {
        var obj = {};
        for (var key in this) {
            if (Object.prototype.hasOwnProperty.call(this, key) && excludeFromJSON.indexOf(key) === -1) {
                obj[key] = this[key];
            }
        }
        obj.bbox = calculateBounds(this);
        return obj;
    }
}
