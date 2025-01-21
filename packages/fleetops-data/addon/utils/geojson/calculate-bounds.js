/*
  Internal: Calculate a bounding box from an array of positions
  [
    [lng, lat],[lng, lat],[lng, lat]
  ]
  */
function calculateBoundsFromArray(array) {
    var x1 = null,
        x2 = null,
        y1 = null,
        y2 = null;

    for (var i = 0; i < array.length; i++) {
        var lonlat = array[i];
        var lon = lonlat[0];
        var lat = lonlat[1];

        if (x1 === null) {
            x1 = lon;
        } else if (lon < x1) {
            x1 = lon;
        }

        if (x2 === null) {
            x2 = lon;
        } else if (lon > x2) {
            x2 = lon;
        }

        if (y1 === null) {
            y1 = lat;
        } else if (lat < y1) {
            y1 = lat;
        }

        if (y2 === null) {
            y2 = lat;
        } else if (lat > y2) {
            y2 = lat;
        }
    }

    return [x1, y1, x2, y2];
}

/*
  Internal: Calculate an bounding box from an nested array of positions
  [
    [
      [ [lng, lat],[lng, lat],[lng, lat] ]
    ]
    [
      [lng, lat],[lng, lat],[lng, lat]
    ]
    [
      [lng, lat],[lng, lat],[lng, lat]
    ]
  ]
  */
function calculateBoundsFromNestedArrays(array) {
    var x1 = null,
        x2 = null,
        y1 = null,
        y2 = null;

    for (var i = 0; i < array.length; i++) {
        var inner = array[i];

        for (var j = 0; j < inner.length; j++) {
            var lonlat = inner[j];

            var lon = lonlat[0];
            var lat = lonlat[1];

            if (x1 === null) {
                x1 = lon;
            } else if (lon < x1) {
                x1 = lon;
            }

            if (x2 === null) {
                x2 = lon;
            } else if (lon > x2) {
                x2 = lon;
            }

            if (y1 === null) {
                y1 = lat;
            } else if (lat < y1) {
                y1 = lat;
            }

            if (y2 === null) {
                y2 = lat;
            } else if (lat > y2) {
                y2 = lat;
            }
        }
    }

    return [x1, y1, x2, y2];
}

/*
  Internal: Calculate a bounding box from an array of arrays of arrays
  [
    [ [lng, lat],[lng, lat],[lng, lat] ]
    [ [lng, lat],[lng, lat],[lng, lat] ]
    [ [lng, lat],[lng, lat],[lng, lat] ]
  ]
  */
function calculateBoundsFromNestedArrayOfArrays(array) {
    var x1 = null,
        x2 = null,
        y1 = null,
        y2 = null;

    for (var i = 0; i < array.length; i++) {
        var inner = array[i];

        for (var j = 0; j < inner.length; j++) {
            var innerinner = inner[j];
            for (var k = 0; k < innerinner.length; k++) {
                var lonlat = innerinner[k];

                var lon = lonlat[0];
                var lat = lonlat[1];

                if (x1 === null) {
                    x1 = lon;
                } else if (lon < x1) {
                    x1 = lon;
                }

                if (x2 === null) {
                    x2 = lon;
                } else if (lon > x2) {
                    x2 = lon;
                }

                if (y1 === null) {
                    y1 = lat;
                } else if (lat < y1) {
                    y1 = lat;
                }

                if (y2 === null) {
                    y2 = lat;
                } else if (lat > y2) {
                    y2 = lat;
                }
            }
        }
    }

    return [x1, y1, x2, y2];
}

/*
  Internal: Calculate an bounding box for a feature collection
  */
function calculateBoundsForFeatureCollection(featureCollection) {
    var extents = [],
        extent;
    for (var i = featureCollection.features.length - 1; i >= 0; i--) {
        extent = calculateBounds(featureCollection.features[i].geometry);
        extents.push([extent[0], extent[1]]);
        extents.push([extent[2], extent[3]]);
    }

    return calculateBoundsFromArray(extents);
}

/*
  Internal: Calculate an bounding box for a geometry collection
  */
function calculateBoundsForGeometryCollection(geometryCollection) {
    var extents = [],
        extent;

    for (var i = geometryCollection.geometries.length - 1; i >= 0; i--) {
        extent = calculateBounds(geometryCollection.geometries[i]);
        extents.push([extent[0], extent[1]]);
        extents.push([extent[2], extent[3]]);
    }

    return calculateBoundsFromArray(extents);
}

function calculateEnvelope(geojson) {
    var bounds = calculateBounds(geojson);
    return {
        x: bounds[0],
        y: bounds[1],
        w: Math.abs(bounds[0] - bounds[2]),
        h: Math.abs(bounds[1] - bounds[3]),
    };
}

export default function calculateBounds(geojson) {
    if (geojson.type) {
        switch (geojson.type) {
            case 'Point':
                return [geojson.coordinates[0], geojson.coordinates[1], geojson.coordinates[0], geojson.coordinates[1]];

            case 'MultiPoint':
                return calculateBoundsFromArray(geojson.coordinates);

            case 'LineString':
                return calculateBoundsFromArray(geojson.coordinates);

            case 'MultiLineString':
                return calculateBoundsFromNestedArrays(geojson.coordinates);

            case 'Polygon':
                return calculateBoundsFromNestedArrays(geojson.coordinates);

            case 'MultiPolygon':
                return calculateBoundsFromNestedArrayOfArrays(geojson.coordinates);

            case 'Feature':
                return geojson.geometry ? calculateBounds(geojson.geometry) : null;

            case 'FeatureCollection':
                return calculateBoundsForFeatureCollection(geojson);

            case 'GeometryCollection':
                return calculateBoundsForGeometryCollection(geojson);

            default:
                throw new Error('Unknown type: ' + geojson.type);
        }
    }
    return null;
}

export {
    calculateBoundsFromArray,
    calculateBoundsFromNestedArrays,
    calculateBoundsFromNestedArrayOfArrays,
    calculateBoundsForFeatureCollection,
    calculateBoundsForGeometryCollection,
    calculateEnvelope,
};
