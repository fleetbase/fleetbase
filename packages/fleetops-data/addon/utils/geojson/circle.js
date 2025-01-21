import GeoJson, { EarthRadius, MercatorCRS, DegreesPerRadian, RadiansPerDegree } from './geo-json';
import Feature from './feature';
import closedPolygon from './closed-polygon';

function radToDeg(rad) {
    return rad * DegreesPerRadian;
}

function degToRad(deg) {
    return deg * RadiansPerDegree;
}

function positionToGeographic(position) {
    var x = position[0];
    var y = position[1];
    return [radToDeg(x / EarthRadius) - Math.floor((radToDeg(x / EarthRadius) + 180) / 360) * 360, radToDeg(Math.PI / 2 - 2 * Math.atan(Math.exp((-1.0 * y) / EarthRadius)))];
}

function positionToMercator(position) {
    var lng = position[0];
    var lat = Math.max(Math.min(position[1], 89.99999), -89.99999);
    return [degToRad(lng) * EarthRadius, (EarthRadius / 2.0) * Math.log((1.0 + Math.sin(degToRad(lat))) / (1.0 - Math.sin(degToRad(lat))))];
}

function eachPosition(coordinates, func) {
    for (var i = 0; i < coordinates.length; i++) {
        // we found a number so lets convert this pair
        if (typeof coordinates[i][0] === 'number') {
            coordinates[i] = func(coordinates[i]);
        }
        // we found an coordinates array it again and run THIS function against it
        if (typeof coordinates[i] === 'object') {
            coordinates[i] = eachPosition(coordinates[i], func);
        }
    }
    return coordinates;
}

function applyConverter(geojson, converter, noCrs) {
    if (geojson.type === 'Point') {
        geojson.coordinates = converter(geojson.coordinates);
    } else if (geojson.type === 'Feature') {
        geojson.geometry = applyConverter(geojson.geometry, converter, true);
    } else if (geojson.type === 'FeatureCollection') {
        for (var f = 0; f < geojson.features.length; f++) {
            geojson.features[f] = applyConverter(geojson.features[f], converter, true);
        }
    } else if (geojson.type === 'GeometryCollection') {
        for (var g = 0; g < geojson.geometries.length; g++) {
            geojson.geometries[g] = applyConverter(geojson.geometries[g], converter, true);
        }
    } else {
        geojson.coordinates = eachPosition(geojson.coordinates, converter);
    }

    if (!noCrs) {
        if (converter === positionToMercator) {
            geojson.crs = MercatorCRS;
        }
    }

    if (converter === positionToGeographic) {
        delete geojson.crs;
    }

    return geojson;
}

export default class Circle extends GeoJson {
    constructor(center, radius, interpolate) {
        super();

        var steps = interpolate || 64;
        var rad = radius || 250;

        if (!center || center.length < 2 || !rad || !steps) {
            throw new Error('GeoJSON: missing parameter for new Circle');
        }

        Object.assign(
            this,
            new Feature({
                type: 'Feature',
                geometry: Circle.createCircle(center, rad, steps),
                properties: {
                    radius: rad,
                    center: center,
                    steps: steps,
                },
            })
        );
    }

    static createCircle(center, radius, interpolate) {
        var mercatorPosition = positionToMercator(center);
        var steps = interpolate || 64;
        var polygon = {
            type: 'Polygon',
            coordinates: [[]],
        };
        for (var i = 1; i <= steps; i++) {
            var radians = (i * (360 / steps) * Math.PI) / 180;
            polygon.coordinates[0].push([mercatorPosition[0] + radius * Math.cos(radians), mercatorPosition[1] + radius * Math.sin(radians)]);
        }
        polygon.coordinates = closedPolygon(polygon.coordinates);

        return Circle.toGeographic(polygon);
    }

    static toGeographic(geojson) {
        return applyConverter(geojson, positionToGeographic);
    }

    recalculate() {
        this.geometry = Circle.createCircle(this.properties.center, this.properties.radius, this.properties.steps);
        return this;
    }

    center(coordinates) {
        if (coordinates) {
            this.properties.center = coordinates;
            this.recalculate();
        }
        return this.properties.center;
    }

    radius(radius) {
        if (radius) {
            this.properties.radius = radius;
            this.recalculate();
        }
        return this.properties.radius;
    }

    steps(steps) {
        if (steps) {
            this.properties.steps = steps;
            this.recalculate();
        }
        return this.properties.steps;
    }
}
