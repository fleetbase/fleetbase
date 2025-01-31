import Point from './point';
import MultiPoint from './multi-point';
import LineString from './line-string';
import MultiLineString from './multi-line-string';
import Polygon from './polygon';
import MultiPolygon from './multi-polygon';
import Feature from './feature';
import FeatureCollection from './feature-collection';
import GeometryCollection from './geometry-collection';
import Circle from './circle';

export default function geojsonCreatePrimitive(geojson) {
    if (geojson) {
        switch (geojson.type) {
            case 'Point':
                return new Point(geojson);

            case 'MultiPoint':
                return new MultiPoint(geojson);

            case 'LineString':
                return new LineString(geojson);

            case 'MultiLineString':
                return new MultiLineString(geojson);

            case 'Polygon':
                return new Polygon(geojson);

            case 'MultiPolygon':
                return new MultiPolygon(geojson);

            case 'Feature':
                return new Feature(geojson);

            case 'FeatureCollection':
                return new FeatureCollection(geojson);

            case 'GeometryCollection':
                return new GeometryCollection(geojson);

            case 'Circle':
                return new Circle(geojson);

            default:
                throw new Error('Unknown type: ' + geojson.type);
        }
    }
}
