<?php

namespace Fleetbase\FleetOps\Support;

use Fleetbase\FleetOps\Flow\Activity;
use Fleetbase\LaravelMysqlSpatial\Types\Point;
use Fleetbase\Support\Utils as FleetbaseUtils;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Str;

class Utils extends FleetbaseUtils
{
    /**
     * A constant multiplier used to calculate driving time from distance.
     *
     * @var float
     */
    public const DRIVING_TIME_MULTIPLIER = 7.2;

    /**
     * Get a formatted string representation of a place's address.
     *
     * @param \Fleetbase\FleetOps\Models\Place $place   the place object to retrieve the address from
     * @param bool                             $useHtml whether to format the address as HTML (default is false)
     * @param array|string                     $except  an array of keys to exclude from the address (default is an empty array)
     *
     * @return string the formatted address string
     */
    public static function getAddressStringForPlace(\Fleetbase\FleetOps\Models\Place $place, $useHtml = false, $except = [])
    {
        $address = $useHtml ? '<address>' : '';
        $parts   = collect([
            'name',
            'street1',
            'street2',
            'city',
            'province',
            'postal_code',
            'country_name',
        ])->filter(function ($part) use ($except) {
            return is_array($except) ? !in_array($part, $except) : true;
        })->values();
        $numberOfParts = $parts->count();
        $addressValues = [];
        $seperator     = $useHtml ? '<br>' : ' - ';

        for ($i = 0; $i < $numberOfParts; $i++) {
            $key   = $parts[$i];
            $value = data_get($place, $key);

            if (is_string($value)) {
                $value = strtoupper($value);
            }

            // if value empty skip or value equal to last value skip
            if (empty($value) || in_array($value, $addressValues) || (Str::contains(data_get($place, 'street1'), $value) && $key !== 'street1')) {
                continue;
            }

            $addressValues[$key] = $value;
        }

        foreach ($addressValues as $key => $value) {
            if ($key === array_key_last($addressValues)) {
                $seperator = '';
            }

            if ($useHtml && in_array($key, ['street1', 'street2', 'postal_code'])) {
                $seperator = '<br>';
            }

            $address .= strtoupper($value) . $seperator;
            $seperator = ', ';
        }

        if ($useHtml) {
            $address .= '</address>';
        }

        return $address;
    }

    /**
     * Unpack a binary string representing a geographic point into an array of values.
     *
     * @return array an array of values representing the geographic point, with keys for 'order', 'type', 'lat', and 'lon'
     */
    public static function unpackPoint(string $bindaryString): array
    {
        return unpack('x/x/x/x/corder/Ltype/dlat/dlon', $bindaryString);
    }

    /**
     * Unpacks a mysql POINT column from binary to array.
     */
    public static function mysqlPointAsGeometry(string $rawPoint): Point
    {
        $coordinates = static::unpackPoint($rawPoint);

        return new Point($coordinates['lon'], $coordinates['lat']);
    }

    /**
     * Determines if a given number is a valid latitude value in the range of -90 to 90 degrees.
     *
     * @param mixed $num the number to check for latitude validity
     *
     * @return bool true if the number is a valid latitude value, false otherwise
     */
    public static function isLatitude($num): bool
    {
        if (!is_numeric($num) || $num === null) {
            return false;
        }

        // cast to float
        $num = (float) $num;

        return is_finite($num) && $num >= -90 && $num <= 90;
    }

    /**
     * Determines if a given number is a valid longitude value in the range of -180 to 180 degrees.
     *
     * @param mixed $num the number to check for longitude validity
     *
     * @return bool true if the number is a valid longitude value, false otherwise
     */
    public static function isLongitude($num): bool
    {
        if (!is_numeric($num) || is_null($num)) {
            return false;
        }

        // cast to float
        $num = (float) $num;

        return is_finite($num) && $num >= -180 && $num <= 180;
    }

    /**
     * Cleans a string containing a coordinate value by removing all non-numeric and non-period characters.
     *
     * @param string $string the string to clean
     *
     * @return string the cleaned string containing only numeric and period characters
     */
    public static function cleanCoordinateString($string)
    {
        return str_replace([' ', ',', ';', ':', '-', '+', '/', '\\', '(', ')', '[', ']', '{', '}', '_', '|', '@', '#', '$', '%', '^', '&', '*', '=', '?', '!', '<', '>', '~', '`', '"', "'", '“', '”'], '', $string);
    }

    /**
     * Determines whether the given input represents valid coordinates.
     *
     * @param mixed $coordinates the input to check for coordinates validity
     *
     * @return bool true if the input represents valid coordinates, false otherwise
     */
    public static function isCoordinates($coordinates): bool
    {
        try {
            return static::getPointFromMixed($coordinates) instanceof Point;
        } catch (\Throwable $e) {
            return false;
        }

        return false;
    }

    /**
     * Gets a Point object from coordinates.
     *
     * @param mixed $coordinates the coordinates input value to extract a coordinate from
     *
     * @return Point the extracted Point object
     */
    public static function getPointFromMixed($coordinates): ?Point
    {
        $latitude  = null;
        $longitude = null;

        if ($coordinates instanceof \Fleetbase\FleetOps\Models\Place) {
            $coordinates = $coordinates->location;
        }

        if ($coordinates instanceof \Fleetbase\FleetOps\Models\Driver) {
            $coordinates = $coordinates->location;
        }

        // any model with spatial location point
        if ($coordinates instanceof \Illuminate\Database\Eloquent\Model && $coordinates->isFillable('location')) {
            $coordinates = $coordinates->location;
        }

        if ($coordinates instanceof \Fleetbase\LaravelMysqlSpatial\Eloquent\SpatialExpression) {
            $coordinates = $coordinates->getSpatialValue();
        }

        if ($coordinates instanceof Point) {
            $latitude  = $coordinates->getLat();
            $longitude = $coordinates->getLng();
        } elseif (static::isGeoJson($coordinates)) {
            $coordinatesJson             = null;
            $coordinatesInGeoJson        = null;
            $coordinatesInGeoJsonFeature = null;

            if (is_array($coordinates) || is_object($coordinates)) {
                $coordinatesJson = json_encode($coordinates);
            }

            $coordinatesInGeoJson        = data_get($coordinates, 'coordinates');
            $coordinatesInGeoJsonFeature = data_get($coordinates, 'geometry.coordinates');

            if (static::isJson($coordinatesJson)) {
                try {
                    $coordinates = Point::fromJson($coordinatesJson);
                } catch (\Throwable $e) {
                    if ($coordinatesInGeoJson) {
                        return static::getPointFromMixed($coordinatesInGeoJson);
                    }

                    if ($coordinatesInGeoJsonFeature) {
                        return static::getPointFromMixed($coordinatesInGeoJsonFeature);
                    }
                }
            }
        } elseif (is_array($coordinates) || is_object($coordinates)) {
            // if known location based record
            if (static::exists($coordinates, 'public_id')) {
                if (Str::startsWith(data_get($coordinates, 'public_id'), ['place', 'driver'])) {
                    return static::getPointFromMixed(data_get($coordinates, 'public_id'));
                }
            }

            // if is a object/array model with location property
            if (static::exists($coordinates, 'location')) {
                return static::getPointFromMixed(data_get($coordinates, 'location'));
            }

            $latitude  = static::or($coordinates, ['_lat', 'lat', '_latitude', 'latitude', 'x', '0']);
            $longitude = static::or($coordinates, ['lon', '_lon', 'long', 'lng', '_lng', '_longitude', 'longitude', 'y', '1']);
        }

        if (is_string($coordinates)) {
            $coords = [];

            if (Str::startsWith($coordinates, 'place_')) {
                $resolvedPlace = \Fleetbase\FleetOps\Models\Place::where('public_id', $coordinates)->first();
                if ($resolvedPlace instanceof \Fleetbase\FleetOps\Models\Place) {
                    return static::getPointFromMixed($resolvedPlace);
                }

                return null;
            }

            if (Str::startsWith($coordinates, 'driver_')) {
                $resolvedDriver = \Fleetbase\FleetOps\Models\Driver::where('public_id', $coordinates)->first();
                if ($resolvedDriver instanceof \Fleetbase\FleetOps\Models\Driver) {
                    return static::getPointFromMixed($resolvedDriver);
                }

                return null;
            }

            if (Str::isUuid($coordinates)) {
                $resolvedPlace = \Fleetbase\FleetOps\Models\Place::where('uuid', $coordinates)->first();
                if ($resolvedPlace instanceof \Fleetbase\FleetOps\Models\Place) {
                    return static::getPointFromMixed($resolvedPlace);
                }

                $resolvedDriver = \Fleetbase\FleetOps\Models\Driver::where('uuid', $coordinates)->first();
                if ($resolvedDriver instanceof \Fleetbase\FleetOps\Models\Driver) {
                    return static::getPointFromMixed($resolvedDriver);
                }

                return null;
            }

            if (Str::startsWith($coordinates, 'POINT(')) {
                $coordinates = Str::replaceFirst('POINT(', '', $coordinates);
                $coordinates = Str::replace(')', '', $coordinates);
                $coords      = explode(' ', $coordinates);
                $coords      = array_reverse($coords);
                $coordinates = null;
            }

            if (preg_match('/LatLng\(([^,]+),\s*([^)]+)\)/', $coordinates, $matches)) {
                $coords = [
                    floatval($matches[1]),
                    floatval($matches[2]),
                ];

                $coordinates = null;
            }

            if (Str::contains($coordinates, ',')) {
                $coords = explode(',', $coordinates);
            }

            if (Str::contains($coordinates, '|')) {
                $coords = explode('|', $coordinates);
            }

            if (Str::contains($coordinates, ' ')) {
                $coords = explode(' ', $coordinates);
            }

            $latitude  = isset($coords[0]) ? $coords[0] : null;
            $longitude = isset($coords[1]) ? $coords[1] : null;
        }

        if ($coordinates instanceof Point) {
            return $coordinates;
        }

        // if longitude and latitude is invalide throw exception
        if ($latitude === null && $longitude === null) {
            throw new \Exception('Attempted to resolve Point from invalid location.');
        }

        return new Point((float) $latitude, (float) $longitude);
    }

    /**
     * Determines if the given coordinates strictly represent a Point object.
     * These will explude resolvable coordinates from records.
     *
     * @param mixed $coordinates the coordinates, which can be an array, object, or string
     *
     * @return bool returns true if $coordinates represents a Point object, false otherwise
     */
    public static function isCoordinatesStrict($coordinates)
    {
        return static::getPointFromCoordinatesStrict($coordinates) instanceof Point;
    }

    /**
     * Resolves a GeoJson/array/object or string representing a point to a Point object.
     * These will explude resolvable coordinates from records.
     *
     * @param mixed $coordinates the coordinates, which can be an array, object, or string
     *
     * @return Point Returns the Point instance
     */
    public static function getPointFromCoordinatesStrict($coordinates): ?Point
    {
        if ($coordinates instanceof \Fleetbase\LaravelMysqlSpatial\Eloquent\SpatialExpression) {
            $coordinates = $coordinates->getSpatialValue();
        }

        if ($coordinates instanceof Point) {
            return $coordinates;
        }

        if (static::isGeoJson($coordinates)) {
            $coordinatesJson = null;

            if (is_array($coordinates) || is_object($coordinates)) {
                $coordinatesJson = json_encode($coordinates);
            }

            if (static::isJson($coordinatesJson)) {
                $coordinates = Point::fromJson($coordinatesJson);
            }
        }

        if (is_array($coordinates) || is_object($coordinates)) {
            $latitude  = static::or($coordinates, ['_lat', 'lat', '_latitude', 'latitude', 'x', '0']);
            $longitude = static::or($coordinates, ['lon', '_lon', 'long', 'lng', '_lng', '_longitude', 'longitude', 'y', '1']);

            if (is_numeric($latitude) && is_numeric($longitude)) {
                $coordinates = new Point((float) $latitude, (float) $longitude);
            }
        }

        if (is_string($coordinates)) {
            $coords = [];

            if (Str::startsWith($coordinates, 'POINT(')) {
                $coordinates = Str::replaceFirst('POINT(', '', $coordinates);
                $coordinates = Str::replace(')', '', $coordinates);
                $coords      = explode(' ', $coordinates);
                $coords      = array_reverse($coords);
                $coordinates = null;
            }

            if (preg_match('/LatLng\(([^,]+),\s*([^)]+)\)/', $coordinates, $matches)) {
                $coords = [
                    floatval($matches[1]),
                    floatval($matches[2]),
                ];

                $coordinates = null;
            }

            if (Str::contains($coordinates, ',')) {
                $coords = explode(',', $coordinates);
            }

            if (Str::contains($coordinates, '|')) {
                $coords = explode('|', $coordinates);
            }

            if (Str::contains($coordinates, ' ')) {
                $coords = explode(' ', $coordinates);
            }

            $latitude  = $coords[0];
            $longitude = $coords[1];

            if (is_numeric($latitude) && is_numeric($longitude)) {
                $coordinates = new Point((float) $latitude, (float) $longitude);
            }
        }

        if ($coordinates instanceof Point) {
            return $coordinates;
        }

        return null;
    }

    /**
     * Gets a coordinate property from coordinates.
     *
     * @param mixed  $coordinates the coordinates input value to extract a coordinate from
     * @param string $prop        the coordinate property to extract ('latitude' or 'longitude')
     *
     * @return float the extracted coordinate value as a float
     */
    public static function getCoordinateFromCoordinates($coordinates, $prop = 'latitude'): float
    {
        $latitude  = null;
        $longitude = null;

        if ($coordinates instanceof \Fleetbase\LaravelMysqlSpatial\Eloquent\SpatialExpression) {
            $coordinates = $coordinates->getSpatialValue();
        }

        if ($coordinates instanceof \Fleetbase\FleetOps\Models\Place) {
            $coordinates = $coordinates->location;
        }

        if ($coordinates instanceof Point) {
            $latitude  = $coordinates->getLat();
            $longitude = $coordinates->getLng();
        } elseif (is_array($coordinates) || is_object($coordinates)) {
            $latitude  = static::or($coordinates, ['_lat', 'lat', '_latitude', 'latitude', 'x', '0']);
            $longitude = static::or($coordinates, ['lon', '_lon', 'long', 'lng', '_lng', '_longitude', 'longitude', 'y', '1']);
        }

        if (is_string($coordinates)) {
            $coords = [];

            if (Str::startsWith($coordinates, 'place_')) {
                $resolvedPlace = \Fleetbase\FleetOps\Models\Place::where('public_id', $coordinates)->first();
                if ($resolvedPlace instanceof \Fleetbase\FleetOps\Models\Place) {
                    return static::getCoordinateFromCoordinates($resolvedPlace);
                }
            }

            if (Str::isUuid($coordinates)) {
                $resolvedPlace = \Fleetbase\FleetOps\Models\Place::where('uuid', $coordinates)->first();
                if ($resolvedPlace instanceof \Fleetbase\FleetOps\Models\Place) {
                    return static::getCoordinateFromCoordinates($resolvedPlace);
                }
            }

            if (Str::startsWith($coordinates, 'POINT(')) {
                $coordinates = Str::replaceFirst('POINT(', '', $coordinates);
                $coordinates = Str::replace(')', '', $coordinates);
                $coords      = explode(' ', $coordinates);
                $coords      = array_reverse($coords);
                $coordinates = null;
            }

            if (preg_match('/LatLng\(([^,]+),\s*([^)]+)\)/', $coordinates, $matches)) {
                $coords = [
                    floatval($matches[1]),
                    floatval($matches[2]),
                ];

                $coordinates = null;
            }

            if (Str::contains($coordinates, ',')) {
                $coords = explode(',', $coordinates);
            }

            if (Str::contains($coordinates, '|')) {
                $coords = explode('|', $coordinates);
            }

            if (Str::contains($coordinates, ' ')) {
                $coords = explode(' ', $coordinates);
            }

            $latitude  = $coords[0];
            $longitude = $coords[1];
        }

        return $prop === 'latitude' ? (float) $latitude : (float) $longitude;
    }

    /**
     * Extracts the latitude coordinate value from a given input value representing a location or set of coordinates.
     *
     * @param mixed $coordinates the input value representing a location or set of coordinates
     *
     * @return float the extracted latitude coordinate value as a float
     */
    public static function getLatitudeFromCoordinates($coordinates): float
    {
        return static::getCoordinateFromCoordinates($coordinates);
    }

    /**
     * Extracts the longitude coordinate value from a given input value representing a location or set of coordinates.
     *
     * @param mixed $coordinates the input value representing a location or set of coordinates
     *
     * @return float the extracted longitude coordinate value as a float
     */
    public static function getLongitudeFromCoordinates($coordinates): float
    {
        return static::getCoordinateFromCoordinates($coordinates, 'longitude');
    }

    /**
     * Extracts a point value from a given input value representing a location or set of coordinates.
     *
     * @param mixed $coordinates the input value representing a location or set of coordinates
     *
     * @return Point the extracted point value
     */
    public static function getPointFromCoordinates($coordinates): Point
    {
        if ($coordinates instanceof Point) {
            return $coordinates;
        }

        if (is_null($coordinates) || !static::isCoordinates($coordinates)) {
            return new Point(0, 0);
        }

        $latitude  = static::getLatitudeFromCoordinates($coordinates);
        $longitude = static::getLongitudeFromCoordinates($coordinates);

        return new Point($latitude, $longitude);
    }

    /**
     * Converts a point to a WKT (Well-Known Text) representation for SQL insert.
     *
     * @param mixed $point the input value representing a point
     *
     * @return \Illuminate\Database\Query\Expression the WKT representation of the point as a raw SQL expression
     */
    public static function parsePointToWkt($point): \Illuminate\Database\Query\Expression
    {
        $wkt = 'POINT(0 0)';

        if ($point instanceof Point) {
            $wkt = $point->toWKT();
        }

        if (is_array($point)) {
            $json = json_encode($point);
            $p    = Point::fromJson($json);

            $wkt = $p->toWkt();
        }

        if (is_string($point)) {
            $p = Point::fromString($point);

            $wkt = $p->toWKT();
        }

        // Use the `ST_PointFromText` function to convert the WKT representation to a SQL expression.
        return DB::raw("(ST_PointFromText('$wkt', 0, 'axis-order=long-lat'))");
    }

    /**
     * Converts a raw point binary string to a float pair representing the point's coordinates.
     *
     * @param string $data the binary string representing the point
     *
     * @return array the float pair representing the point's coordinates
     */
    public static function rawPointToFloatPair(string $data): array
    {
        // Use the `unpack` function to extract the X and Y coordinates from the binary string.
        $res = unpack('lSRID/CByteOrder/lTypeInfo/dX/dY', $data);

        // Return the float pair representing the point's coordinates.
        return [$res['X'], $res['Y']];
    }

    /**
     * Converts a raw point binary string to a Laravel MySQL Spatial Point instance.
     *
     * @param string $data the binary string representing the point
     *
     * @return Point the Laravel MySQL Spatial Point instance
     */
    public static function rawPointToPoint(string $data): Point
    {
        // Use the `unpack` function to extract the X, Y, and SRID values from the binary string.
        $res = unpack('lSRID/CByteOrder/lTypeInfo/dX/dY', $data);

        // Return a new Laravel MySQL Spatial Point instance with the X, Y, and SRID values.
        return new Point($res['X'], $res['Y'], $res['SRID']);
    }

    /**
     * Calculates the driving distance and time between two points.
     *
     * This function attempts to find the driving distance and time from the origin to the destination
     * using various map APIs. It first attempts to resolve the origin and destination from various input types
     * into geographical coordinates. Then, based on the provider specified in the options or defaulting to configured provider,
     * it queries the respective service for the driving distance and time. The result is returned as a DistanceMatrix
     * object with the distance in meters and the time in seconds.
     *
     * @param mixed $origin      The origin of the journey. Can be a Place model, a string, or an array with latitude and longitude.
     * @param mixed $destination The destination of the journey. Similar to the origin, it accepts multiple input types.
     *
     * @return DistanceMatrix an object containing the distance and time of the journey
     *
     * @throws \Throwable throws any exception encountered during the resolution of points or API calls
     */
    public static function getDrivingDistanceAndTime($origin, $destination, $options = []): DistanceMatrix
    {
        $origin       = static::getPointFromMixed($origin);
        $destination  = static::getPointFromMixed($destination);
        $origins      = $origin->getLat() . ',' . $origin->getLng();
        $destinations = $destination->getLat() . ',' . $destination->getLng();

        // Create empty distance matric
        $distanceMatrix = new DistanceMatrix(0, 0);
        $provider       = data_get($options, 'provider', config('fleetops.distance_matrix.provider'));
        switch ($provider) {
            case 'calculate':
                $distanceMatrix = static::calculateDrivingDistanceAndTime($origins, $destinations);
                break;

            case 'osrm':
                $distanceMatrix = static::getDistanceMatrixFromOSRM($origins, $destinations);
                break;

            case 'google':
            default:
                $distanceMatrix = static::getDistanceMatrixFromGoogle($origins, $destinations);
                break;
        }

        return $distanceMatrix;
    }

    /**
     * Computes a distance matrix for multiple origins and destinations.
     *
     * This function is designed to handle arrays of origins and destinations to calculate a distance matrix.
     * It converts the input arrays into a string format suitable for the map API request. The provider specified
     * in the options (default is Google) determines which map service API is used for the calculations.
     *
     * @param array|\Illuminate\Support\Collection $origins      array or collection of origin points
     * @param array|\Illuminate\Support\Collection $destinations array or collection of destination points
     * @param array                                $options      options for API calls, like the provider and mode of transport
     *
     * @return DistanceMatrix an object representing the distance and time between the furthest origins and destinations
     */
    public static function distanceMatrix($origins = [], $destinations = [], $options = []): DistanceMatrix
    {
        if ($origins instanceof \Illuminate\Support\Collection) {
            $origins = $origins->all();
        }

        if ($destinations instanceof \Illuminate\Support\Collection) {
            $destinations = $destinations->all();
        }

        // Convert origins and destinatinos to string
        $origins      = static::createCoordinateStringFromPlacesArray($origins);
        $destinations = static::createCoordinateStringFromPlacesArray($destinations);

        // Create empty distance matric
        $distanceMatrix = new DistanceMatrix(0, 0);
        $provider       = data_get($options, 'provider', config('fleetops.distance_matrix.provider'));
        switch ($provider) {
            case 'calculate':
                $distanceMatrix = static::calculateDrivingDistanceAndTime($origins, $destinations);
                break;

            case 'osrm':
                $distanceMatrix = static::getDistanceMatrixFromOSRM($origins, $destinations);
                break;

            case 'google':
            default:
                $distanceMatrix = static::getDistanceMatrixFromGoogle($origins, $destinations);
                break;
        }

        return $distanceMatrix;
    }

    /**
     * Converts an array of places into a coordinate string.
     *
     * Accepts an array of places (or any type that can be converted into geographical points)
     * and converts each into a 'latitude,longitude' format. These coordinates are then concatenated into a single string,
     * separated by the specified separator. The function gracefully handles any errors in the conversion process.
     *
     * @param array  $places    array of places to be converted into coordinates
     * @param string $separator separator used to concatenate the coordinates into a single string
     *
     * @return string a concatenated string of coordinates
     */
    public static function createCoordinateStringFromPlacesArray(array $places = [], $separator = '|'): string
    {
        $coordinates = array_map(
            function ($place) {
                try {
                    $point       = static::getPointFromMixed($place);
                } catch (\Throwable $e) {
                    $point = new Point(0, 0);
                }

                return $point;
            },
            $places
        );

        return implode($separator, array_map(
            function ($point) {
                return $point->getLat() . ',' . $point->getLng();
            },
            $coordinates
        ));
    }

    /**
     * Retrieves a distance matrix using the Google Distance Matrix API.
     *
     * This function calculates the distance and time between origins and destinations using the Google API.
     * It first checks if there is a cached result in Redis and, if not, performs an API call to Google.
     * The results are then cached in Redis and returned as a DistanceMatrix object.
     *
     * @param string $origins      a string of origins in 'latitude,longitude' format, separated by a specified delimiter
     * @param string $destinations a string of destinations in a similar format to origins
     * @param array  $options      additional options for the API call, like the mode of transport
     *
     * @return DistanceMatrix the distance and time between the given origins and destinations
     */
    public static function getDistanceMatrixFromGoogle(string $origins, string $destinations, $options = []): DistanceMatrix
    {
        $cacheKey     = md5($origins . '_' . $destinations);
        $cachedResult = Redis::get($cacheKey);
        if ($cachedResult) {
            $json = json_decode($cachedResult);

            if (!empty($json->distance) && !empty($json->time)) {
                return new DistanceMatrix($json->distance, $json->time);
            }
        }

        $response = Http::withOptions(['verify' => false])->get(
            'https://maps.googleapis.com/maps/api/distancematrix/json',
            [
                'origins'      => $origins,
                'destinations' => $destinations,
                'mode'         => data_get($options, 'mode', 'driving'),
                'key'          => env('GOOGLE_MAPS_API_KEY'),
            ]
        )->json();

        $distance = (float) data_get($response, 'rows.0.elements.0.distance.value', 0);
        $time     = (float) data_get($response, 'rows.0.elements.0.duration.value', 0);

        // Create distance matrix
        $distanceMatrix = new DistanceMatrix($distance, $time);

        // Cache distance matrix
        Redis::set($cacheKey, json_encode($distanceMatrix));

        return $distanceMatrix;
    }

    /**
     * Calculates distance and time between points using the OSRM API.
     *
     * Similar to the Google Distance Matrix function, this uses the OSRM (Open Source Routing Machine) API.
     * It first checks for cached results before making a new API request. The origins and destinations are
     * reformatted to the OSRM API requirement and the response is parsed into a DistanceMatrix object.
     *
     * @param string $origins      comma-separated string of origin coordinates
     * @param string $destinations comma-separated string of destination coordinates
     *
     * @return DistanceMatrix an object containing the distance and time for the specified journey
     */
    public static function getDistanceMatrixFromOSRM(string $origins, string $destinations): DistanceMatrix
    {
        $cacheKey     = md5($origins . '_' . $destinations);
        $cachedResult = Redis::get($cacheKey);
        if ($cachedResult) {
            $json = json_decode($cachedResult);

            if (!empty($json->distance) && !empty($json->time)) {
                return new DistanceMatrix($json->distance, $json->time);
            }
        }

        // OSRM uses semi-colon to delimit coordinates so replace any `|` as we typically use with `;`
        $origins           = Str::replace('|', ';', $origins);
        $destinations      = Str::replace('|', ';', $destinations);
        $coordinatesString = $origins . ';' . $destinations;
        // Split the string into individual coordinates
        $coordinatesArray = explode(';', $coordinatesString);

        // Reverse the latitude and longitude in each coordinate
        $reversedCoordinates = array_map(function ($coordinate) {
            $parts = explode(',', $coordinate);
            if (count($parts) == 2) {
                return $parts[1] . ',' . $parts[0]; // Swap latitude and longitude
            }

            return $coordinate; // Return original if it's not a valid coordinate
        }, $coordinatesArray);

        // Join the reversed coordinates back into a string
        $reversedCoordinatesString = implode(';', $reversedCoordinates);
        $response                  = OSRM::getRouteFromCoordinatesString($reversedCoordinatesString);
        $distance                  = (float) data_get($response, 'routes.0.distance', 0);
        $time                      = (float) data_get($response, 'routes.0.duration', 0);

        // Create distance matrix
        $distanceMatrix = new DistanceMatrix($distance, $time);

        // Cache distance matrix
        Redis::set($cacheKey, json_encode($distanceMatrix));

        return $distanceMatrix;
    }

    /**
     * Calculates driving distance and time between two points using Vincenty's formula.
     * Returns distance in meters and time in seconds.
     *
     * @param \Fleetbase\FleetOps\Models\Place|Point|array $origin
     * @param \Fleetbase\FleetOps\Models\Place|Point|array $destination
     */
    public static function calculateDrivingDistanceAndTime($origin, $destination): DistanceMatrix
    {
        $origin      = static::getPointFromMixed($origin);
        $destination = static::getPointFromMixed($destination);

        $distance = Utils::vincentyGreatCircleDistance($origin, $destination);
        $time     = (float) round($distance / 100) * self::DRIVING_TIME_MULTIPLIER;

        return new DistanceMatrix($distance, $time);
    }

    /**
     * Alias for `calculateDrivingDistanceAndTime`
     * Calculates driving distance and time between two points using Vincenty's formula.
     * Returns distance in meters and time in seconds.
     *
     * @param \Fleetbase\FleetOps\Models\Place|Point|array $origin
     * @param \Fleetbase\FleetOps\Models\Place|Point|array $destination
     */
    public static function getPreliminaryDistanceMatrix($origin, $destination): DistanceMatrix
    {
        return static::calculateDrivingDistanceAndTime($origin, $destination);
    }

    /**
     * Format distance in meters to kilometers or meters.
     *
     * @param float $meters     Distance in meters
     * @param bool  $abbreviate Whether to use abbreviated unit or not
     */
    public static function formatMeters(float $meters, bool $abbreviate = true): string
    {
        if ($meters > 1000) {
            $distance = round($meters / 1000, 2);
            $unit     = $abbreviate ? 'km' : 'kilometers';
        } else {
            $distance = round($meters);
            $unit     = $abbreviate ? 'm' : 'meters';
        }

        return $distance . ' ' . $unit;
    }

    /**
     * Calculates the great-circle distance between two points, with
     * the Vincenty formula. (Using over haversine tdue to antipodal point issues).
     *
     * https://en.wikipedia.org/wiki/Great-circle_distance#Formulas
     * https://en.wikipedia.org/wiki/Antipodal_point
     *
     * @param Point Starting point
     * @param Point Ending point
     * @param float $earthRadius Mean earth radius in [m]
     *
     * @return float Distance between points in [m] (same as earthRadius)
     */
    public static function vincentyGreatCircleDistance(Point $from, Point $to, float $earthRadius = 6371000): float
    {
        // convert from degrees to radians
        $latFrom = deg2rad($from->getLat());
        $lonFrom = deg2rad($from->getLng());
        $latTo   = deg2rad($to->getLat());
        $lonTo   = deg2rad($to->getLng());

        $lonDelta = $lonTo - $lonFrom;
        $a        = pow(cos($latTo) * sin($lonDelta), 2) +
            pow(cos($latFrom) * sin($latTo) - sin($latFrom) * cos($latTo) * cos($lonDelta), 2);
        $b = sin($latFrom) * sin($latTo) + cos($latFrom) * cos($latTo) * cos($lonDelta);

        $angle = atan2(sqrt($a), $b);

        return $angle * $earthRadius;
    }

    /**
     * Finds the nearest timezone for a given coordinate point.
     */
    public static function getNearestTimezone(Point $location, string $countryCode = ''): string
    {
        $timezoneIds = \DateTimeZone::listIdentifiers(\DateTimeZone::PER_COUNTRY, $countryCode);
        $lat         = $location->getLat();
        $long        = $location->getLng();
        $minDistance = INF;
        $timezone    = 'unknown';

        foreach ($timezoneIds as $timezoneId) {
            $tz       = new \DateTimeZone($timezoneId);
            $location = $tz->getLocation();
            $tzLat    = $location['latitude'];
            $tzLong   = $location['longitude'];

            $theta    = $long - $tzLong;
            $distance = sin(deg2rad($lat)) * sin(deg2rad($tzLat)) + cos(deg2rad($lat)) * cos(deg2rad($tzLat)) * cos(deg2rad($theta));
            $distance = acos($distance);
            $distance = abs(rad2deg($distance));

            if ($distance < $minDistance) {
                $minDistance = $distance;
                $timezone    = $timezoneId;
            }
        }

        return $timezone;
    }

    /**
     * Determines whether a given vendor ID is an integrated vendor ID or not.
     *
     * @param string $id the vendor ID to check
     *
     * @return bool returns true if the given ID is an integrated vendor ID or is present in the "integrated_vendors" database table for the current company session, false otherwise
     */
    public static function isIntegratedVendorId(string $id): bool
    {
        if (Str::startsWith($id, 'integrated_vendor_')) {
            return true;
        }

        $providerIds = DB::table('integrated_vendors')
            ->select('provider')
            ->where('company_uuid', session('company'))
            ->distinct()
            ->get()
            ->map(function ($result) {
                return $result->provider;
            })
            ->toArray();

        return in_array($id, $providerIds);
    }

    /**
     * Gets data from a JSON file containing globe data and decodes it into a PHP object.
     *
     * @return object the decoded JSON object containing globe data
     */
    public static function getGlobeData()
    {
        ini_set('memory_limit', '-1');

        $data    = file_get_contents(resource_path('data/globe.json'));
        $geoJson = json_decode($data);

        return $geoJson;
    }

    /**
     * Creates a MultiPolygon object from the provided country's ISO code.
     *
     * @param string $country the ISO_A3 or ISO_A2 code of the country
     *
     * @return \Fleetbase\LaravelMysqlSpatial\Types\MultiPolygon|null the MultiPolygon object or null if not found
     */
    public static function createPolygonFromCountry(string $country): ?\Fleetbase\LaravelMysqlSpatial\Types\MultiPolygon
    {
        $globe   = static::getGlobeData();
        $country = strtolower($country);

        $feature = collect($globe->features)->first(
            function ($feature) use ($country) {
                if (!isset($feature->properties->ISO_A3) || !isset($feature->properties->ISO_A2)) {
                    return false;
                }

                return strtolower($feature->properties->ISO_A3) === $country || strtolower($feature->properties->ISO_A2) === $country;
            }
        );

        if ($feature) {
            return \Fleetbase\LaravelMysqlSpatial\Types\MultiPolygon::fromJson(json_encode($feature->geometry));
        }

        return null;
    }

    public static function isPoint($point): bool
    {
        return $point instanceof Point;
    }

    /**
     * Converts latitude, longitude, and radius to an array of circle coordinates.
     *
     * @param float $latitude  the latitude in degrees
     * @param float $longitude the longitude in degrees
     * @param float $meters    the radius in meters
     *
     * @return array an array of circle coordinates
     */
    public static function coordsToCircle($latitude, $longitude, $meters)
    {
        $latitude  = deg2rad($latitude);
        $longitude = deg2rad($longitude);
        // convert meters to km
        $radius = ($meters * 1000) / 6378137;
        // create circle coordinates
        $coords = collect();
        // loop through the array and write path linestrings
        for ($i = 0; $i <= 360; $i += 3) {
            $radial   = deg2rad($i);
            $lat_rad  = asin(sin($latitude) * cos($radius) + cos($latitude) * sin($radius) * cos($radial));
            $dlon_rad = atan2(sin($radial) * sin($radius) * cos($latitude), cos($radius) - sin($latitude) * sin($lat_rad));
            $lon_rad  = fmod($longitude + $dlon_rad + M_PI, 2 * M_PI) - M_PI;
            $coords->push([rad2deg($lat_rad), rad2deg($lon_rad)]);
        }

        // first and last positions should be equivalent
        if ($coords->first() !== $coords->last()) {
            $coords->push($coords->first());
        }

        return $coords->toArray();
    }

    /**
     * Calculates the centroid (geometric center) of the provided coordinates.
     *
     * @param array $coordinates an array of coordinates
     *
     * @return array the centroid of the coordinates as an array [latitude, longitude]
     */
    public static function getCentroid(array $coordinates = []): array
    {
        // Check if the coordinates array is empty
        if (count($coordinates) === 0) {
            return [0, 0];
        }

        $sumX             = 0;
        $sumY             = 0;
        $validCoordsCount = 0;

        foreach ($coordinates as $coord) {
            // Ensure the coordinate has at least two elements and they are numeric
            if (is_array($coord) && count($coord) >= 2 && is_numeric($coord[0]) && is_numeric($coord[1])) {
                $sumX += $coord[0];
                $sumY += $coord[1];
                $validCoordsCount++;
            }
        }

        // If no valid coordinates were found, return a default value
        if ($validCoordsCount === 0) {
            return [0, 0];
        }

        // Calculate the average for X and Y
        return [$sumX / $validCoordsCount, $sumY / $validCoordsCount];
    }

    /**
     * Calculates the centroid of a given GEOS polygon.
     *
     * @param \Brick\Geo\Polygon $polygon the GEOS Polygon from which to calculate the centroid
     *
     * @return \Brick\Geo\Point returns the centroid of the polygon as a GEOS Point object
     */
    public static function getCentroidFromGeosPolygon(\Brick\Geo\Polygon $polygon): \Brick\Geo\Point
    {
        $geometryEngine = new \Brick\Geo\Engine\GEOSEngine();

        return $geometryEngine->centroid($polygon);
    }

    /**
     * Calculates the centroid of a given GEOS multi-polygon.
     *
     * @param \Brick\Geo\MultiPolygon $multiPolygon the GEOS MultiPolygon from which to calculate the centroid
     *
     * @return \Brick\Geo\Point returns the centroid of the multi-polygon as a GEOS Point object
     */
    public static function getCentroidFromGeosMultiPolygon(\Brick\Geo\MultiPolygon $multiPolygon): \Brick\Geo\Point
    {
        $geometryEngine = new \Brick\Geo\Engine\GEOSEngine();

        return $geometryEngine->centroid($multiPolygon);
    }

    /**
     * Calculates the centroid of a polygon using the Grimzy Laravel MySQL spatial type.
     *
     * @param \Fleetbase\LaravelMysqlSpatial\Types\Polygon $polygon the Polygon object from which to calculate the centroid
     *
     * @return array returns the centroid of the polygon as an array of coordinates
     */
    public static function getPolygonCentroid(\Fleetbase\LaravelMysqlSpatial\Types\Polygon $polygon)
    {
        $polygonArray = $polygon->jsonSerialize()->getCoordinates();
        $coordinates  = array_merge(...$polygonArray);

        return static::getCentroid($coordinates);
    }

    /**
     * Calculates the centroid of a multi-polygon using the Grimzy Laravel MySQL spatial type.
     *
     * @param \Fleetbase\LaravelMysqlSpatial\Types\MultiPolygon $multiPolygon the MultiPolygon object from which to calculate the centroid
     *
     * @return array returns the centroid of the multi-polygon as an array of coordinates
     */
    public static function getMultiPolygonCentroid(\Fleetbase\LaravelMysqlSpatial\Types\MultiPolygon $multiPolygon)
    {
        $multiPolygonArray = $multiPolygon->jsonSerialize()->getCoordinates();
        $coordinates       = [];

        foreach ($multiPolygonArray as $polygonArray) {
            foreach ($polygonArray as $lineStringArray) {
                $coordinates = array_merge($coordinates, $lineStringArray);
            }
        }

        return static::getCentroid($coordinates);
    }

    /**
     * Extracts and returns the first set of coordinates from a given polygon.
     *
     * @param \Fleetbase\LaravelMysqlSpatial\Types\Polygon|null $polygon the Polygon object from which to extract coordinates
     *
     * @return array Returns an array of the first set of coordinates in the polygon. Returns an empty array if the polygon is null.
     */
    public static function getCoordinatesFromPolygon(?\Fleetbase\LaravelMysqlSpatial\Types\Polygon $polygon): array
    {
        return Arr::first($polygon->jsonSerialize()->getCoordinates());
    }

    /**
     * Alias function to `getModelClassName` but uses FleetOps namespace.
     *
     * @param string|object $table             the table name or an object instance to derive the class name from
     * @param string|array  $namespaceSegments a string representing the namespace or an array of segments to be appended to the model class name
     *
     * @return string the fully qualified class name, including the namespace
     *
     * @throws InvalidArgumentException if the provided $namespaceSegments is not a string or an array
     */
    public static function getModelClassName($table, $namespaceSegments = '\\Fleetbase\\FleetOps\\'): string
    {
        return parent::getModelClassName($table, $namespaceSegments);
    }

    /**
     * Determines if the given variable is a valid GeoJSON.
     *
     * This function accepts a GeoJSON string, array, or object and checks for the required
     * GeoJSON properties: 'type' and either 'coordinates' or 'geometries', depending on the type.
     *
     * @param string|array|object $geoJson the GeoJSON input, which can be a JSON string, an array, or an object
     *
     * @return bool returns true if the input is valid GeoJSON, false otherwise
     *
     * @example
     * $geoJsonString = '{"type":"Point","coordinates":[106.9338169,47.9131423]}';
     * isGeoJson($geoJsonString); // true
     */
    public static function isGeoJson($geoJson)
    {
        // If the input is a JSON string, decode it
        if (is_string($geoJson) && static::isJson($geoJson)) {
            $geoJson = json_decode($geoJson, true);
        }

        // Check if the input is an array or an object
        if (is_array($geoJson) || is_object($geoJson)) {
            // Convert to array if it's an object
            if (is_object($geoJson)) {
                $geoJson = (array) $geoJson;
            }

            // Check for required GeoJSON properties: 'type' and 'coordinates' or 'geometries'
            if (isset($geoJson['type'])) {
                if ($geoJson['type'] === 'GeometryCollection' && isset($geoJson['geometries'])) {
                    return true;
                } elseif (in_array($geoJson['type'], ['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon']) && isset($geoJson['coordinates'])) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Creates a SpatialExpression object from a valid GeoJSON input.
     *
     * @param mixed $geoJson the GeoJSON input, which can be an array, object, or JSON string representing a valid GeoJSON object
     *
     * @return \Fleetbase\LaravelMysqlSpatial\Eloquent\SpatialExpression|null returns a SpatialExpression object if the input is a valid GeoJSON, or null if the input is not valid
     *
     * @throws \InvalidArgumentException if the input is not a valid GeoJSON object
     */
    public static function createSpatialExpressionFromGeoJson($geoJson): ?\Fleetbase\LaravelMysqlSpatial\Eloquent\SpatialExpression
    {
        if (!static::isGeoJson($geoJson)) {
            return null;
        }

        if (is_string($geoJson) && static::isJson($geoJson)) {
            $geoJson = json_decode($geoJson, true);
        }

        // Convert the value to JSON and create a Geometry object
        $json = json_encode($geoJson);
        $geo  = \Fleetbase\LaravelMysqlSpatial\Types\Geometry::fromJson($json);

        // Return a new SpatialExpression object
        return new \Fleetbase\LaravelMysqlSpatial\Eloquent\SpatialExpression($geo);
    }

    /**
     * Creates a SpatialExpression object from a valid GeoJSON input.
     *
     * @param mixed $geoJson the GeoJSON input, which can be an array, object, or JSON string representing a valid GeoJSON object
     *
     * @return \Fleetbase\LaravelMysqlSpatial\Eloquent\SpatialExpression|null returns a SpatialExpression object if the input is a valid GeoJSON, or null if the input is not valid
     *
     * @throws \InvalidArgumentException if the input is not a valid GeoJSON object
     */
    public static function createGeometryObjectFromGeoJson($geoJson): ?\Fleetbase\LaravelMysqlSpatial\Types\Geometry
    {
        if (!static::isGeoJson($geoJson)) {
            return null;
        }

        if (is_string($geoJson) && static::isJson($geoJson)) {
            $geoJson = json_decode($geoJson, true);
        }

        // Convert the value to JSON and create a Geometry object
        $json = json_encode($geoJson);

        return \Fleetbase\LaravelMysqlSpatial\Types\Geometry::fromJson($json);
    }

    /**
     * Calculate the heading between two geographical points.
     *
     * @param Point $point1 the starting point with latitude and longitude
     * @param Point $point2 the ending point with latitude and longitude
     *
     * @return float the heading in degrees from the starting point to the ending point
     */
    public static function calculateHeading(Point $point1, Point $point2): float
    {
        // Extract latitude and longitude from Point objects
        $lat1 = $point1->getLat();
        $lon1 = $point1->getLng();
        $lat2 = $point2->getLat();
        $lon2 = $point2->getLng();

        // Convert latitude and longitude from degrees to radians
        $lat1      = deg2rad($lat1);
        $lat2      = deg2rad($lat2);
        $delta_lon = deg2rad($lon2 - $lon1);

        // Calculate X and Y differences
        $x = cos($lat2) * sin($delta_lon);
        $y = cos($lat1) * sin($lat2) - sin($lat1) * cos($lat2) * cos($delta_lon);

        // Calculate the angle
        $theta_rad = atan2($x, $y);

        // Convert the angle from radians to degrees
        $theta_deg = rad2deg($theta_rad);

        // Normalize the degree to be between 0 and 360
        $theta_deg = fmod($theta_deg + 360, 360);

        return $theta_deg;
    }

    /**
     * Determines if a given object is an instance of Activity.
     *
     * This static method is used to check if a provided object is an
     * instance of the Activity class. This can be useful in contexts where
     * there is a need to verify the type of a given resource or object.
     *
     * @param mixed $activity the object to check
     *
     * @return bool returns true if the provided object is an instance of Activity, false otherwise
     */
    public static function isActivity($activity): bool
    {
        return $activity && $activity instanceof Activity && !empty($activity->code);
    }

    public static function fixPhone(string $phone): string
    {
        if (!Str::startsWith($phone, '+')) {
            $phone = '+' . $phone;
        }

        return $phone;
    }
}
