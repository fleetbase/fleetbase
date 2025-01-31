<?php

namespace Fleetbase\FleetOps\Http\Controllers\Internal\v1;

use Fleetbase\FleetOps\Models\Place;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Http\Controllers\Controller;
use Geocoder\Laravel\Facades\Geocoder;
use Illuminate\Http\Request;

class GeocoderController extends Controller
{
    /**
     * Reverse geocodes the given coordinates and returns the results as JSON.
     *
     * @param Request $request the HTTP request object
     *
     * @return \Illuminate\Http\Response the JSON response with the geocoded results
     */
    public function reverse(Request $request)
    {
        $query  = $request->or(['coordinates', 'query']);
        $single = $request->boolean('single');

        /** @var \Fleetbase\LaravelMysqlSpatial\Types\Point $coordinates */
        $coordinates = Utils::getPointFromCoordinates($query);

        // if not a valid point error
        if (!$coordinates instanceof \Fleetbase\LaravelMysqlSpatial\Types\Point) {
            return response()->error('Invalid coordinates provided.');
        }

        // get results
        $results = Geocoder::reverse($coordinates->getLat(), $coordinates->getLng())->get();

        if ($results->count()) {
            if ($single) {
                $googleAddress = $results->first();

                return response()->json(Place::createFromGoogleAddress($googleAddress));
            }

            return response()->json(
                $results->map(
                    function ($googleAddress) {
                        return Place::createFromGoogleAddress($googleAddress);
                    }
                )
                    ->values()
                    ->toArray()
            );
        }

        return response()->json([]);
    }

    /**
     * Geocodes the given query and returns the results as JSON.
     *
     * @param Request $request the HTTP request object
     *
     * @return \Illuminate\Http\Response the JSON response with the geocoded results
     */
    public function geocode(Request $request)
    {
        $query  = $request->input('query');
        $single = $request->boolean('single');

        if (is_array($query)) {
            return $this->reverse($request);
        }

        // lookup
        $results = Geocoder::geocode($query)->get();

        if ($results->count()) {
            if ($single) {
                $googleAddress = $results->first();

                return response()->json(Place::createFromGoogleAddress($googleAddress));
            }

            return response()->json(
                $results->map(
                    function ($googleAddress) {
                        return Place::createFromGoogleAddress($googleAddress);
                    }
                )
                    ->values()
                    ->toArray()
            );
        }

        return response()->json([]);
    }
}
