<?php

namespace Fleetbase\FleetOps\Support;

use Fleetbase\FleetOps\Support\Encoding\Polyline;
use Fleetbase\LaravelMysqlSpatial\Types\Point;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Class OSRM
 * A support class to interact with the Open Source Routing Machine (OSRM) API.
 */
class OSRM
{
    /**
     * The ORSM server API URL.
     *
     * @var string
     */
    protected static $baseUrl = 'https://router.project-osrm.org';

    /**
     * Get the route between two points.
     *
     * @param Point $start           starting point
     * @param Point $end             ending point
     * @param array $queryParameters additional query parameters
     *
     * @return array response from the OSRM API
     */
    public static function getRoute(Point $start, Point $end, array $queryParameters = [])
    {
        // Generate a unique cache key based on the method parameters
        $cacheKey = 'getRoute:' . md5($start . $end . serialize($queryParameters));

        // Return the cached result if it exists
        if (Cache::has($cacheKey)) {
            return Cache::get($cacheKey);
        }

        $coordinates = "{$start->getLng()},{$start->getLat()};{$end->getLng()},{$end->getLat()}";

        return static::getRouteFromCoordinatesString($coordinates, $queryParameters);
    }

    public static function getRouteFromPoints(array $points, array $queryParameters = [])
    {
        // Check if there are at least two points (start and end)
        if (count($points) < 2) {
            throw new \InvalidArgumentException('At least two points (start and end) are required.');
        }

        // Generate a unique cache key based on the points and query parameters
        $cacheKey = 'getRouteFromPoints:' . md5(serialize($points) . serialize($queryParameters));

        // Return the cached result if it exists
        if (Cache::has($cacheKey)) {
            return Cache::get($cacheKey);
        }

        // Convert the array of Point objects into an OSRM-compatible string
        $coordinates = array_map(function (Point $point) {
            return "{$point->getLng()},{$point->getLat()}";
        }, $points);

        // Join the coordinates with a semicolon
        $coordinatesString = implode(';', $coordinates);

        // Call the getRouteFromCoordinatesString method with the constructed coordinates string
        $routeData = static::getRouteFromCoordinatesString($coordinatesString, $queryParameters);

        // Store the result in cache for 60 minutes
        Cache::put($cacheKey, $routeData, 60 * 60);

        return $routeData;
    }

    public static function getRouteFromCoordinatesString(string $coordinates, array $queryParameters = [])
    {
        $cacheKey    = 'getRouteFromCoordinatesString:' . md5($coordinates . serialize($queryParameters));
        $url         = self::$baseUrl . "/route/v1/driving/{$coordinates}";
        $response    = Http::get($url, $queryParameters);
        $data        = $response->json();

        // Check for the presence of the encoded polyline in each route and decode it if found
        if (isset($data['routes']) && is_array($data['routes'])) {
            foreach ($data['routes'] as &$route) {
                if (isset($route['geometry'])) {
                    $route['waypoints'] = self::decodePolyline($route['geometry']);
                }
            }
        }

        // Store the result in the cache for 60 minutes
        Cache::put($cacheKey, $data, 60 * 60);

        return $data;
    }

    /**
     * Get the nearest point on a road to a given location.
     *
     * @param Point $location        location point
     * @param array $queryParameters additional query parameters
     *
     * @return array response from the OSRM API
     */
    public static function getNearest(Point $location, array $queryParameters = [])
    {
        $cacheKey = 'getNearest:' . md5($location . serialize($queryParameters));

        if (Cache::has($cacheKey)) {
            return Cache::get($cacheKey);
        }

        $coordinates = "{$location->getLng()},{$location->getLat()}";
        $url         = self::$baseUrl . "/nearest/v1/driving/{$coordinates}";
        $response    = Http::get($url, $queryParameters);
        $result      = $response->json();

        Cache::put($cacheKey, $result, 60 * 60);

        return $result;
    }

    /**
     * Get a table of travel times or distances between multiple points.
     *
     * @param array $points          array of Point objects
     * @param array $queryParameters additional query parameters
     *
     * @return array response from the OSRM API
     */
    public static function getTable(array $points, array $queryParameters = [])
    {
        $cacheKey = 'getTable:' . md5(serialize($points) . serialize($queryParameters));

        if (Cache::has($cacheKey)) {
            return Cache::get($cacheKey);
        }

        $coordinates = implode(';', array_map(function (Point $point) {
            return "{$point->getLng()},{$point->getLat()}";
        }, $points));

        $url      = self::$baseUrl . "/table/v1/driving/{$coordinates}";
        $response = Http::get($url, $queryParameters);
        $result   = $response->json();

        Cache::put($cacheKey, $result, 60 * 60);

        return $result;
    }

    /**
     * Get a trip between multiple points.
     *
     * @param array $points          array of Point objects
     * @param array $queryParameters additional query parameters
     *
     * @return array response from the OSRM API
     */
    public static function getTrip(array $points, array $queryParameters = [])
    {
        $cacheKey = 'getTrip:' . md5(serialize($points) . serialize($queryParameters));

        if (Cache::has($cacheKey)) {
            return Cache::get($cacheKey);
        }

        $coordinates = implode(';', array_map(function (Point $point) {
            return "{$point->getLng()},{$point->getLat()}";
        }, $points));

        $url      = self::$baseUrl . "/trip/v1/driving/{$coordinates}";
        $response = Http::get($url, $queryParameters);
        $data     = $response->json();

        Cache::put($cacheKey, $data, 60 * 60);

        return $data;
    }

    /**
     * Get a match between GPS points and roads.
     *
     * @param array $points          array of Point objects
     * @param array $queryParameters additional query parameters
     *
     * @return array response from the OSRM API
     */
    public static function getMatch(array $points, array $queryParameters = [])
    {
        $coordinates = implode(';', array_map(function (Point $point) {
            return "{$point->getLng()},{$point->getLat()}";
        }, $points));
        $url = self::$baseUrl . "/match/v1/driving/{$coordinates}";

        $response = Http::get($url, $queryParameters);

        return $response->json();
    }

    /**
     * Get a tile for a specific zoom level and coordinates.
     *
     * @param int   $z               zoom level
     * @param int   $x               x coordinate
     * @param int   $y               y coordinate
     * @param array $queryParameters additional query parameters
     *
     * @return string response from the OSRM API
     */
    public static function getTile(int $z, int $x, int $y, array $queryParameters = [])
    {
        $url = self::$baseUrl . "/tile/v1/car/{$z}/{$x}/{$y}.mvt";

        $response = Http::get($url, $queryParameters);

        return $response->body();
    }

    /**
     * Decodes an encoded polyline string into an array of coordinates.
     *
     * @param string $polyline the encoded polyline string
     *
     * @return array an array of Point's
     */
    public static function decodePolyline($polyline)
    {
        return Polyline::decode($polyline);
    }
}
